// 验证页面请求的来源限制、鉴权参数、HTTP 错误、JSON 检查和超时。
import { describe, expect, it, vi } from 'vitest';
import { executeSycmRequest } from '../../src/shared/page-request';

describe('executeSycmRequest', () => {
  it('在页面会话中携带登录状态并解析 JSON', async () => {
    const fakeFetch = vi.fn(async () =>
      new Response(JSON.stringify({ code: 0, data: [1] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );

    const result = await executeSycmRequest(
      { url: 'https://sycm.taobao.com/api/data', method: 'POST', body: '{}' },
      fakeFetch,
    );

    expect(result).toEqual({ code: 0, data: [1] });
    expect(fakeFetch).toHaveBeenCalledWith(
      'https://sycm.taobao.com/api/data',
      expect.objectContaining({ credentials: 'include', method: 'POST', body: '{}' }),
    );
  });

  it('拒绝请求生意参谋之外的网站', async () => {
    await expect(executeSycmRequest({ url: 'https://example.com/private' }, fetch)).rejects.toThrow(
      '插件只允许请求生意参谋接口。',
    );
  });

  it('把登录失效转换成明确提示', async () => {
    const fakeFetch = async () => new Response('{}', { status: 401 });
    await expect(executeSycmRequest({ url: 'https://sycm.taobao.com/api/data' }, fakeFetch)).rejects.toThrow(
      '登录状态已失效，请重新登录生意参谋。',
    );
  });

  it('使用当前页面临时缓存的登录参数发送采集请求', async () => {
    const fakeFetch = vi.fn(async () =>
      new Response(JSON.stringify({ code: 0 }), { status: 200, headers: { 'content-type': 'application/json' } }),
    );

    await executeSycmRequest(
      { url: 'https://sycm.taobao.com/cc/item/live/view/top.json?page=1' },
      fakeFetch,
      { token: 'page-token', bxUa: 'page-bx-ua', bxVersion: '2.5.36' },
    );

    expect(fakeFetch).toHaveBeenCalledWith(
      expect.stringContaining('token=page-token'),
      expect.objectContaining({ headers: { 'bx-ua': 'page-bx-ua', 'bx-v': '2.5.36' } }),
    );
  });
});
