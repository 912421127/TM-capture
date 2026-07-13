import { createRequestRecord, matchesAnyCaptureRule, type CaptureTransport } from '../src/shared/request-capture';

// 此脚本运行在网页主世界，用来观察页面自己的 fetch/XHR；内容脚本没有这个权限。
const CAPTURE_EVENT = '__tm_capture_record';
const DIRECT_CAPTURE_EVENT = '__tm_capture_direct_record';
const INSTALLED_MARKER = '__TM_CAPTURE_MAIN_CONTENT_INSTALLED__';

interface XhrState {
  method: string;
  url: string;
  requestHeaders: Record<string, string>;
  requestBody: string;
}

export default defineContentScript({
  matches: ['https://sycm.taobao.com/*'],
  runAt: 'document_start',
  world: 'MAIN',
  main() {
    const page = window as typeof window & Record<string, unknown>;
    if (page[INSTALLED_MARKER]) return;
    page[INSTALLED_MARKER] = true;

    window.addEventListener(DIRECT_CAPTURE_EVENT, () => {
      void requestCoreIndexTable();
    });

    function isTargetUrl(url: string): boolean {
      return new URL(url, location.href).origin === location.origin && matchesAnyCaptureRule(url);
    }

    function isTextContent(contentType: string): boolean {
      return /json|text|javascript|xml|form-urlencoded/i.test(contentType);
    }

    function safeHeaders(headers: Headers): Record<string, string> {
      const result: Record<string, string> = {};
      headers.forEach((value, key) => {
        if (!/cookie|authorization|token|user.?id|seller.?id/i.test(key)) result[key] = value;
      });
      return result;
    }

    function publish(input: {
      transport: CaptureTransport;
      method: string;
      url: string;
      status: number;
      contentType: string;
      requestHeaders?: Record<string, string>;
      requestBody?: string;
      responseBody: string;
      responseSize?: number;
    }): void {
      window.dispatchEvent(new CustomEvent(CAPTURE_EVENT, {
        detail: createRequestRecord({ pageId: location.href, ...input }),
      }));
    }

    const originalFetch = window.fetch.bind(window);
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const response = await originalFetch(input, init);
      const request = input instanceof Request ? input : undefined;
      const url = request?.url ?? String(input);
      if (!isTargetUrl(url)) return response;
      const contentType = response.headers.get('content-type') ?? '';
      const headers = new Headers(request?.headers ?? init?.headers);
      void response.clone().arrayBuffer().then((bytes) => publish({
        transport: 'fetch', method: init?.method ?? request?.method ?? 'GET', url,
        status: response.status, contentType, requestHeaders: safeHeaders(headers),
        requestBody: typeof init?.body === 'string' ? init.body : '',
        responseBody: isTextContent(contentType) ? new TextDecoder().decode(bytes) : '',
        responseSize: bytes.byteLength,
      })).catch(() => undefined);
      return response;
    };

    const xhrStates = new WeakMap<XMLHttpRequest, XhrState>();
    const originalOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (method: string, url: string | URL): void {
      xhrStates.set(this, { method, url: new URL(String(url), location.href).href, requestHeaders: {}, requestBody: '' });
      originalOpen.apply(this, arguments as unknown as Parameters<XMLHttpRequest['open']>);
    };

    const originalSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;
    XMLHttpRequest.prototype.setRequestHeader = function (name: string, value: string): void {
      const state = xhrStates.get(this);
      if (state && !/cookie|authorization|token|user.?id|seller.?id/i.test(name)) state.requestHeaders[name] = value;
      originalSetRequestHeader.call(this, name, value);
    };

    const originalSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = function (body?: Document | XMLHttpRequestBodyInit | null): void {
      const state = xhrStates.get(this);
      if (state && typeof body === 'string') state.requestBody = body;
      this.addEventListener('load', () => {
        if (!state || !isTargetUrl(state.url)) return;
        const contentType = this.getResponseHeader('content-type') ?? '';
        const responseBody = isTextContent(contentType) && typeof this.responseText === 'string' ? this.responseText : '';
        publish({ transport: 'xhr', method: state.method, url: state.url, status: this.status, contentType, requestHeaders: state.requestHeaders, requestBody: state.requestBody, responseBody, responseSize: responseBody.length });
      });
      originalSend.call(this, body);
    };

    async function requestCoreIndexTable(): Promise<void> {
<<<<<<< HEAD
=======
      // 定时任务复用页面已登录会话，只补齐接口需要的 token 和当天日期范围。
>>>>>>> c459f5d9f7c14a0dd2b8ff16977aeeaf71dc8b29
      const token = findQueryValue('token');
      if (!token) return;
      const dateRange = findQueryValue('dateRange') ?? formatToday();
      const url = new URL('/portal/coreIndex/new/getTableData/v3.json', location.origin);
      url.searchParams.set('dateType', 'day');
      url.searchParams.set('dateRange', dateRange);
      url.searchParams.set('_', String(Date.now()));
      url.searchParams.set('token', token);

      try {
        const response = await fetch(url.href, { credentials: 'include' });
        const contentType = response.headers.get('content-type') ?? '';
        await response.text();
      } catch {
        // 当前页面登录状态失效时不打断页面，只让侧边栏继续显示已有数据。
      }
    }

    function findQueryValue(key: string): string | null {
      const currentValue = new URL(location.href).searchParams.get(key);
      if (currentValue) return currentValue;
      const entries = performance.getEntriesByType('resource').reverse();
      for (const entry of entries) {
        try {
          const value = new URL((entry as PerformanceResourceTiming).name, location.href).searchParams.get(key);
          if (value) return value;
        } catch {
          continue;
        }
      }
      return null;
    }

    function formatToday(): string {
      const now = new Date();
      const date = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
      return `${date.toISOString().slice(0, 10)}|${date.toISOString().slice(0, 10)}`;
    }
  },
});
