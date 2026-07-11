// 验证日期范围会映射到单日、近 7 天、近 30 天或自定义类型。
import { describe, expect, it } from 'vitest';
import { getRangeDateType } from '../../src/shared/date-range';

describe('getRangeDateType', () => {
  it('识别单日、最近七日、最近三十日和自定义范围', () => {
    expect(getRangeDateType('2026-07-09', '2026-07-09', 'day')).toBe('day');
    expect(getRangeDateType('2026-07-03', '2026-07-09', 'today')).toBe('recent7');
    expect(getRangeDateType('2026-06-10', '2026-07-09', 'today')).toBe('recent30');
    expect(getRangeDateType('2026-07-01', '2026-07-09', 'today')).toBe('custom');
  });
});
