export type CaptureTransport = 'fetch' | 'xhr';

export interface CaptureRule {
  url: string | RegExp;
}

export interface RequestRecord {
  id: string;
  interfaceId: string;
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

interface RequestRecordInput {
  interfaceId: string;
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

export function matchesAnyCaptureRule(url: string, rules: CaptureRule[]): boolean {
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

export function createRequestRecord(input: RequestRecordInput): RequestRecord {
  return {
    id: crypto.randomUUID(),
    interfaceId: input.interfaceId,
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
    list(pageId: string, interfaceId?: string): RequestRecord[] {
      const records = recordsByPage.get(pageId) ?? [];
      return interfaceId ? records.filter((record) => record.interfaceId === interfaceId) : [...records];
    },
    clear(pageId: string, interfaceId?: string): void {
      if (!interfaceId) {
        recordsByPage.delete(pageId);
        return;
      }

      const records = recordsByPage.get(pageId) ?? [];
      const remainingRecords = records.filter((record) => record.interfaceId !== interfaceId);
      if (remainingRecords.length === 0) recordsByPage.delete(pageId);
      else recordsByPage.set(pageId, remainingRecords);
    },
  };
}
