import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

function loadMarketRankModule(fakeFetch = fetch) {
    const sourcePath = path.resolve('src/features/marketRank.ts');
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
        URLSearchParams,
        fetch: fakeFetch,
    };
    context.exports = context.module.exports;
    vm.runInNewContext(compiled, context, { filename: sourcePath });
    return context.module.exports;
}

const { buildMarketRankUrl, fetchMarketRankRows, parseMarketRankRows } = loadMarketRankModule();

const url = buildMarketRankUrl({
    startDate: '2026-06-30',
    endDate: '2026-07-06',
    cateId: '2908',
    requestTime: 1783393922546,
    token: 'ad6f69c24',
});

assert.equal(
    url,
    'https://sycm.taobao.com/mc/mq/mkt/item/offline/rank.json?dateRange=2026-06-30%7C2026-07-06&dateType=recent7&pageSize=10&page=1&cateId=2908&rankType=gmv&minPrice=&maxPrice=&priceSeg=&sellerType=-1&keyWord=&cateFlag=0&indexCode=payByrCnt%2Cuv&marketVersion=free&_=1783393922546&token=ad6f69c24',
);

const rows = parseMarketRankRows({
    code: 0,
    data: {
        data: [
            {
                item: {
                    itemId: '123',
                    title: '测试商品',
                    detailUrl: 'https://item.taobao.com/item.htm?id=123',
                    pictUrl: 'https://img.example.com/1.jpg',
                    userId: 'seller-1',
                    mallItem: true,
                },
                payByrCnt: { value: 88 },
                uv: { value: 999 },
                payAmt: { value: 1234.56 },
            },
        ],
    },
});

assert.deepEqual(JSON.parse(JSON.stringify(rows)), [
    {
        排名: 1,
        商品编号: '123',
        商品名称: '测试商品',
        商品链接: 'https://item.taobao.com/item.htm?id=123',
        商品图片: 'https://img.example.com/1.jpg',
        卖家编号: 'seller-1',
        是否天猫商品: '是',
        支付买家数: 88,
        访客数: 999,
        支付金额: 1234.56,
    },
]);

let capturedFetchUrl = '';
let capturedFetchOptions = {};
const marketRankWithFakeFetch = loadMarketRankModule(async (requestUrl, requestOptions) => {
    capturedFetchUrl = requestUrl;
    capturedFetchOptions = requestOptions;

    return {
        ok: true,
        json: async () => ({
            code: 0,
            data: {
                data: [
                    {
                        item: { itemId: '456', title: '另一个商品' },
                        payByrCnt: { value: 12 },
                        uv: { value: 34 },
                    },
                ],
            },
        }),
    };
});

const fetchedRows = await marketRankWithFakeFetch.fetchMarketRankRows({
    startDate: '2026-06-30',
    endDate: '2026-07-06',
    cateId: '2908',
    requestTime: 1783393922546,
    token: 'ad6f69c24',
    bxUa: 'test-bx-ua',
});

assert.equal(capturedFetchUrl, url);
assert.equal(capturedFetchOptions.credentials, 'include');
assert.equal(capturedFetchOptions.headers['sycm-referer'], '/mc/free/market_rank');
assert.equal(capturedFetchOptions.headers['bx-ua'], 'test-bx-ua');
assert.deepEqual(JSON.parse(JSON.stringify(fetchedRows)), [
    {
        排名: 1,
        商品编号: '456',
        商品名称: '另一个商品',
        商品链接: '',
        商品图片: '',
        卖家编号: '',
        是否天猫商品: '否',
        支付买家数: 12,
        访客数: 34,
        支付金额: 0,
    },
]);
