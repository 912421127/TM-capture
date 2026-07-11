// 验证数字、金额、百分比、布尔值和空值的中文展示格式。
import { describe, expect, it } from 'vitest';
import { formatCellValue } from '../../src/shared/format';

describe('formatCellValue', () => {
  it('格式化金额、百分比和布尔值', () => {
    expect(formatCellValue(1234.5, 'currency')).toBe('1,234.50');
    expect(formatCellValue(0.1234, 'percentage')).toBe('12.34%');
    expect(formatCellValue(true, 'boolean')).toBe('是');
    expect(formatCellValue(false, 'boolean')).toBe('否');
  });

  it('空值显示短横线', () => {
    expect(formatCellValue(null)).toBe('-');
  });
});
