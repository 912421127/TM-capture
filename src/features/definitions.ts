// 描述三个采集模块的展示列，并根据模块生成侧边栏默认筛选条件。
import type { FeatureId, FiltersFor, TableColumn } from '../shared/capture';

export interface FeatureDefinition {
  id: FeatureId;
  label: string;
  columns: TableColumn[];
}

export const featureDefinitions: FeatureDefinition[] = [
  {
    id: 'business-overview',
    label: '经营概览',
    columns: [
      { key: 'date', label: '日期' },
      { key: 'visitorCount', label: '访客数', format: 'number' },
      { key: 'pageViewCount', label: '浏览量', format: 'number' },
      { key: 'buyerCount', label: '支付买家数', format: 'number' },
      { key: 'payAmount', label: '支付金额', format: 'currency' },
      { key: 'conversionRate', label: '支付转化率', format: 'percentage' },
    ],
  },
  {
    id: 'store-product-rank',
    label: '本店商品排行',
    columns: [
      { key: 'rank', label: '排名', format: 'number' },
      { key: 'itemId', label: '商品编号' },
      { key: 'title', label: '商品名称' },
      { key: 'itemUrl', label: '商品链接', format: 'link' },
      { key: 'visitorCount', label: '访客数', format: 'number' },
      { key: 'buyerCount', label: '支付买家数', format: 'number' },
      { key: 'payAmount', label: '支付金额', format: 'currency' },
      { key: 'conversionRate', label: '支付转化率', format: 'percentage' },
    ],
  },
  {
    id: 'market-product-rank',
    label: '市场商品排行',
    columns: [
      { key: 'rank', label: '排名', format: 'number' },
      { key: 'itemId', label: '商品编号' },
      { key: 'title', label: '商品名称' },
      { key: 'itemUrl', label: '商品链接', format: 'link' },
      { key: 'sellerId', label: '卖家编号' },
      { key: 'isTmall', label: '是否天猫', format: 'boolean' },
      { key: 'visitorCount', label: '访客数', format: 'number' },
      { key: 'buyerCount', label: '支付买家数', format: 'number' },
      { key: 'payAmount', label: '支付金额', format: 'currency' },
    ],
  },
];

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function createDefaultFilters<F extends FeatureId>(featureId: F, now = new Date()): FiltersFor<F> {
  // 默认查询昨天及之前 7 天，避开当天数据尚未结算导致的空值或波动。
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
  const range = { startDate: formatLocalDate(start), endDate: formatLocalDate(end) };

  if (featureId === 'business-overview') return range as FiltersFor<F>;
  if (featureId === 'store-product-rank') return { ...range, metric: 'payAmount' } as FiltersFor<F>;
  return { ...range, metric: 'payAmount', categoryId: '', categoryName: '' } as FiltersFor<F>;
}
