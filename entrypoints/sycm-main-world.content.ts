import { findCaptureFeature, getCaptureFeature } from '../src/features';
import { createRequestRecord, type CaptureTransport } from '../src/shared/request-capture';
import {
  createFetchCaptureRequest,
  appendXhrRequestHeader,
  getUtf8ByteLength,
  isSameOriginTextResponse,
  isSameOriginUrl,
  isTextContent,
  isTextXhrResponse,
  readFetchRequestBody,
  readXhrResponseBody,
  serializeXhrRequestBody,
} from '../src/features/auxiliary-capture/interceptor';

const CAPTURE_EVENT = '__tm_capture_record';
const TRIGGER_EVENT = '__tm_capture_trigger';
const AUXILIARY_SESSION_EVENT = '__tm_capture_auxiliary_session';
const MAIN_WORLD_READY_EVENT = '__tm_capture_main_world_ready';
const MAIN_WORLD_READY_ATTRIBUTE = 'data-tm-capture-main-ready';
const INSTALLED_MARKER = '__TM_CAPTURE_MAIN_CONTENT_INSTALLED__';
const AUXILIARY_CAPTURE_INTERFACE_ID = 'auxiliary-capture';

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

    let auxiliaryCaptureEnabled = false;

    window.addEventListener(TRIGGER_EVENT, (event) => {
      const interfaceId = (event as CustomEvent<{ interfaceId?: string }>).detail?.interfaceId;
      if (!interfaceId) return;
      void getCaptureFeature(interfaceId)?.request();
    });

    window.addEventListener(AUXILIARY_SESSION_EVENT, (event) => {
      auxiliaryCaptureEnabled = Boolean((event as CustomEvent<{ enabled?: boolean }>).detail?.enabled);
    });

    // 用 DOM 属性保留就绪状态，避免隔离脚本晚注入时错过一次性事件。
    document.documentElement.setAttribute(MAIN_WORLD_READY_ATTRIBUTE, 'true');
    window.dispatchEvent(new CustomEvent(MAIN_WORLD_READY_EVENT));

    function getFeatureForUrl(url: string) {
      const resolvedUrl = new URL(url, location.href);
      if (resolvedUrl.origin !== location.origin) return undefined;
      return findCaptureFeature(resolvedUrl.href);
    }

    function safeHeaders(headers: Headers): Record<string, string> {
      const result: Record<string, string> = {};
      headers.forEach((value, key) => {
        if (!/cookie|authorization|token|user.?id|seller.?id/i.test(key)) result[key] = value;
      });
      return result;
    }

    function readHeaders(headers: Headers): Record<string, string> {
      const result: Record<string, string> = {};
      headers.forEach((value, key) => { result[key] = value; });
      return result;
    }

    function publish(interfaceId: string, input: {
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
        detail: createRequestRecord({ interfaceId, pageId: location.href, ...input }),
      }));
    }

    const originalFetch = window.fetch.bind(window);
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      // 只从 Request 副本读取抓包信息，原始 input 必须原样传给页面的 fetch。
      const capturedRequest = createFetchCaptureRequest(input, init);
      const response = await originalFetch(input, init);
      const url = capturedRequest.url;
      const feature = getFeatureForUrl(url);
      const contentType = response.headers.get('content-type') ?? '';
      const shouldCaptureAuxiliary = auxiliaryCaptureEnabled && isSameOriginTextResponse(url, contentType, location.href);
      if (!feature && !shouldCaptureAuxiliary) return response;
      if (!isTextContent(contentType)) return response;
      const headers = capturedRequest.headers;
      void Promise.all([
        response.clone().arrayBuffer(),
        readFetchRequestBody(capturedRequest),
      ]).then(([bytes, requestBody]) => {
        const responseBody = new TextDecoder().decode(bytes);
        const input = {
          transport: 'fetch' as const,
          method: capturedRequest.method,
          url,
          status: response.status,
          contentType,
          requestBody,
          responseBody,
          responseSize: bytes.byteLength,
        };
        if (feature) publish(feature.id, { ...input, requestHeaders: safeHeaders(headers) });
        if (shouldCaptureAuxiliary) publish(AUXILIARY_CAPTURE_INTERFACE_ID, { ...input, requestHeaders: readHeaders(headers) });
      }).catch(() => undefined);
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
      if (state) appendXhrRequestHeader(state.requestHeaders, name, value);
      originalSetRequestHeader.call(this, name, value);
    };

    const originalSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = function (body?: Document | XMLHttpRequestBodyInit | null): void {
      const state = xhrStates.get(this);
      if (state) state.requestBody = serializeXhrRequestBody(body);
      this.addEventListener('load', () => {
        if (!state) return;
        const feature = getFeatureForUrl(state.url);
        const contentType = this.getResponseHeader('content-type') ?? '';
        const shouldCaptureAuxiliary = auxiliaryCaptureEnabled && isSameOriginUrl(state.url, location.href);
        if ((!feature && !shouldCaptureAuxiliary) || !isTextXhrResponse(this.responseType, contentType)) return;
        let responseText: string | undefined;
        try { responseText = this.responseText; } catch { /* 二进制 responseType 不可读取文本。 */ }
        const responseBody = readXhrResponseBody(this.responseType, this.response, contentType, responseText);
        const input = {
          transport: 'xhr',
          method: state.method,
          url: state.url,
          status: this.status,
          contentType,
          requestBody: state.requestBody,
          responseBody,
          responseSize: getUtf8ByteLength(responseBody),
        } as const;
        if (feature) publish(feature.id, { ...input, requestHeaders: safeHeaders(new Headers(state.requestHeaders)) });
        if (shouldCaptureAuxiliary) publish(AUXILIARY_CAPTURE_INTERFACE_ID, { ...input, requestHeaders: state.requestHeaders });
      });
      originalSend.call(this, body);
    };
  },
});
