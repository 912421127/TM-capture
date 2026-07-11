// 验证经营概览日期格式和日期顺序的用户提示。
import { describe, expect, it } from 'vitest';
import { validateDateRange } from '../../src/shared/validation';

describe('validateDateRange', () => {
  it('接受完整的经营概览筛选条件', () => {
    expect(validateDateRange('2026-07-01', '2026-07-07')).toEqual([]);
  });

  it('拒绝结束日期早于开始日期', () => {
    expect(validateDateRange('2026-07-07', '2026-07-01')).toContain('结束日期不能早于开始日期。');
  });

  it('拒绝不完整日期', () => {
    expect(validateDateRange('', '2026-07-07')).toContain('请选择完整的开始日期和结束日期。');
  });
});
