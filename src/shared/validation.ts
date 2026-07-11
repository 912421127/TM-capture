// 在请求发出前校验经营概览的日期范围，避免无效参数触发页面请求。

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function validateDateRange(startDate: string, endDate: string): string[] {
  const errors: string[] = [];

  if (!DATE_PATTERN.test(startDate) || !DATE_PATTERN.test(endDate)) {
    errors.push('请选择完整的开始日期和结束日期。');
  } else if (endDate < startDate) {
    errors.push('结束日期不能早于开始日期。');
  }
  return errors;
}
