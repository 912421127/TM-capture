// 验证三个模块的展示定义和默认日期筛选条件。
import { describe, expect, it } from 'vitest';
import { createDefaultFilters, featureDefinitions } from '../../src/features/definitions';

describe('feature definitions', () => {
  it('提供三个固定业务模块', () => {
    expect(featureDefinitions.map((feature) => feature.id)).toEqual([
      'business-overview',
      'store-product-rank',
      'market-product-rank',
    ]);
  });

  it('默认使用截至昨天的最近七个完整自然日', () => {
    expect(createDefaultFilters('business-overview', new Date('2026-07-10T12:00:00+08:00'))).toEqual({
      startDate: '2026-07-03',
      endDate: '2026-07-09',
    });
  });

  it('市场排行默认不伪造类目编号', () => {
    expect(createDefaultFilters('market-product-rank', new Date('2026-07-10T12:00:00+08:00'))).toEqual({
      startDate: '2026-07-03',
      endDate: '2026-07-09',
      metric: 'payAmount',
      categoryId: '',
      categoryName: '',
    });
  });
});
