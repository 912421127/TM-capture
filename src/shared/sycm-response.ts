// 将生意参谋多种响应外壳归一化为安全的对象、数组和指标值，隔离接口格式差异。
import type { CellValue } from './capture';

type JsonObject = Record<string, unknown>;

function asObject(value: unknown): JsonObject | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as JsonObject) : null;
}

export function unwrapSycmResponse(response: unknown): unknown {
  const root = asObject(response);
  if (!root) throw new Error('生意参谋接口返回格式不正确。');

  let payload: unknown = root;
  if ('content' in root) {
    // 部分接口把真正的 JSON 再序列化成字符串，需要在这里统一拆包。
    payload = typeof root.content === 'string' ? JSON.parse(root.content) : root.content;
  }
  const envelope = asObject(payload);
  if (!envelope) throw new Error('生意参谋接口返回格式不正确。');
  if (typeof envelope.code === 'number' && envelope.code !== 0) {
    throw new Error(typeof envelope.message === 'string' ? envelope.message : '生意参谋接口返回失败。');
  }
  if (envelope.hasError === true) throw new Error('生意参谋接口返回失败。');
  return envelope.data;
}

export function readMetric(row: unknown, key: string): CellValue {
  const source = asObject(row);
  const metric = source?.[key];
  const metricObject = asObject(metric);
  // 指标可能直接是值，也可能包在 { value } 中；缺失统一返回 null 便于导出。
  if (metricObject) return ('value' in metricObject ? (metricObject.value as CellValue | undefined) : undefined) ?? null;
  return (metric as CellValue | undefined) ?? null;
}

export function readObject(value: unknown): JsonObject {
  return asObject(value) ?? {};
}
