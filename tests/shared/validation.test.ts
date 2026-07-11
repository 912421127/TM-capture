// 验证日期格式、日期顺序和市场类目筛选条件的用户提示。
import { describe, expect, it } from 'vitest';
import { validateFilters } from '../../src/shared/validation';

describe('validateFilters', () => {
  it('接受完整的经营概览筛选条件', () => {
    expect(
      validateFilters('business-overview', {
        startDate: '2026-07-01',
        endDate: '2026-07-07',
      }),
    ).toEqual([]);
  });

  it('拒绝结束日期早于开始日期', () => {
    expect(
      validateFilters('store-product-rank', {
        startDate: '2026-07-07',
        endDate: '2026-07-01',
        metric: 'payAmount',
      }),
    ).toContain('结束日期不能早于开始日期。');
  });

  it('要求市场排行选择类目', () => {
    expect(
      validateFilters('market-product-rank', {
        startDate: '2026-07-01',
        endDate: '2026-07-07',
        metric: 'visitorCount',
        categoryId: '',
        categoryName: '',
      }),
    ).toContain('请选择市场类目。');
  });
});
