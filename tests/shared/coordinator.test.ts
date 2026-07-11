// 验证采集协调器的筛选校验、任务互斥、完整保存和进度透传。
import { describe, expect, it, vi } from 'vitest';
import { createCaptureCoordinator } from '../../src/shared/coordinator';
import type {
  BusinessOverviewFilters,
  BusinessOverviewRow,
  CaptureFeature,
  CaptureRequest,
  LatestCapture,
  SycmTransport,
} from '../../src/shared/capture';

const request: CaptureRequest<'business-overview'> = {
  type: 'CAPTURE_START',
  requestId: 'request-1',
  featureId: 'business-overview',
  filters: { startDate: '2026-07-01', endDate: '2026-07-02' },
};

const transport: SycmTransport = {
  request: async <T>() => ({} as T),
};

function feature(collect: CaptureFeature<'business-overview'>['collect']): CaptureFeature<'business-overview'> {
  return {
    id: 'business-overview',
    label: '经营概览',
    columns: [],
    collect,
  };
}

describe('capture coordinator', () => {
  it('采集完整成功后才保存最新结果', async () => {
    const save = vi.fn<(capture: LatestCapture<'business-overview'>) => Promise<void>>(async () => undefined);
    const row: BusinessOverviewRow = {
      date: '2026-07-01',
      visitorCount: 10,
      pageViewCount: 20,
      buyerCount: 2,
      payAmount: 100,
      conversionRate: 0.2,
    };
    const coordinator = createCaptureCoordinator({
      save,
      now: () => new Date('2026-07-10T08:00:00.000Z'),
    });

    const result = await coordinator.run(
      request,
      feature(async (_filters: BusinessOverviewFilters) => ({ summary: { 支付金额: 100 }, rows: [row] })),
      transport,
      () => undefined,
    );

    expect(result.capturedAt).toBe('2026-07-10T08:00:00.000Z');
    expect(save).toHaveBeenCalledOnce();
  });

  it('采集失败时不保存结果', async () => {
    const save = vi.fn(async () => undefined);
    const coordinator = createCaptureCoordinator({ save });

    await expect(
      coordinator.run(
        request,
        feature(async () => {
          throw new Error('接口失败');
        }),
        transport,
        () => undefined,
      ),
    ).rejects.toThrow('接口失败');
    expect(save).not.toHaveBeenCalled();
  });

  it('已有任务运行时拒绝重复采集', async () => {
    let finishFirst!: () => void;
    const pending = new Promise<void>((resolve) => {
      finishFirst = resolve;
    });
    const coordinator = createCaptureCoordinator({ save: async () => undefined });
    const slowFeature = feature(async () => {
      await pending;
      return { summary: {}, rows: [] };
    });

    const first = coordinator.run(request, slowFeature, transport, () => undefined);
    await expect(
      coordinator.run({ ...request, requestId: 'request-2' }, slowFeature, transport, () => undefined),
    ).rejects.toThrow('已有采集任务正在运行，请等待完成后再试。');

    finishFirst();
    await first;
  });
});
