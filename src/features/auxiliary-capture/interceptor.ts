const UNREADABLE_REQUEST_BODY = '[无法完整读取请求正文]';
const UNREADABLE_RESPONSE_BODY = '[无法完整读取响应正文]';

export function createMainWorldSessionBridge(send: (enabled: boolean) => void) {
  let ready = false;
  let enabled: boolean | undefined;

  function forward(): void {
    if (ready && enabled !== undefined) send(enabled);
  }

  return {
    setEnabled(value: boolean): void {
      enabled = value;
      forward();
    },
    markReady(): void {
      ready = true;
      forward();
    },
  };
}

export function isTextContent(contentType: string): boolean {
  return /json|text|javascript|xml|form-urlencoded/i.test(contentType);
}

export function isSameOriginTextResponse(url: string, contentType: string, pageUrl: string): boolean {
  return isSameOriginUrl(url, pageUrl) && isTextContent(contentType);
}

export function isSameOriginUrl(url: string, pageUrl: string): boolean {
  try {
    return new URL(url, pageUrl).origin === new URL(pageUrl).origin;
  } catch {
    return false;
  }
}

export function isTextXhrResponse(responseType: XMLHttpRequestResponseType, contentType: string): boolean {
  return responseType === 'json' || (isTextContent(contentType) && (responseType === '' || responseType === 'text'));
}

export function createFetchCaptureRequest(input: RequestInfo | URL, init?: RequestInit): Request {
  // Request(input) 可能转移原始 Request 的正文；这里只从副本构造抓包请求。
  return input instanceof Request ? new Request(input.clone(), init) : new Request(input, init);
}

export async function readFetchRequestBody(request: Request): Promise<string> {
  if (!request.body) return '';
  if (!isTextContent(request.headers.get('content-type') ?? '')) return UNREADABLE_REQUEST_BODY;

  try {
    return await request.clone().text();
  } catch {
    return UNREADABLE_REQUEST_BODY;
  }
}

export function serializeXhrRequestBody(body: Document | XMLHttpRequestBodyInit | null | undefined): string {
  if (body == null) return '';
  if (typeof body === 'string') return body;
  if (body instanceof URLSearchParams) return body.toString();
  if (body instanceof FormData) {
    const values: string[] = [];
    body.forEach((value, key) => {
      values.push(`${key}=${typeof value === 'string' ? value : `[文件:${value.name}]`}`);
    });
    return values.join('&');
  }
  return UNREADABLE_REQUEST_BODY;
}

export function readXhrResponseBody(responseType: XMLHttpRequestResponseType, response: unknown, contentType: string, responseText?: string): string {
  if (responseType === 'json') {
    try {
      return JSON.stringify(response);
    } catch {
      return UNREADABLE_RESPONSE_BODY;
    }
  }
  if (!isTextContent(contentType)) return '';
  if (responseType === '' || responseType === 'text') return responseText ?? UNREADABLE_RESPONSE_BODY;
  return UNREADABLE_RESPONSE_BODY;
}

export function appendXhrRequestHeader(headers: Record<string, string>, name: string, value: string): void {
  // XMLHttpRequest 对同名请求头采用追加语义，抓包记录也必须保留完整值。
  headers[name] = headers[name] ? `${headers[name]}, ${value}` : value;
}

export function getUtf8ByteLength(text: string): number {
  return new TextEncoder().encode(text).byteLength;
}
