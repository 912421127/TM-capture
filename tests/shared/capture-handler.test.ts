// 验证后台采集处理器的标签页检查、模块查找、进度广播和错误返回。
import { describe, expect, it, vi } from 'vitest';
import { createCaptureHandler } from '../../src/shared/capture-handler';
import type { CaptureFeature, CaptureRequest, LatestCapture, SycmTransport } from '../../src/shared/capture';
import { createFeatureRegistry } from '../../src/features/registry';

const request: CaptureRequest<'business-overview'> = {
  type: 'CAPTURE_START',
  requestId: 'request-1',
  featureId: 'business-overview',
  filters: { startDate: '2026-07-01', endDate: '2026-07-02' },
};

const transport: SycmTransport = { request: async <T>() => ({} as T) };

describe('capture handler', () => {
  it('找不到生意参谋页面时返回中文错误', async () => {
    const handler = createCaptureHandler({
      registry: createFeatureRegistry([]),
      getTabId: async () => null,
      createTransport: () => transport,
      save: async () => undefined,
      broadcast: async () => undefined,
    });

    await expect(handler(request)).resolves.toEqual({
      type: 'CAPTURE_FAILURE',
      requestId: 'request-1',
      error: '请先打开并登录生意参谋。',
    });
  });

  it('未取得真实接口样本时不执行猜测请求', async () => {
    const handler = createCaptureHandler({
      registry: createFeatureRegistry([]),
      getTabId: async () => 5,
      createTransport: () => transport,
      save: async () => undefined,
      broadcast: async () => undefined,
    });

    await expect(handler(request)).resolves.toEqual({
      type: 'CAPTURE_FAILURE',
      requestId: 'request-1',
      error: '经营概览接口尚未完成诊断，请先使用诊断构建采集真实样本。',
    });
  });

  it('运行适配器、保存结果并广播进度', async () => {
    const feature: CaptureFeature<'business-overview'> = {
      id: 'business-overview',
      label: '经营概览',
      columns: [],
      collect: async (_filters, _transport, onProgress) => {
        onProgress({ currentPage: 1, totalPages: 1, message: '已采集 1 / 1 页' });
        return { summary: {}, rows: [] };
      },
    };
    const save = vi.fn<(capture: LatestCapture) => Promise<void>>(async () => undefined);
    const broadcast = vi.fn(async () => undefined);
    const handler = createCaptureHandler({
      registry: createFeatureRegistry([feature]),
      getTabId: async () => 5,
      createTransport: () => transport,
      save,
      broadcast,
      now: () => new Date('2026-07-10T08:00:00.000Z'),
    });

    const response = await handler(request);
    expect(response.type).toBe('CAPTURE_SUCCESS');
    expect(save).toHaveBeenCalledOnce();
    expect(broadcast).toHaveBeenCalledWith({
      type: 'CAPTURE_PROGRESS',
      requestId: 'request-1',
      currentPage: 1,
      totalPages: 1,
      message: '已采集 1 / 1 页',
    });
  });
});
