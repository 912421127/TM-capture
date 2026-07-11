import type { ItemRankMode } from './index';

export type ItemRankMetricFormat = 'currency' | 'number' | 'percent' | 'decimal' | 'text';

export const ITEM_RANK_METRICS = [
  { key: 'payAmt', label: '支付金额', format: 'currency' },
  { key: 'sucRefundAmt', label: '成功退款金额', format: 'currency' },
  { key: 'payItmCnt', label: '支付件数', format: 'number' },
  { key: 'payByrCnt', label: '支付买家数', format: 'number' },
  { key: 'payRate', label: '支付转化率', format: 'percent' },
  { key: 'itemStatus', label: '商品状态', format: 'text' },
  { key: 'itemCartCnt', label: '商品加购件数', format: 'number' },
  { key: 'itemCltByrCnt', label: '商品收藏人数', format: 'number' },
  { key: 'visitCltRate', label: '访问收藏转化率', format: 'percent' },
  { key: 'itmUv', label: '商品访客数', format: 'number' },
  { key: 'itmPv', label: '商品浏览量', format: 'number' },
  { key: 'itmStayTime', label: '平均停留时长', format: 'decimal' },
  { key: 'itmBounceRate', label: '商品详情页跳出率', format: 'percent' },
  { key: 'seGuideUv', label: '搜索引导访客数', format: 'number' },
  { key: 'seGuidePayByrCnt', label: '搜索引导支付买家数', format: 'number' },
  { key: 'seGuidePayRate', label: '搜索引导支付转化率', format: 'percent' },
  { key: 'uvAvgValue', label: '访客平均价值', format: 'decimal' },
  { key: 'p4pExpendAmt', label: '推广消耗', format: 'currency' },
  { key: 'p4pRoi', label: '推广直投ROI', format: 'decimal' },
] as const satisfies ReadonlyArray<{ key: string; label: string; format: ItemRankMetricFormat }>;

export type ItemRankMetricKey = typeof ITEM_RANK_METRICS[number]['key'];

export interface ItemRankMetric {
  key: ItemRankMetricKey;
  label: string;
  format: ItemRankMetricFormat;
}

export interface ItemRankCell {
  value: number | string | null;
  change: number | null;
}

export interface ItemRankRow {
  itemId: string;
  title: string;
  imageUrl: string;
  status: string;
  cells: Record<ItemRankMetricKey, ItemRankCell>;
}

export interface ItemRankTable {
  metrics: readonly ItemRankMetric[];
  rows: ItemRankRow[];
  recordCount: number;
}

export interface ItemRankPageInfo {
  recordCount: number;
  rowCount: number;
}

function emptyTable(): ItemRankTable {
  return { metrics: ITEM_RANK_METRICS, rows: [], recordCount: 0 };
}

function normalizeImageUrl(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.startsWith('//') ? `https:${value}` : value;
}

function readChange(source: Record<string, unknown> | undefined): number | null {
  if (!source) return null;
  const value = typeof source.syncCrc === 'number' ? source.syncCrc : source.cycleCrc;
  return typeof value === 'number' && value !== 0 ? value : null;
}

function readNumericCell(source: unknown): ItemRankCell {
  if (!source || typeof source !== 'object') return { value: null, change: null };
  const record = source as Record<string, unknown>;
  return {
    value: typeof record.value === 'number' ? record.value : null,
    change: readChange(record),
  };
}

function readRow(row: Record<string, unknown>): ItemRankRow {
  const item = row.item && typeof row.item === 'object' ? row.item as Record<string, unknown> : {};
  const itemIdValue = item.itemId ?? (row.itemId && typeof row.itemId === 'object' ? (row.itemId as Record<string, unknown>).value : row.itemId);
  const status = typeof row.itemStatus === 'string' ? row.itemStatus : '';
  const cells = {} as Record<ItemRankMetricKey, ItemRankCell>;

  for (const metric of ITEM_RANK_METRICS) {
    cells[metric.key] = metric.key === 'itemStatus'
      ? { value: status || null, change: null }
      : readNumericCell(row[metric.key]);
  }

  return {
    itemId: itemIdValue === undefined || itemIdValue === null ? '' : String(itemIdValue),
    title: typeof item.title === 'string' ? item.title : '',
    imageUrl: normalizeImageUrl(item.pictUrl),
    status,
    cells,
  };
}

function getResponseContainer(responseBody: string, mode: ItemRankMode): Record<string, unknown> | undefined {
  try {
    const body = JSON.parse(responseBody) as { data?: Record<string, unknown> };
    const outerData = body.data;
    return mode === 'realtime' ? outerData?.data as Record<string, unknown> | undefined : outerData;
  } catch {
    return undefined;
  }
}

export function getItemRankPageInfo(responseBody: string, mode: ItemRankMode): ItemRankPageInfo {
  const container = getResponseContainer(responseBody, mode);
  const rawRows = Array.isArray(container?.data) ? container.data : [];
  return {
    recordCount: typeof container?.recordCount === 'number' ? container.recordCount : rawRows.length,
    rowCount: rawRows.length,
  };
}

export function paginateItemRankRows<T>(rows: T[], page: number, pageSize: number): {
  rows: T[];
  page: number;
  totalPages: number;
  start: number;
  end: number;
} {
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const pageRows = rows.slice(startIndex, startIndex + pageSize);
  return {
    rows: pageRows,
    page: safePage,
    totalPages,
    start: pageRows.length === 0 ? 0 : startIndex + 1,
    end: pageRows.length === 0 ? 0 : startIndex + pageRows.length,
  };
}

export function buildItemRankTable(responseBodies: string | string[], mode: ItemRankMode): ItemRankTable {
  const bodies = Array.isArray(responseBodies) ? responseBodies : [responseBodies];
  const rowById = new Map<string, ItemRankRow>();
  let recordCount = 0;

  bodies.forEach((responseBody) => {
    const container = getResponseContainer(responseBody, mode);
    const rawRows = Array.isArray(container?.data) ? container.data : [];
    const currentCount = typeof container?.recordCount === 'number' ? container.recordCount : rawRows.length;
    recordCount = Math.max(recordCount, currentCount);
    rawRows.filter((row): row is Record<string, unknown> => Boolean(row && typeof row === 'object')).map(readRow).forEach((row, index) => {
      // 分页响应中商品 ID 应唯一；缺失 ID 时保留每一行，避免数据被误合并。
      const key = row.itemId || `row-${rowById.size}-${index}`;
      if (!rowById.has(key)) rowById.set(key, row);
    });
  });

  return { metrics: ITEM_RANK_METRICS, rows: [...rowById.values()], recordCount: Math.max(recordCount, rowById.size) };
}
