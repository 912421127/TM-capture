import { describe, expect, it, vi } from 'vitest';
import * as XLSX from 'xlsx';
import { buildExportFileName, createExcelBuffer, downloadBlob, rowsToCsv } from '../../src/shared/export';
import type { TableColumn } from '../../src/shared/capture';

const columns: TableColumn[] = [
  { key: 'title', label: '商品名称' },
  { key: 'amount', label: '支付金额' },
];

describe('export helpers', () => {
  it('生成带 BOM 且正确转义的 CSV', () => {
    expect(rowsToCsv(columns, [{ title: '夏季,短袖', amount: '他说"好"' }])).toBe(
      '\ufeff商品名称,支付金额\r\n"夏季,短袖","他说""好"""',
    );
  });

  it('生成包含模块、日期和时间的中文文件名', () => {
    expect(
      buildExportFileName('经营概览', '2026-07-01', '2026-07-07', new Date('2026-07-10T08:09:10+08:00'), 'xlsx'),
    ).toBe('经营概览_2026-07-01_至_2026-07-07_20260710_080910.xlsx');
  });

  it('按固定中文列顺序生成 Excel', () => {
    const buffer = createExcelBuffer('本店商品排行', columns, [{ amount: 88.5, title: '测试商品' }]);
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheet = workbook.Sheets['本店商品排行'];
    expect(sheet).toBeDefined();
    expect(XLSX.utils.sheet_to_json(sheet!, { header: 1 })).toEqual([
      ['商品名称', '支付金额'],
      ['测试商品', 88.5],
    ]);
  });

  it('通过临时链接下载文件并释放对象地址', () => {
    const createObjectURL = vi.fn(() => 'blob:test');
    const revokeObjectURL = vi.fn();
    Object.defineProperties(URL, {
      createObjectURL: { configurable: true, value: createObjectURL },
      revokeObjectURL: { configurable: true, value: revokeObjectURL },
    });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

    downloadBlob('内容', 'text/plain', '测试.txt');

    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(click).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:test');
  });
});
