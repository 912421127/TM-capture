import { findPageQueryValue, type PageRequestContext } from '../../shared/page-request';
import type { ItemRankMode } from './index';

const ITEM_RANK_INDEX_CODES = [
  'payAmt', 'sucRefundAmt', 'payItmCnt', 'payByrCnt', 'payRate',
  'itemCartCnt', 'itemCltByrCnt', 'visitCltRate', 'itmUv', 'itmPv',
  'itmStayTime', 'itmBounceRate', 'seGuideUv', 'seGuidePayByrCnt',
  'seGuidePayRate', 'uvAvgValue', 'p4pExpendAmt', 'p4pRoi',
].join(',');

function formatChinaDate(date: Date): string {
  return new Date(date.getTime() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function addDays(dateText: string, days: number): string {
  const date = new Date(`${dateText}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function buildItemRankRequestUrl(mode: ItemRankMode, context: PageRequestContext, now = new Date()): string {
  const today = formatChinaDate(now);
  const isRealtime = mode === 'realtime';
  const endDate = isRealtime ? today : addDays(today, -1);
  const startDate = isRealtime ? today : addDays(endDate, mode === 'recent7' ? -6 : -29);
  const url = new URL(isRealtime ? '/cc/item/live/view/top.json' : '/cc/item/view/top.json', location.origin);

  url.searchParams.set('dateRange', `${startDate}|${endDate}`);
  url.searchParams.set('dateType', isRealtime ? 'today' : mode);
  url.searchParams.set('pageSize', '10');
  url.searchParams.set('page', '1');
  url.searchParams.set('order', 'desc');
  url.searchParams.set('orderBy', isRealtime ? 'itmUv' : 'payAmt');
  url.searchParams.set('compareType', 'cycle');
  url.searchParams.set('indexCode', ITEM_RANK_INDEX_CODES);
  url.searchParams.set('token', context.token);
  url.searchParams.set('_', String(now.getTime()));
  for (const [key, value] of Object.entries(context)) {
    if (key !== 'token' && value !== undefined) url.searchParams.set(key, value);
  }
  return url.href;
}

export async function requestItemRank(mode: ItemRankMode): Promise<void> {
  const token = findPageQueryValue('token');
  if (!token) return;

  const context: PageRequestContext = {
    token,
    keyword: findPageQueryValue('keyword') ?? '',
    follow: findPageQueryValue('follow') ?? 'false',
    cateId: findPageQueryValue('cateId') ?? '',
    cateLevel: findPageQueryValue('cateLevel') ?? '',
  };

  try {
    await fetch(buildItemRankRequestUrl(mode, context), { credentials: 'include' });
  } catch {
    // 接口失败时不打断商品排行页面，侧边栏会保留已有记录或显示空状态。
  }
}
