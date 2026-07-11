import { findCaptureFeature, getCaptureFeature } from '../src/features';
import { createRequestRecord, type CaptureTransport } from '../src/shared/request-capture';

const CAPTURE_EVENT = '__tm_capture_record';
const TRIGGER_EVENT = '__tm_capture_trigger';
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

    window.addEventListener(TRIGGER_EVENT, (event) => {
      const interfaceId = (event as CustomEvent<{ interfaceId?: string }>).detail?.interfaceId;
      if (!interfaceId) return;
      void getCaptureFeature(interfaceId)?.request();
    });

    function getFeatureForUrl(url: string) {
      const resolvedUrl = new URL(url, location.href);
      if (resolvedUrl.origin !== location.origin) return undefined;
      return findCaptureFeature(resolvedUrl.href);
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
      const response = await originalFetch(input, init);
      const request = input instanceof Request ? input : undefined;
      const url = request?.url ?? String(input);
      const feature = getFeatureForUrl(url);
      if (!feature) return response;

      const contentType = response.headers.get('content-type') ?? '';
      const headers = new Headers(request?.headers ?? init?.headers);
      void response.clone().arrayBuffer().then((bytes) => publish(feature.id, {
        transport: 'fetch',
        method: init?.method ?? request?.method ?? 'GET',
        url,
        status: response.status,
        contentType,
        requestHeaders: safeHeaders(headers),
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
        if (!state) return;
        const feature = getFeatureForUrl(state.url);
        if (!feature) return;
        const contentType = this.getResponseHeader('content-type') ?? '';
        const responseBody = isTextContent(contentType) && typeof this.responseText === 'string' ? this.responseText : '';
        publish(feature.id, {
          transport: 'xhr',
          method: state.method,
          url: state.url,
          status: this.status,
          contentType,
          requestHeaders: state.requestHeaders,
          requestBody: state.requestBody,
          responseBody,
          responseSize: responseBody.length,
        });
      });
      originalSend.call(this, body);
    };
  },
});
