export type CaptureTransport = 'fetch' | 'xhr';

export interface CaptureRule {
  url: string | RegExp;
}

// 只采集用户明确指定的接口，后续新增接口直接在这里追加规则即可。
export const CAPTURE_RULES: CaptureRule[] = [
  { url: '/portal/coreIndex/new/getTableData/v3.json' },
];

export interface RequestRecord {
  id: string;
  pageId: string;
  capturedAt: string;
  transport: CaptureTransport;
  method: string;
  url: string;
  status: number;
  contentType: string;
  requestHeaders: Record<string, string>;
  requestBody: string;
  responseBody: string;
  responseSize: number;
}

export interface CoreIndexTable {
  columns: Array<{ label: string; timestamp: number }>;
  rows: Array<{ key: string; label: string; cells: Array<{ value: number | null; change: number | null }> }>;
}

const CORE_INDEX_METRICS = [
  ['payAmt', '支付金额'], ['netPaymentAmount', '净支付金额'], ['uv', '访客数'],
  ['payByrCnt', '支付买家数'], ['payRate', '支付转化率'], ['rfdSucAmt', '退款金额（完结时间）'],
  ['p4pExpendAmt', '关键词推广花费'], ['adStrategyAmt', '精准人群推广花费'],
  ['feedCharge', '智能场景花费'], ['zzExpendAmt', '全站推广花费'], ['tkExpendAmt', '淘宝客佣金'],
  ['payShopRfdAmt', '退款金额（支付时间）'], ['payAmtRfdRate', '金额退款率'],
  ['cartByrCnt', '加购人数'], ['cltItmCnt', '商品收藏人数'], ['pv', '浏览量'],
  ['stayTime', '平均停留时长'], ['cartItemCnt', '加购件数'], ['subPayOrdSubCnt', '支付子订单数'],
  ['ordRfdRate', '订单退款率'], ['payItmCnt', '支付件数'], ['cubeAmt', '客单价'],
  ['rePurchasePayAmount', '老客复购金额'], ['payOldByrCnt', '老客复购人数'], ['oldRepeatByrRate', '老客复购率'],
  ['rfdFinshDur', '退款处理时长(天)'], ['wwReplyManualAvgTimeLen', '旺旺人工响应时长(秒)'],
  ['consultRate', '咨询率'], ['disputeDutyRatio', '平台判责率'], ['gotInTime24hRate', '24小时揽收及时率'],
  ['postTimeLenHour', '物流到货时长(小时)'],
] as const;

function formatSycmDate(timestamp: number): string {
  // 生意参谋的统计日按东八区日期返回，不能直接使用 UTC 的 toISOString。
  return new Date(timestamp + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

interface RequestRecordInput {
  pageId: string;
  transport: CaptureTransport;
  method: string;
  url: string;
  status: number;
  contentType: string;
  requestHeaders?: Record<string, string>;
  requestBody?: string;
  responseBody: string;
  responseSize?: number;
}

export function matchesCaptureRule(url: string, rule: CaptureRule): boolean {
  if (typeof rule.url === 'string') return url.includes(rule.url);
  rule.url.lastIndex = 0;
  return rule.url.test(url);
}

export function matchesAnyCaptureRule(url: string, rules = CAPTURE_RULES): boolean {
  return rules.some((rule) => matchesCaptureRule(url, rule));
}

export function formatCaptureUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    // 页面脚本可能读到格式不完整的请求地址，展示时保留原值而不是让侧边栏崩溃。
    return url;
  }
}

export function serializeCaptureRecords(records: RequestRecord[]): string {
  return JSON.stringify({ exportedAt: new Date().toISOString(), records }, null, 2);
}

export function buildCoreIndexTable(responseBody: string): CoreIndexTable {
  try {
    const data = JSON.parse(responseBody)?.content?.data;
    if (!Array.isArray(data)) return { columns: [], rows: [] };
    // 接口按时间正序返回，页面表格按最新日期在左侧展示，所以统一倒序。
    const orderedData = [...data].reverse();
    const columns = orderedData.map((item) => ({
      timestamp: Number(item.statDate?.value ?? 0),
      label: item.statDate?.value ? formatSycmDate(item.statDate.value) : '-',
    }));
    const rows = CORE_INDEX_METRICS.map(([key, label]) => ({
      key,
      label,
      cells: orderedData.map((item) => ({
        value: typeof item[key]?.value === 'number' ? item[key].value : null,
        change: typeof item[key]?.cycleCrc === 'number' ? item[key].cycleCrc : null,
      })),
    }));
    return { columns, rows };
  } catch {
    return { columns: [], rows: [] };
  }
}

export function createRequestRecord(input: RequestRecordInput): RequestRecord {
  return {
    id: crypto.randomUUID(),
    capturedAt: new Date().toISOString(),
    pageId: input.pageId,
    transport: input.transport,
    method: input.method,
    url: input.url,
    status: input.status,
    contentType: input.contentType,
    requestHeaders: input.requestHeaders ?? {},
    requestBody: input.requestBody ?? '',
    responseBody: input.responseBody,
    responseSize: input.responseSize ?? input.responseBody.length,
  };
}

export function createPageCaptureStore() {
  const recordsByPage = new Map<string, RequestRecord[]>();

  return {
    add(record: RequestRecord): void {
      const records = recordsByPage.get(record.pageId) ?? [];
      records.push(record);
      recordsByPage.set(record.pageId, records);
    },
    list(pageId: string): RequestRecord[] {
      return [...(recordsByPage.get(pageId) ?? [])];
    },
    clear(pageId: string): void {
      recordsByPage.delete(pageId);
    },
  };
}
