// 验证分页聚合、进度通知、提前结束和异常页数保护。
import { describe, expect, it, vi } from 'vitest';
import { collectPages } from '../../src/shared/pagination';

describe('collectPages', () => {
  it('按页合并结果并报告进度', async () => {
    const progress = vi.fn();
    const rows = await collectPages({
      loadPage: async (page) => ({ rows: [page], hasNext: page < 3, totalPages: 3 }),
      onProgress: progress,
    });

    expect(rows).toEqual([1, 2, 3]);
    expect(progress).toHaveBeenLastCalledWith({ currentPage: 3, totalPages: 3, message: '已采集 3 / 3 页' });
  });

  it('超过一百页时停止，避免接口异常导致无限请求', async () => {
    await expect(
      collectPages({
        loadPage: async (page) => ({ rows: [page], hasNext: true }),
        onProgress: () => undefined,
      }),
    ).rejects.toThrow('采集页数超过 100 页，已停止以避免重复请求。');
  });
});
