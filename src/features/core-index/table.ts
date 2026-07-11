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
  // 生意参谋按东八区返回统计日，不能直接使用 UTC 日期。
  return new Date(timestamp + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function buildCoreIndexTable(responseBody: string): CoreIndexTable {
  try {
    const data = JSON.parse(responseBody)?.content?.data;
    if (!Array.isArray(data)) return { columns: [], rows: [] };
    const orderedData = [...data].reverse();
    return {
      columns: orderedData.map((item) => ({
        timestamp: Number(item.statDate?.value ?? 0),
        label: item.statDate?.value ? formatSycmDate(item.statDate.value) : '-',
      })),
      rows: CORE_INDEX_METRICS.map(([key, label]) => ({
        key,
        label,
        cells: orderedData.map((item) => ({
          value: typeof item[key]?.value === 'number' ? item[key].value : null,
          change: typeof item[key]?.cycleCrc === 'number' ? item[key].cycleCrc : null,
        })),
      })),
    };
  } catch {
    return { columns: [], rows: [] };
  }
}
