import { describe, expect, it } from 'vitest';
import { buildItemRankTable, paginateItemRankRows } from '../../../src/features/item-rank/table';

const metricKeys = [
  'payAmt', 'sucRefundAmt', 'payItmCnt', 'payByrCnt', 'payRate',
  'itemStatus', 'itemCartCnt', 'itemCltByrCnt', 'visitCltRate', 'itmUv',
  'itmPv', 'itmStayTime', 'itmBounceRate', 'seGuideUv', 'seGuidePayByrCnt',
  'seGuidePayRate', 'uvAvgValue', 'p4pExpendAmt', 'p4pRoi',
];

function makeRow() {
  return {
    item: { itemId: '1037139102717', title: '商品标题', pictUrl: '//img.example/item.jpg' },
    itemStatus: '当前在线',
    payAmt: { value: 769, cycleCrc: 0 },
    sucRefundAmt: { value: 10 },
    payItmCnt: { value: 1 },
    payByrCnt: { value: 1 },
    payRate: { value: 0.25 },
    itemCartCnt: { value: 5 },
    itemCltByrCnt: { value: 0, syncCrc: -1 },
    visitCltRate: { value: 0 },
    itmUv: { value: 4, cycleCrc: 0, syncCrc: -0.3333 },
    itmPv: { value: 8, cycleCrc: -0.2 },
    itmStayTime: { value: 2.3725, syncCrc: -0.6641 },
    itmBounceRate: { value: 0 },
    seGuideUv: { value: 1 },
    seGuidePayByrCnt: { value: 1 },
    seGuidePayRate: { value: 0.25 },
    uvAvgValue: { value: 192.25 },
    p4pExpendAmt: { value: 12.5 },
    p4pRoi: { value: 3.2 },
  };
}

describe('商品排行响应解析', () => {
  it('解析历史接口的商品行和截图中的 19 个字段', () => {
    const table = buildItemRankTable(JSON.stringify({ data: { recordCount: 42, data: [makeRow()] } }), 'recent7');
    const row = table.rows[0];

    expect(table.recordCount).toBe(42);
    expect(table.metrics.map((metric) => metric.key)).toEqual(metricKeys);
    expect(row).toBeDefined();
    if (!row) return;
    expect(row).toMatchObject({
      itemId: '1037139102717',
      title: '商品标题',
      imageUrl: 'https://img.example/item.jpg',
      status: '当前在线',
    });
    expect(row.cells.payAmt).toEqual({ value: 769, change: null });
    expect(row.cells.itemCltByrCnt).toEqual({ value: 0, change: -1 });
    expect(row.cells.itmUv).toEqual({ value: 4, change: -0.3333 });
    expect(row.cells.itmStayTime).toEqual({ value: 2.3725, change: -0.6641 });
  });

  it('解析实时接口的双层 data 结构且没有对比值时显示空变化', () => {
    const body = { data: { data: { recordCount: 1, data: [{ ...makeRow(), itmUv: { value: 4 } }] } } };
    const table = buildItemRankTable(JSON.stringify(body), 'realtime');

    expect(table.recordCount).toBe(1);
    expect(table.rows[0]?.cells.itmUv).toEqual({ value: 4, change: null });
  });

  it('缺少字段、数据为空或 JSON 无效时不抛异常', () => {
    expect(buildItemRankTable(JSON.stringify({ data: { recordCount: 0, data: [{}] } }), 'recent30').rows[0]?.cells.payAmt)
      .toEqual({ value: null, change: null });
    expect(buildItemRankTable(JSON.stringify({ data: { recordCount: 0, data: [] } }), 'recent30').rows).toEqual([]);
    expect(buildItemRankTable('{invalid json', 'recent30')).toEqual({ metrics: expect.any(Array), rows: [], recordCount: 0 });
  });

  it('在本地分页并返回最后不足一页的商品', () => {
    const rows = Array.from({ length: 25 }, (_, index) => ({ itemId: String(index + 1) }));

    expect(paginateItemRankRows(rows, 1, 10)).toEqual({ rows: rows.slice(0, 10), page: 1, totalPages: 3, start: 1, end: 10 });
    expect(paginateItemRankRows(rows, 3, 10)).toEqual({ rows: rows.slice(20), page: 3, totalPages: 3, start: 21, end: 25 });
  });

  it('合并多页响应并按商品 ID 去重', () => {
    const first = makeRow();
    const second = { ...makeRow(), item: { ...makeRow().item, itemId: 'second-item' } };
    const duplicate = { ...makeRow(), payAmt: { value: 999 } };
    const table = buildItemRankTable([
      JSON.stringify({ data: { recordCount: 2, data: [first] } }),
      JSON.stringify({ data: { recordCount: 2, data: [second, duplicate] } }),
    ], 'recent7');

    expect(table.recordCount).toBe(2);
    expect(table.rows.map((row) => row.itemId)).toEqual(['1037139102717', 'second-item']);
    expect(table.rows[0]?.cells.payAmt.value).toBe(769);
  });
});
