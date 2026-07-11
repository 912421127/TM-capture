// 将日期范围转换为生意参谋接口认可的快捷范围名称。
function toUtcDay(value: string): number {
  return Date.parse(`${value}T00:00:00Z`);
}

export function getRangeDateType(startDate: string, endDate: string, singleDayType: string): string {
  const days = Math.round((toUtcDay(endDate) - toUtcDay(startDate)) / 86_400_000) + 1;
  if (days === 1) return singleDayType;
  if (days === 7) return 'recent7';
  if (days === 30) return 'recent30';
  return 'custom';
}
