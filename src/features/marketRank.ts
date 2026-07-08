export interface MarketRankRequest {
    startDate: string;
    endDate: string;
    cateId: string;
    token?: string;
    bxUa?: string;
    requestTime?: number;
    pageSize?: number;
    page?: number;
    rankType?: string;
}

interface SycmValue<T> {
    value?: T;
}

interface MarketRankItem {
    itemId?: string;
    title?: string;
    detailUrl?: string;
    pictUrl?: string;
    userId?: string;
    mallItem?: boolean;
}

interface MarketRankApiRow {
    item?: MarketRankItem;
    payByrCnt?: SycmValue<number>;
    uv?: SycmValue<number>;
    payAmt?: SycmValue<number>;
}

interface MarketRankApiResponse {
    code?: number;
    message?: string;
    data?: {
        data?: MarketRankApiRow[];
    };
}

export interface MarketRankCsvRow extends Record<string, unknown> {
    排名: number;
    商品编号: string;
    商品名称: string;
    商品链接: string;
    商品图片: string;
    卖家编号: string;
    是否天猫商品: string;
    支付买家数: number;
    访客数: number;
    支付金额: number;
}

function getNumberValue(field: SycmValue<number> | undefined) {
    if (typeof field?.value === 'number') {
        return field.value;
    }

    return 0;
}

export function buildMarketRankUrl(options: MarketRankRequest) {
    const params = new URLSearchParams();
    params.set('dateRange', `${options.startDate}|${options.endDate}`);
    params.set('dateType', 'recent7');
    params.set('pageSize', String(options.pageSize ?? 10));
    params.set('page', String(options.page ?? 1));
    params.set('cateId', options.cateId);
    params.set('rankType', options.rankType ?? 'gmv');
    params.set('minPrice', '');
    params.set('maxPrice', '');
    params.set('priceSeg', '');
    params.set('sellerType', '-1');
    params.set('keyWord', '');
    params.set('cateFlag', '0');
    params.set('indexCode', 'payByrCnt,uv');
    params.set('marketVersion', 'free');
    params.set('_', String(options.requestTime ?? Date.now()));
    params.set('token', options.token ?? 'ad6f69c24');

    return `https://sycm.taobao.com/mc/mq/mkt/item/offline/rank.json?${params.toString()}`;
}

export function parseMarketRankRows(response: MarketRankApiResponse): MarketRankCsvRow[] {
    if (response.code !== undefined && response.code !== 0 && response.code !== 200) {
        throw new Error(response.message || '市场排行接口返回失败，请确认已登录生意参谋后再试。');
    }

    const rows = response.data?.data ?? [];

    return rows.map((row, index) => {
        const item = row.item ?? {};

        // 市场排行接口直接返回 JSON，这里只整理导出需要的字段，避免把接口内部结构暴露给用户。
        return {
            排名: index + 1,
            商品编号: item.itemId ?? '',
            商品名称: item.title ?? '',
            商品链接: item.detailUrl ?? '',
            商品图片: item.pictUrl ?? '',
            卖家编号: item.userId ?? '',
            是否天猫商品: item.mallItem ? '是' : '否',
            支付买家数: getNumberValue(row.payByrCnt),
            访客数: getNumberValue(row.uv),
            支付金额: getNumberValue(row.payAmt),
        };
    });
}

export async function fetchMarketRankRows(options: MarketRankRequest) {
    const headers: Record<string, string> = {
        accept: '*/*',
        'accept-language': 'zh-CN,zh;q=0.9',
        'bx-v': '2.5.36',
        'sycm-referer': '/mc/free/market_rank',
    };

    if (options.bxUa) {
        // bx-ua 是生意参谋页面生成的风控参数，测试时从浏览器请求里复制进来，避免写死过期值。
        headers['bx-ua'] = options.bxUa;
    }

    const response = await fetch(buildMarketRankUrl(options), {
        headers,
        referrer: 'https://sycm.taobao.com/mc/free/market_rank',
        body: null,
        method: 'GET',
        mode: 'cors',
        credentials: 'include',
    });

    if (!response.ok) {
        throw new Error(`市场排行接口请求失败，状态码：${response.status}`);
    }

    const data = (await response.json()) as MarketRankApiResponse;
    return parseMarketRankRows(data);
}
