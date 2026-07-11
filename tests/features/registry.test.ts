// 验证采集模块注册表能够按 FeatureId 返回对应适配器。
import { describe, expect, it } from 'vitest';
import { createFeatureRegistry } from '../../src/features/registry';
import type { CaptureFeature } from '../../src/shared/capture';

const businessOverview: CaptureFeature<'business-overview'> = {
  id: 'business-overview',
  label: '经营概览',
  columns: [],
  collect: async () => ({ summary: {}, rows: [] }),
};

describe('feature registry', () => {
  it('按模块编号返回已注册适配器', () => {
    const registry = createFeatureRegistry([businessOverview]);
    expect(registry.get('business-overview')).toBe(businessOverview);
  });

  it('未完成接口诊断的模块返回空', () => {
    const registry = createFeatureRegistry([]);
    expect(registry.get('market-product-rank')).toBeUndefined();
  });
});
