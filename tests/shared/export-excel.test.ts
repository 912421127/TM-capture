// @vitest-environment node
// 验证 Excel Blob 可解压，并包含正确的工作表名、表头和数据。
import { describe, expect, it } from 'vitest';
import { strFromU8, unzipSync } from 'fflate';
import { createExcelBlob } from '../../src/shared/export';
import type { TableColumn } from '../../src/shared/capture';

describe('Excel export', () => {
  it('按固定中文列顺序生成工作簿', async () => {
    const columns: TableColumn[] = [
      { key: 'title', label: '商品名称' },
      { key: 'amount', label: '支付金额' },
    ];
    const blob = await createExcelBlob('本店商品排行', columns, [{ amount: 88.5, title: '测试商品' }]);
    const files = unzipSync(new Uint8Array(await blob.arrayBuffer()));
    const sheetXml = strFromU8(files['xl/worksheets/sheet1.xml']!);
    const sharedStringsXml = strFromU8(files['xl/sharedStrings.xml']!);

    expect(blob.type).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    expect(sharedStringsXml).toContain('商品名称');
    expect(sharedStringsXml.indexOf('商品名称')).toBeLessThan(sharedStringsXml.indexOf('支付金额'));
    expect(sharedStringsXml).toContain('测试商品');
    expect(sheetXml).toContain('<v>88.5</v>');
  });
});
