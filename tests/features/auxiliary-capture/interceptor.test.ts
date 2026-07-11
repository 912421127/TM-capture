import { describe, expect, it } from 'vitest';
import {
  appendXhrRequestHeader,
  createFetchCaptureRequest,
  createMainWorldSessionBridge,
  getUtf8ByteLength,
  isTextXhrResponse,
  isSameOriginTextResponse,
  readXhrResponseBody,
} from '../../../src/features/auxiliary-capture/interceptor';

describe('辅助抓包拦截工具', () => {
  it('读取 fetch(Request) 元数据时不消耗原始请求正文', async () => {
    const original = new Request('https://sycm.taobao.com/api/rank', {
      method: 'POST',
      body: '{"page":1}',
      headers: { 'content-type': 'application/json' },
    });

    const captured = createFetchCaptureRequest(original);

    expect(await captured.text()).toBe('{"page":1}');
    expect(await original.text()).toBe('{"page":1}');
  });

  it('只允许同源文本响应进入辅助抓包', () => {
    expect(isSameOriginTextResponse('https://sycm.taobao.com/api/rank', 'application/json', 'https://sycm.taobao.com/page')).toBe(true);
    expect(isSameOriginTextResponse('https://other.example/api/rank', 'application/json', 'https://sycm.taobao.com/page')).toBe(false);
    expect(isSameOriginTextResponse('https://sycm.taobao.com/image.png', 'image/png', 'https://sycm.taobao.com/page')).toBe(false);
  });

  it('MAIN world 就绪前保留辅助抓包会话，握手后再转发', () => {
    const sent: boolean[] = [];
    const bridge = createMainWorldSessionBridge((enabled) => sent.push(enabled));

    bridge.setEnabled(true);
    expect(sent).toEqual([]);

    bridge.markReady();
    expect(sent).toEqual([true]);
  });

  it('保留 XHR json 响应正文并按 UTF-8 字节数计算大小', () => {
    const responseBody = readXhrResponseBody('json', { 名称: '商品排行' }, 'application/json');

    expect(responseBody).toBe('{"名称":"商品排行"}');
    expect(getUtf8ByteLength(responseBody)).toBe(new TextEncoder().encode(responseBody).byteLength);
    expect(getUtf8ByteLength(responseBody)).toBeGreaterThan(responseBody.length);
  });

  it('不把二进制 XHR 响应当作文本抓取', () => {
    expect(isTextXhrResponse('arraybuffer', 'application/json')).toBe(false);
    expect(isTextXhrResponse('json', 'application/json')).toBe(true);
  });

  it('XHR 明确指定 json 时，即使服务端漏掉 Content-Type 也会记录 JSON', () => {
    expect(isTextXhrResponse('json', '')).toBe(true);
    expect(readXhrResponseBody('json', { ok: true }, '')).toBe('{"ok":true}');
  });

  it('重复设置 XHR 请求头时按浏览器的追加语义记录', () => {
    const headers: Record<string, string> = {};

    appendXhrRequestHeader(headers, 'X-Trace', 'first');
    appendXhrRequestHeader(headers, 'X-Trace', 'second');

    expect(headers).toEqual({ 'X-Trace': 'first, second' });
  });
});
