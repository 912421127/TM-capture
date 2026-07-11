import { describe, expect, it } from 'vitest';
import {
  createPageCaptureStore,
  createRequestRecord,
  formatCaptureUrl,
  serializeCaptureRecords,
  buildCoreIndexTable,
  matchesCaptureRule,
  matchesAnyCaptureRule,
  type CaptureRule,
} from '../../src/shared/request-capture';

describe('request capture helpers', () => {
  it('matches a URL keyword rule', () => {
    const rule: CaptureRule = { url: 'detail/query' };

    expect(matchesCaptureRule('https://sycm.taobao.com/api/detail/query?page=1', rule)).toBe(true);
    expect(matchesCaptureRule('https://sycm.taobao.com/api/overview', rule)).toBe(false);
  });

  it('matches a URL regular expression rule', () => {
    const rule: CaptureRule = { url: /\/api\/item\/\d+$/ };

    expect(matchesCaptureRule('https://sycm.taobao.com/api/item/123', rule)).toBe(true);
    expect(matchesCaptureRule('https://sycm.taobao.com/api/item/abc', rule)).toBe(false);
  });

  it('only allows configured interfaces to be captured', () => {
    expect(matchesAnyCaptureRule('https://sycm.taobao.com/portal/coreIndex/new/getTableData/v3.json?dateType=day')).toBe(true);
    expect(matchesAnyCaptureRule('https://sycm.taobao.com/portal/coreIndex/new/trend/v3.json')).toBe(false);
  });

  it('classifies JSON and binary response bodies', () => {
    expect(createRequestRecord({
      pageId: 'tab-1',
      transport: 'fetch',
      method: 'GET',
      url: 'https://sycm.taobao.com/api/data',
      status: 200,
      contentType: 'application/json',
      responseBody: '{"ok":true}',
    }).responseBody).toBe('{"ok":true}');

    expect(createRequestRecord({
      pageId: 'tab-1',
      transport: 'xhr',
      method: 'GET',
      url: 'https://sycm.taobao.com/image.png',
      status: 200,
      contentType: 'image/png',
      responseBody: '',
    }).responseBody).toBe('');
  });

  it('clears records for one page without affecting another page', () => {
    const store = createPageCaptureStore();
    const first = createRequestRecord({ pageId: 'tab-1', transport: 'fetch', method: 'GET', url: 'https://sycm.taobao.com/a', status: 200, contentType: 'application/json', responseBody: '{}' });
    const second = createRequestRecord({ pageId: 'tab-2', transport: 'fetch', method: 'GET', url: 'https://sycm.taobao.com/b', status: 200, contentType: 'application/json', responseBody: '{}' });

    store.add(first);
    store.add(second);
    store.clear('tab-1');

    expect(store.list('tab-1')).toEqual([]);
    expect(store.list('tab-2')).toEqual([second]);
  });

  it('does not throw when a captured URL is invalid', () => {
    expect(formatCaptureUrl('not-a-valid-url')).toBe('not-a-valid-url');
  });

  it('serializes captured records as readable JSON', () => {
    const record = createRequestRecord({ pageId: 'tab-1', transport: 'fetch', method: 'GET', url: 'https://sycm.taobao.com/api/data', status: 200, contentType: 'application/json', responseBody: '{"ok":true}' });
    const exported = JSON.parse(serializeCaptureRecords([record]));

    expect(exported.records).toEqual([record]);
    expect(typeof exported.exportedAt).toBe('string');
  });

  it('builds a metric-by-date table from the core index response', () => {
    const rows = buildCoreIndexTable(JSON.stringify({ content: { data: [
      { statDate: { value: 1717977600000 }, payAmt: { value: 399, cycleCrc: 0.25 }, uv: { value: 73 } },
    ] } }));

    expect(rows.columns).toHaveLength(1);
    expect(rows.columns[0]?.label).toBe('2024-06-10');
    expect(rows.rows.find((row) => row.label === '支付金额')?.cells[0]).toEqual({ value: 399, change: 0.25 });
  });

  it('formats Sycm timestamps in China Standard Time', () => {
    const rows = buildCoreIndexTable(JSON.stringify({ content: { data: [
      { statDate: { value: 1783612800000 }, payAmt: { value: 0 } },
    ] } }));

    expect(rows.columns[0]?.label).toBe('2026-07-10');
  });
});
