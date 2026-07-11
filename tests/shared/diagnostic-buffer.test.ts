// 验证诊断内存缓冲区的数量上限、拷贝返回和清空行为。
import { describe, expect, it } from 'vitest';
import { createDiagnosticBuffer } from '../../src/shared/diagnostic-buffer';
import type { DiagnosticRecord } from '../../src/shared/diagnostic';

function record(id: string): DiagnosticRecord {
  return {
    id,
    capturedAt: '2026-07-10T08:00:00.000Z',
    transport: 'fetch',
    method: 'GET',
    url: `https://sycm.taobao.com/api/${id}`,
    status: 200,
    requestHeaders: {},
    requestBody: '',
    responseType: 'application/json',
    responseBody: '{}',
  };
}

describe('diagnostic buffer', () => {
  it('只在内存中保留最近一百条记录', () => {
    const buffer = createDiagnosticBuffer(100);
    for (let index = 1; index <= 101; index += 1) buffer.add(record(String(index)));

    expect(buffer.list()).toHaveLength(100);
    expect(buffer.list()[0]?.id).toBe('2');
    expect(buffer.list()[99]?.id).toBe('101');
  });

  it('开始新一轮诊断时可以清空', () => {
    const buffer = createDiagnosticBuffer();
    buffer.add(record('1'));
    buffer.clear();
    expect(buffer.list()).toEqual([]);
  });
});
