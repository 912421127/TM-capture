import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import * as XLSX from 'xlsx';

function loadCaptureModule() {
    const sourcePath = path.resolve('src/features/sycmCapture.ts');
    const source = fs.readFileSync(sourcePath, 'utf8');
    const compiled = ts.transpileModule(source, {
        compilerOptions: {
            module: ts.ModuleKind.CommonJS,
            target: ts.ScriptTarget.ES2020,
        },
    }).outputText;

    const context = {
        exports: {},
        module: { exports: {} },
        URL,
        require: createRequire(import.meta.url),
    };
    context.exports = context.module.exports;
    vm.runInNewContext(compiled, context, { filename: sourcePath });
    return context.module.exports;
}

const { createCaptureFailure, createCaptureSuccess, getCaptureSource, normalizeSycmUrl, parseExcelRows } = loadCaptureModule();

assert.equal(
    normalizeSycmUrl('/cc/item/view/top.json?dateRange=2026-07-01%7C2026-07-01'),
    'https://sycm.taobao.com/cc/item/view/top.json?dateRange=2026-07-01%7C2026-07-01',
);
assert.equal(
    normalizeSycmUrl({ url: 'https://sycm.taobao.com/cc/item/view/excel/top.json?page=1' }),
    'https://sycm.taobao.com/cc/item/view/excel/top.json?page=1',
);
assert.equal(normalizeSycmUrl('https://sycm.taobao.com/cc/item/view/other.json'), null);
assert.equal(normalizeSycmUrl('https://example.com/cc/item/view/top.json'), null);

const jsonUrl = 'https://sycm.taobao.com/cc/item/view/top.json?page=1';
const excelUrl = 'https://sycm.taobao.com/cc/item/view/excel/top.json?page=1';
assert.equal(getCaptureSource(jsonUrl), 'page-json');
assert.equal(getCaptureSource(excelUrl), 'export-excel');

assert.deepEqual(
    JSON.parse(JSON.stringify(createCaptureSuccess('page-json', jsonUrl, 200, { code: 0 }))),
    {
        status: 'success',
        source: 'page-json',
        url: jsonUrl,
        httpStatus: 200,
        data: { code: 0 },
    },
);

const workbook = XLSX.utils.book_new();
const worksheet = XLSX.utils.aoa_to_sheet([
    ['说明'],
    [],
    [],
    [],
    ['商品ID', '支付金额'],
    ['123', 88.5],
]);
XLSX.utils.book_append_sheet(workbook, worksheet, '商品排行');
const excelData = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
assert.deepEqual(
    JSON.parse(JSON.stringify(parseExcelRows(excelData))),
    [{ 商品ID: '123', 支付金额: 88.5 }],
);
assert.deepEqual(
    JSON.parse(JSON.stringify(createCaptureFailure('export-excel', excelUrl, 500, '导出文件解析失败'))),
    {
        status: 'error',
        source: 'export-excel',
        url: excelUrl,
        httpStatus: 500,
        error: '导出文件解析失败',
    },
);
