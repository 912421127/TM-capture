// 经营概览适配器：调用汇总与每日明细接口，并转换成统一表格行。
import type { BusinessOverviewFilters, BusinessOverviewRow, CaptureFeature, FeatureCollectResult, SycmRequest, TableColumn } from '../shared/capture';
import { getRangeDateType } from '../shared/date-range';
import { readMetric, readObject, unwrapSycmResponse } from '../shared/sycm-response';

export const businessOverviewColumns: TableColumn[] = [
  { key: 'date', label: '日期' },
  { key: 'visitorCount', label: '访客数', format: 'number' },
  { key: 'pageViewCount', label: '浏览量', format: 'number' },
  { key: 'buyerCount', label: '支付买家数', format: 'number' },
  { key: 'payAmount', label: '支付金额', format: 'currency' },
  { key: 'conversionRate', label: '支付转化率', format: 'percentage' },
];

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// 默认查询昨天及之前七天，避免把当天尚未结算的数据当成完整结果。
export function createDefaultBusinessOverviewFilters(now = new Date()): BusinessOverviewFilters {
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
  return { startDate: formatLocalDate(start), endDate: formatLocalDate(end) };
}

function createPortalRequest(path: string, startDate: string, endDate: string, needCycleCrc = false): SycmRequest {
  // 两个经营概览接口共享日期参数和页面来源头，只在需要时增加周期校验参数。
  const query = new URLSearchParams({ dateType: getRangeDateType(startDate, endDate, 'day'), dateRange: `${startDate}|${endDate}` });
  if (needCycleCrc) query.set('needCycleCrc', 'true');
  return { url: `https://sycm.taobao.com${path}?${query}`, headers: { 'sycm-referer': '/portal/home.htm' } };
}

function formatDate(timestamp: unknown): string {
  const value = typeof timestamp === 'number' ? timestamp : readMetric({ timestamp }, 'timestamp');
  if (typeof value !== 'number') return '';
  return new Date(value).toISOString().slice(0, 10);
}

function createRow(source: unknown): BusinessOverviewRow {
  // 将接口的指标对象转换成前端稳定的数字字段，缺失值按 0 处理。
  return {
    date: formatDate(readMetric(source, 'statDate')),
    visitorCount: Number(readMetric(source, 'uv') ?? 0),
    pageViewCount: Number(readMetric(source, 'pv') ?? 0),
    buyerCount: Number(readMetric(source, 'payByrCnt') ?? 0),
    payAmount: Number(readMetric(source, 'payAmt') ?? 0),
    conversionRate: Number(readMetric(source, 'payRate') ?? 0),
  };
}

export const businessOverviewFeature: CaptureFeature<'business-overview'> = {
  id: 'business-overview',
  label: '经营概览',
  columns: businessOverviewColumns,
  async collect(filters, transport, onProgress): Promise<FeatureCollectResult<'business-overview'>> {
    // 经营概览固定分两次请求，因此进度明确展示为汇总和每日明细两个阶段。
    onProgress({ currentPage: 1, totalPages: 2, message: '正在读取经营汇总…' });
    const overview = readObject(unwrapSycmResponse(await transport.request(createPortalRequest('/portal/coreIndex/new/overview/v3.json', filters.startDate, filters.endDate, true))));
    const self = readObject(overview.self);

    onProgress({ currentPage: 2, totalPages: 2, message: '正在读取每日明细…' });
    const table = unwrapSycmResponse(await transport.request(createPortalRequest('/portal/coreIndex/new/getTableData/v3.json', filters.startDate, filters.endDate)));
    const rows = (Array.isArray(table) ? table : []).map(createRow).filter((row) => row.date >= filters.startDate && row.date <= filters.endDate);

    return {
      summary: {
        访客数: readMetric(self, 'uv'),
        浏览量: readMetric(self, 'pv'),
        支付买家数: readMetric(self, 'payByrCnt'),
        支付金额: readMetric(self, 'payAmt'),
        支付转化率: readMetric(self, 'payRate'),
      },
      rows,
    };
  },
};
