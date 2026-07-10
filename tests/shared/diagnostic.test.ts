import { describe, expect, it } from 'vitest';
import { redactDiagnosticRecord } from '../../src/shared/diagnostic';

describe('redactDiagnosticRecord', () => {
  it('保留参数名称但移除令牌、风控值和账号标识', () => {
    const result = redactDiagnosticRecord({
      id: 'record-1',
      capturedAt: '2026-07-10T08:00:00.000Z',
      transport: 'fetch',
      method: 'POST',
      url: 'https://sycm.taobao.com/api/list?token=secret&page=1',
      status: 200,
      requestHeaders: { 'content-type': 'application/json', 'bx-ua': 'risk-value' },
      requestBody: JSON.stringify({ sellerId: '12345', date: '2026-07-01' }),
      responseType: 'application/json',
      responseBody: JSON.stringify({ userId: '67890', data: [{ value: 3 }] }),
    });

    expect(result.url).toContain('token=__REDACTED__');
    expect(result.url).toContain('page=1');
    expect(result.requestHeaders['bx-ua']).toBe('__REDACTED__');
    expect(result.requestBody).toContain('"sellerId":"__REDACTED__"');
    expect(result.responseBody).toContain('"userId":"__REDACTED__"');
    expect(result.responseBody).toContain('"value":3');
  });
});
