export interface DiagnosticRecord {
  id: string;
  capturedAt: string;
  transport: 'fetch' | 'xhr';
  method: string;
  url: string;
  status: number;
  requestHeaders: Record<string, string>;
  requestBody: string;
  responseType: string;
  responseBody: string;
}

const REDACTED = '__REDACTED__';
const SENSITIVE_KEY = /token|cookie|authorization|bx-ua|user.?id|seller.?id/i;

function redactValue(value: unknown, key = ''): unknown {
  if (SENSITIVE_KEY.test(key)) return REDACTED;
  if (Array.isArray(value)) return value.map((item) => redactValue(item));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([childKey, childValue]) => [childKey, redactValue(childValue, childKey)]));
  }
  return value;
}

function redactBody(body: string): string {
  if (!body) return '';
  try {
    return JSON.stringify(redactValue(JSON.parse(body)));
  } catch {
    const values = new URLSearchParams(body);
    if ([...values.keys()].length === 0) return body;
    for (const key of [...values.keys()]) {
      if (SENSITIVE_KEY.test(key)) values.set(key, REDACTED);
    }
    return values.toString();
  }
}

export function redactDiagnosticRecord(record: DiagnosticRecord): DiagnosticRecord {
  const url = new URL(record.url);
  for (const key of [...url.searchParams.keys()]) {
    if (SENSITIVE_KEY.test(key)) url.searchParams.set(key, REDACTED);
  }

  const requestHeaders = Object.fromEntries(
    Object.entries(record.requestHeaders).map(([key, value]) => [key, SENSITIVE_KEY.test(key) ? REDACTED : value]),
  );

  // 字段名会被保留，便于分析接口结构；敏感值在离开页面前就被替换。
  return {
    ...record,
    url: url.href,
    requestHeaders,
    requestBody: redactBody(record.requestBody),
    responseBody: redactBody(record.responseBody),
  };
}
