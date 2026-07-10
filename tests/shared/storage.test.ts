import { beforeEach, describe, expect, it } from 'vitest';
import { browser } from 'wxt/browser';
import {
  clearLatestCapture,
  initializeStorage,
  loadFilters,
  loadLatestCapture,
  saveFilters,
  saveLatestCapture,
} from '../../src/shared/storage';
import type { LatestCapture } from '../../src/shared/capture';

const capture: LatestCapture<'business-overview'> = {
  schemaVersion: 1,
  featureId: 'business-overview',
  filters: { startDate: '2026-07-01', endDate: '2026-07-02' },
  capturedAt: '2026-07-10T08:00:00.000Z',
  summary: { 支付金额: 1200 },
  rows: [
    {
      date: '2026-07-01',
      visitorCount: 100,
      pageViewCount: 300,
      buyerCount: 12,
      payAmount: 1200,
      conversionRate: 0.12,
    },
  ],
};

describe('capture storage', () => {
  beforeEach(async () => {
    await browser.storage.local.clear();
  });

  it('首次初始化时清理旧键并写入版本', async () => {
    await browser.storage.local.set({ last_response: { old: true }, _captured: true });

    await initializeStorage();

    expect(await browser.storage.local.get(['last_response', '_captured', 'tm_capture_schema_version'])).toEqual({
      tm_capture_schema_version: 1,
    });
  });

  it('按模块保存、读取和清空最后一次成功结果', async () => {
    await saveLatestCapture(capture);
    expect(await loadLatestCapture('business-overview')).toEqual(capture);

    await clearLatestCapture('business-overview');
    expect(await loadLatestCapture('business-overview')).toBeNull();
  });

  it('按模块保存最后使用的筛选条件', async () => {
    await saveFilters('business-overview', capture.filters);
    expect(await loadFilters('business-overview')).toEqual(capture.filters);
  });
});
