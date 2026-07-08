import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

function loadCsvModule() {
    const sourcePath = path.resolve('src/shared/csvExport.ts');
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
        Blob,
        URL,
        chrome: {
            downloads: {
                download() {},
            },
            runtime: {},
        },
        setTimeout,
    };
    context.exports = context.module.exports;
    vm.runInNewContext(compiled, context, { filename: sourcePath });
    return context.module.exports;
}

const { rowsToCsv } = loadCsvModule();

const csv = rowsToCsv([
    {
        商品名称: '夏季,短袖',
        备注: '他说"好"',
        换行内容: '第一行\n第二行',
        空值: null,
    },
]);

assert.equal(
    csv,
    '\ufeff商品名称,备注,换行内容,空值\r\n"夏季,短袖","他说""好""","第一行\n第二行",',
);

assert.equal(rowsToCsv([]), '\ufeff');
