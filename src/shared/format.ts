import type { CellValue, TableColumn } from './capture';

export function formatCellValue(value: CellValue | undefined, format: TableColumn['format'] = 'text'): string {
  if (value == null || value === '') return '-';
  if (format === 'boolean') return value ? '是' : '否';
  if (format === 'percentage' && typeof value === 'number') return `${(value * 100).toFixed(2)}%`;
  if (format === 'currency' && typeof value === 'number') {
    return value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  if (format === 'number' && typeof value === 'number') return value.toLocaleString('zh-CN');
  return String(value);
}
