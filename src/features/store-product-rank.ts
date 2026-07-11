// 本店商品排行适配器：按指标读取店铺商品分页，并映射为统一商品行。
import { featureDefinitions } from './definitions';
import type { CaptureFeature, FeatureCollectResult, StoreProductRankRow } from '../shared/capture';
import { getRangeDateType } from '../shared/date-range';
import { collectPages } from '../shared/pagination';
import { readMetric, readObject, unwrapSycmResponse } from '../shared/sycm-response';

const PAGE_SIZE = 10;
const columns = featureDefinitions.find((feature) => feature.id === 'store-product-rank')!.columns;
const orderByMap = { payAmount: 'payAmt', visitorCount: 'itmUv', buyerCount: 'payByrCnt' } as const;

function toAbsoluteUrl(value: unknown): string {
  // 接口可能返回协议相对地址或 HTML 实体，统一成可直接打开的商品链接。
  if (typeof value !== 'string') return '';
  return value.startsWith('//') ? `https:${value.replaceAll('&amp;', '&')}` : value.replaceAll('&amp;', '&');
}

export const storeProductRankFeature: CaptureFeature<'store-product-rank'> = {
  id: 'store-product-rank',
  label: '本店商品排行',
  columns,
  async collect(filters, transport, onProgress): Promise<FeatureCollectResult<'store-product-rank'>> {
    // 分页器负责循环和进度，本适配器只负责构造查询参数与转换单页响应。
    const rows = await collectPages<StoreProductRankRow>({
      onProgress,
      loadPage: async (page) => {
        const query = new URLSearchParams({
          dateRange: `${filters.startDate}|${filters.endDate}`,
          dateType: getRangeDateType(filters.startDate, filters.endDate, 'today'),
          pageSize: String(PAGE_SIZE),
          page: String(page),
          order: 'desc',
          orderBy: orderByMap[filters.metric],
          keyword: '',
          follow: 'false',
          cateId: '',
          cateLevel: '',
          indexCode: 'payAmt,payByrCnt,payRate,itmUv,itemCartCnt',
        });
        const response = readObject(unwrapSycmResponse(await transport.request({ url: `https://sycm.taobao.com/cc/item/live/view/top.json?${query}` })));
        const data = readObject(response.data);
        const items = Array.isArray(data.data) ? data.data : [];
        const recordCount = Number(data.recordCount ?? 0);
        // 接口指标通常包在 value 字段中，统一转换后再交给表格和导出层。
        return {
          rows: items.map((source, index): StoreProductRankRow => {
            const item = readObject(readObject(source).item);
            return {
              rank: (page - 1) * PAGE_SIZE + index + 1,
              itemId: String(readMetric(source, 'itemId') ?? item.itemId ?? ''),
              title: String(item.title ?? ''),
              itemUrl: toAbsoluteUrl(item.detailUrl),
              visitorCount: Number(readMetric(source, 'itmUv') ?? 0),
              buyerCount: Number(readMetric(source, 'payByrCnt') ?? 0),
              payAmount: Number(readMetric(source, 'payAmt') ?? 0),
              conversionRate: Number(readMetric(source, 'payRate') ?? 0),
            };
          }),
          hasNext: page * PAGE_SIZE < recordCount,
          totalPages: Math.ceil(recordCount / PAGE_SIZE),
        };
      },
    });
    return { summary: { 商品数量: rows.length }, rows };
  },
};
