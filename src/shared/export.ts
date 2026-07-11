// 提供 CSV、Excel 和浏览器下载能力，所有格式都复用同一份列定义与行数据。
import writeXlsxFile, { type SheetData } from 'write-excel-file/browser';
import type { TableColumn, TableRow } from './capture';

function escapeCsvCell(value: unknown): string {
  const text = value == null ? '' : String(value);
  if (!/[",\r\n]/.test(text)) return text;
  return `"${text.replaceAll('"', '""')}"`;
}

export function rowsToCsv(columns: TableColumn[], rows: TableRow[]): string {
  // 加 BOM 让 Excel 按中文编码打开 CSV，字段内容再按 RFC 风格转义逗号和换行。
  const header = columns.map((column) => escapeCsvCell(column.label)).join(',');
  const lines = rows.map((row) => columns.map((column) => escapeCsvCell(row[column.key])).join(','));
  return `\ufeff${[header, ...lines].join('\r\n')}`;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

export function buildExportFileName(
  featureLabel: string,
  startDate: string,
  endDate: string,
  exportedAt: Date,
  extension: 'xlsx' | 'csv',
): string {
  const date = `${exportedAt.getFullYear()}${pad(exportedAt.getMonth() + 1)}${pad(exportedAt.getDate())}`;
  const time = `${pad(exportedAt.getHours())}${pad(exportedAt.getMinutes())}${pad(exportedAt.getSeconds())}`;
  return `${featureLabel}_${startDate}_至_${endDate}_${date}_${time}.${extension}`;
}

export async function createExcelBlob(sheetName: string, columns: TableColumn[], rows: TableRow[]): Promise<Blob> {
  // Excel 工作表名最多 31 个字符，截断只影响显示名称，不影响导出内容。
  const sheetData: SheetData = [
    columns.map((column) => ({ value: column.label, fontWeight: 'bold' })),
    ...rows.map((row) => columns.map((column) => row[column.key] ?? '')),
  ];
  return writeXlsxFile(sheetData, { sheet: sheetName.slice(0, 31) }).toBlob();
}

export function downloadBlob(data: BlobPart, type: string, fileName: string): void {
  // 通过临时对象 URL 触发浏览器下载，完成后立即释放 URL 避免内存泄漏。
  const url = URL.createObjectURL(new Blob([data], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
