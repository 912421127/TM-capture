import { describe, expect, it } from 'vitest';
import { captureFeatures, findCaptureFeature } from '../../../src/features';
import { buildItemRankRequestUrl, fetchItemRankPages } from '../../../src/features/item-rank/request';
import type { PageRequestContext } from '../../../src/shared/page-request';
import { type ItemRankMode } from '../../../src/features/item-rank';

const context: PageRequestContext = {
  token: 'page-token',
  keyword: '打火机',
  follow: 'false',
  cateId: '',
  cateLevel: '',
};
const now = new Date('2026-07-11T08:00:00Z');

describe('商品排行请求构造', () => {
  it.each<[ItemRankMode, string, string]>([
    ['realtime', '/cc/item/live/view/top.json', 'today'],
    ['recent7', '/cc/item/view/top.json', 'recent7'],
    ['recent30', '/cc/item/view/top.json', 'recent30'],
  ])('构造 %s 模式的接口地址', (mode, pathname, dateType) => {
    const url = new URL(buildItemRankRequestUrl(mode, context, now));

    expect(url.pathname).toBe(pathname);
    expect(url.searchParams.get('dateType')).toBe(dateType);
    expect(url.searchParams.get('token')).toBe('page-token');
    expect(url.searchParams.get('keyword')).toBe('打火机');
  });

  it('使用已结束的中国时区日期构造 7 天和 30 天范围', () => {
    const recent7 = new URL(buildItemRankRequestUrl('recent7', context, now));
    const recent30 = new URL(buildItemRankRequestUrl('recent30', context, now));

    expect(recent7.searchParams.get('dateRange')).toBe('2026-07-04|2026-07-10');
    expect(recent30.searchParams.get('dateRange')).toBe('2026-06-11|2026-07-10');
  });

  it('保留商品排行页面的默认排序和完整指标参数', () => {
    const historical = new URL(buildItemRankRequestUrl('recent7', context, now));
    const realtime = new URL(buildItemRankRequestUrl('realtime', context, now));

    expect(historical.searchParams.get('pageSize')).toBe('100');
    expect(historical.searchParams.get('page')).toBe('1');
    expect(historical.searchParams.get('order')).toBe('desc');
    expect(historical.searchParams.get('orderBy')).toBe('payAmt');
    expect(historical.searchParams.get('compareType')).toBe('cycle');
    expect(historical.searchParams.get('indexCode')).toBe([
      'payAmt', 'sucRefundAmt', 'payItmCnt', 'payByrCnt', 'payRate',
      'itemCartCnt', 'itemCltByrCnt', 'visitCltRate', 'itmUv', 'itmPv',
      'itmStayTime', 'itmBounceRate', 'seGuideUv', 'seGuidePayByrCnt',
      'seGuidePayRate', 'uvAvgValue', 'p4pExpendAmt', 'p4pRoi',
    ].join(','));
    expect(realtime.searchParams.get('orderBy')).toBe('itmUv');
    expect(realtime.searchParams.get('dateRange')).toBe('2026-07-11|2026-07-11');
  });

  it('支持指定服务端页码和较大的请求页大小', () => {
    const url = new URL(buildItemRankRequestUrl('recent7', context, now, 2, 100));

    expect(url.searchParams.get('page')).toBe('2');
    expect(url.searchParams.get('pageSize')).toBe('100');
  });

  it('根据 recordCount 自动请求所有服务端分页', async () => {
    const requestedPages: number[] = [];
    const fetchPage = async (urlText: string): Promise<string> => {
      const url = new URL(urlText);
      const page = Number(url.searchParams.get('page'));
      requestedPages.push(page);
      const start = (page - 1) * 10;
      const rows = Array.from({ length: page < 3 ? 10 : 5 }, (_, index) => ({ item: { itemId: String(start + index + 1) } }));
      return JSON.stringify({ data: { recordCount: 25, data: rows } });
    };

    const bodies = await fetchItemRankPages('recent7', context, now, fetchPage);

    expect(requestedPages).toEqual([1, 2, 3]);
    expect(bodies).toHaveLength(3);
  });

  it('把两个商品排行地址注册为可捕获接口', () => {
    expect(captureFeatures.some((feature) => feature.id === 'item-rank')).toBe(true);
    expect(findCaptureFeature('https://sycm.taobao.com/cc/item/view/top.json')?.id).toBe('item-rank');
    expect(findCaptureFeature('https://sycm.taobao.com/cc/item/live/view/top.json')?.id).toBe('item-rank');
  });
});
