// 页面主世界脚本：观察页面请求获取临时鉴权信息，并执行扩展发起的同源接口请求。
import { redactDiagnosticRecord, type DiagnosticRecord } from '../src/shared/diagnostic';
import { rememberPageAuth, type PageAuth } from '../src/shared/page-auth';
import { executeSycmRequest } from '../src/shared/page-request';
import type { SycmRequest } from '../src/shared/capture';

const REQUEST_EVENT = '__tm_capture_request';
const RESULT_EVENT = '__tm_capture_result';
const DIAGNOSTIC_EVENT = '__tm_capture_diagnostic';
const DIAGNOSTIC_TOGGLE_EVENT = '__tm_capture_diagnostic_toggle';
const MAX_DIAGNOSTIC_BODY_SIZE = 5 * 1024 * 1024;

interface PageRequestEvent {
  channelId: string;
  requestId: string;
  request: SycmRequest;
}

interface XhrDiagnosticState {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: string;
}

export default defineUnlistedScript(() => {
  const marker = '__TM_CAPTURE_MAIN_WORLD_INSTALLED__';
  const globalWindow = window as typeof window & Record<string, unknown>;
  // 内容脚本刷新或重复注入时只保留一套拦截器，避免同一个请求被重复记录。
  if (globalWindow[marker]) return;
  globalWindow[marker] = true;

  // 登录 token 与风控头只保留在页面内存，绝不通过扩展消息或存储传出。
  let pageAuth: PageAuth = {};
  function rememberRequestAuth(url: string, headers: Headers): void {
    if (new URL(url, location.href).origin !== location.origin) return;
    pageAuth = rememberPageAuth(pageAuth, new URL(url, location.href).href, Object.fromEntries(headers.entries()));
  }

  const authFetch = window.fetch.bind(window);
  // 页面原有 fetch/XHR 只用于观察鉴权信息，实际请求仍调用原始实现。
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const request = input instanceof Request ? input : null;
    const url = request?.url ?? String(input);
    rememberRequestAuth(url, new Headers(init?.headers ?? request?.headers));
    return authFetch(input, init);
  };

  const xhrAuthStates = new WeakMap<XMLHttpRequest, { url: string; headers: Record<string, string> }>();
  const authOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (_method: string, url: string | URL): void {
    xhrAuthStates.set(this, { url: new URL(String(url), location.href).href, headers: {} });
    authOpen.apply(this, arguments as unknown as Parameters<XMLHttpRequest['open']>);
  };
  const authSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;
  XMLHttpRequest.prototype.setRequestHeader = function (name: string, value: string): void {
    const state = xhrAuthStates.get(this);
    if (state) state.headers[name] = value;
    authSetRequestHeader.call(this, name, value);
  };
  const authSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function (body?: Document | XMLHttpRequestBodyInit | null): void {
    const state = xhrAuthStates.get(this);
    if (state) rememberRequestAuth(state.url, new Headers(state.headers));
    authSend.call(this, body);
  };

  window.addEventListener(REQUEST_EVENT, (event) => {
    const detail = (event as CustomEvent<PageRequestEvent>).detail;
    void executeSycmRequest(detail.request, fetch, pageAuth)
      .then((data) => {
        window.dispatchEvent(
          new CustomEvent(RESULT_EVENT, { detail: { channelId: detail.channelId, requestId: detail.requestId, ok: true, data } }),
        );
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : '页面请求失败。';
        window.dispatchEvent(
          new CustomEvent(RESULT_EVENT, {
            detail: { channelId: detail.channelId, requestId: detail.requestId, ok: false, error: message },
          }),
        );
      });
  });

  if (import.meta.env.MODE !== 'diagnostic') return;

  let diagnosticEnabled = false;
  window.addEventListener(DIAGNOSTIC_TOGGLE_EVENT, (event) => {
    diagnosticEnabled = Boolean((event as CustomEvent<{ enabled: boolean }>).detail.enabled);
  });

  function safeBody(text: string): string {
    // 诊断样本只保留有限大小，避免克隆大响应阻塞页面或撑爆后台内存。
    return text.length <= MAX_DIAGNOSTIC_BODY_SIZE ? text : '__RESPONSE_TOO_LARGE__';
  }

  function dispatchDiagnostic(record: Omit<DiagnosticRecord, 'id' | 'capturedAt'>): void {
    if (!diagnosticEnabled) return;
    const sanitized = redactDiagnosticRecord({
      ...record,
      id: crypto.randomUUID(),
      capturedAt: new Date().toISOString(),
    });
    window.dispatchEvent(new CustomEvent(DIAGNOSTIC_EVENT, { detail: sanitized }));
  }

  // 诊断构建在鉴权拦截器之后再包一层 fetch，只采集同源请求并异步读取响应副本。
  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const response = await originalFetch(input, init);
    if (!diagnosticEnabled) return response;

    const request = input instanceof Request ? input : null;
    const url = new URL(request?.url ?? String(input), location.href);
    if (url.origin !== location.origin) return response;

    const headers = new Headers(request?.headers ?? init?.headers);
    const requestHeaders = Object.fromEntries(headers.entries());
    const requestBody = typeof init?.body === 'string' ? init.body : '';
    void response
      .clone()
      .text()
      .then((body) => {
        dispatchDiagnostic({
          transport: 'fetch',
          method: init?.method ?? request?.method ?? 'GET',
          url: url.href,
          status: response.status,
          requestHeaders,
          requestBody,
          responseType: response.headers.get('content-type') ?? '',
          responseBody: safeBody(body),
        });
      })
      .catch(() => undefined);
    return response;
  };

  const xhrStates = new WeakMap<XMLHttpRequest, XhrDiagnosticState>();
  const originalOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method: string, url: string | URL): void {
    xhrStates.set(this, { method, url: new URL(String(url), location.href).href, headers: {}, body: '' });
    originalOpen.apply(this, arguments as unknown as Parameters<XMLHttpRequest['open']>);
  };

  const originalSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;
  XMLHttpRequest.prototype.setRequestHeader = function (name: string, value: string): void {
    const state = xhrStates.get(this);
    if (state) state.headers[name] = value;
    originalSetRequestHeader.call(this, name, value);
  };

  const originalSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function (body?: Document | XMLHttpRequestBodyInit | null): void {
    const state = xhrStates.get(this);
    if (state && typeof body === 'string') state.body = body;
    this.addEventListener('load', () => {
      if (!diagnosticEnabled || !state || new URL(state.url).origin !== location.origin) return;
      const responseBody = typeof this.responseText === 'string' ? safeBody(this.responseText) : '';
      dispatchDiagnostic({
        transport: 'xhr',
        method: state.method,
        url: state.url,
        status: this.status,
        requestHeaders: state.headers,
        requestBody: state.body,
        responseType: this.getResponseHeader('content-type') ?? '',
        responseBody,
      });
    });
    originalSend.call(this, body);
  };
});
