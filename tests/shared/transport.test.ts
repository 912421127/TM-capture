import { describe, expect, it, vi } from 'vitest';
import { createTabTransport } from '../../src/shared/transport';

describe('createTabTransport', () => {
  it('把请求发送到指定标签页并返回数据', async () => {
    const sendMessage = vi.fn(async () => ({ ok: true as const, data: { code: 0 } }));
    const transport = createTabTransport(42, sendMessage);

    await expect(transport.request({ url: 'https://sycm.taobao.com/api/data' })).resolves.toEqual({ code: 0 });
    expect(sendMessage).toHaveBeenCalledWith(42, {
      type: 'SYCM_PAGE_REQUEST',
      request: { url: 'https://sycm.taobao.com/api/data' },
    });
  });

  it('把页面桥接错误继续抛给采集模块', async () => {
    const transport = createTabTransport(42, async () => ({ ok: false as const, error: '页面请求失败' }));
    await expect(transport.request({ url: 'https://sycm.taobao.com/api/data' })).rejects.toThrow('页面请求失败');
  });
});
