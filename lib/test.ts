import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
class 生意参谋商品排行页面 {
    static async 下载(date: dayjs.Dayjs) {
        const startDate = date.format('YYYY-MM-DD');
        const endDate = date.format('YYYY-MM-DD');
        const 下载数据流 = await fetch(
            `https://sycm.taobao.com/cc/item/view/excel/top.json?dateRange=${startDate}%7C${endDate}&dateType=day&pageSize=10&page=1&order=desc&orderBy=payAmt&dtUpdateTime=false&dtMaxAge=0&device=0&compareType=cycle&keyword=&follow=false&cateId=&cateLevel=&indexCode=payAmt%2CsucRefundAmt%2CpayItmCnt%2CitemCartCnt%2CitmUv`,
            {
                headers: {
                    accept: '*/*',
                    'accept-language': 'zh-CN,zh;q=0.9',
                    'bx-v': '2.5.28',
                    'cache-control': 'no-cache',
                    pragma: 'no-cache',
                    priority: 'u=1, i',
                    'sec-ch-ua': '"Google Chrome";v="135", "Not-A.Brand";v="8", "Chromium";v="135"',
                    'sec-ch-ua-mobile': '?0',
                    'sec-ch-ua-platform': '"Windows"',
                    'sec-fetch-dest': 'empty',
                    'sec-fetch-mode': 'cors',
                    'sec-fetch-site': 'same-origin'
                },
                referrer: 'https://sycm.taobao.com/cc/item_rank?dateRange=2025-04-09%7C2025-04-15&dateType=recent7',
                referrerPolicy: 'strict-origin-when-cross-origin',
                body: null,
                method: 'GET',
                mode: 'cors',
                credentials: 'include'
            }
        );

        const arrayBuffer = await 下载数据流.arrayBuffer();

        // 转换为Uint8Array
        const data = new Uint8Array(arrayBuffer);

        // 读取Excel文件
        const workbook = XLSX.read(data, { type: 'array' });

        // 处理数据（同上）
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        const headerRow = rawData[4] as string[]; // 第5行（索引从0开始）

        // 5. 提取数据（从第六行开始）
        const dataRows = rawData.slice(5);

        // 6. 转换为对象数组（列名映射）
        const result = dataRows.map(row => {
            const row2 = row as string[];
            const obj: Record<string, any> = {};
            headerRow.forEach((key, index) => {
                obj[key] = row2[index] || null; // 处理空单元格
            });
            return obj;
        });

        const 单元格转换 = (数值: string, type: 'int' | 'float' = 'float') => {
            if (数值 === undefined) {
                return 0;
            }
            数值 = 数值.replace(/,/g, '');
            if (数值 == '-') {
                return 0;
            }
            // 转化百分数
            if (数值.includes('%')) {
                return Number(数值.replace('%', '')) / 100;
            }

            if (type == 'float') {
                return Number(数值);
            }

            return Math.round(Number(数值));
        };

        return result.map(i => {
            return {
                日期: i.统计日期,
                商品编号: i.商品ID,
                商品访客数: 单元格转换(i.商品访客数, 'int'),
                商品浏览量: 单元格转换(i.商品浏览量, 'int'),
                平均停留时长: 单元格转换(i.平均停留时长),
                商品详情页跳出率: 单元格转换(i.商品详情页跳出率),
                商品收藏人数: 单元格转换(i.商品收藏人数, 'int'),
                商品加购件数: 单元格转换(i.商品加购件数, 'int'),
                商品加购人数: 单元格转换(i.商品加购人数, 'int'),
                下单买家数: 单元格转换(i.下单买家数, 'int'),
                下单件数: 单元格转换(i.下单件数, 'int'),
                下单金额: 单元格转换(i.下单金额),
                支付买家数: 单元格转换(i.支付买家数, 'int'),
                支付件数: 单元格转换(i.支付件数, 'int'),
                总支付商品件数: 单元格转换(i.总支付商品件数, 'int'),
                支付金额: 单元格转换(i.支付金额),
                总支付金额: 单元格转换(i.总支付金额),
                支付新买家数: 单元格转换(i.支付新买家数, 'int'),
                支付老买家数: 单元格转换(i.支付老买家数, 'int'),
                老买家支付金额: 单元格转换(i.老买家支付金额),
                聚划算支付金额: 单元格转换(i.聚划算支付金额),
                访客平均价值: 单元格转换(i.访客平均价值),
                成功退款金额: 单元格转换(i.成功退款金额),
                竞争力评分: 单元格转换(i.竞争力评分),
                搜索引导支付转化率: 单元格转换(i.搜索引导支付转化率),
                搜索引导访客数: 单元格转换(i.搜索引导访客数, 'int'),
                搜索引导支付买家数: 单元格转换(i.搜索引导支付买家数, 'int'),
                结构化详情引导转化率: 单元格转换(i.结构化详情引导转化率),
                结构化详情引导成交占比: 单元格转换(i.结构化详情引导成交占比)
            };
        });
    }
}

interface 商品排行数据 {
    traceId: string;
    code: number;
    data: Data;
    onecache: boolean;
    spend: string;
    message: string;
}

interface Data {
    data: Datum[];
    recordCount: number;
}

interface Datum {
    mainProductId: MainProductId;
    seGuideUv: SeGuideUv;
    payOldByrCnt: PayOldByrCnt;
    sellerId: MainProductId;
    uvAvgValue: SeGuideUv;
    payItmCnt: SeGuideUv;
    itmUv: SeGuideUv;
    statDate: StatDate;
    seGuidePayByrCnt: SeGuidePayByrCnt;
    item: Item;
    juPayAmt: JuPayAmt;
    payByrCnt: SeGuideUv;
    payRate: SeGuideUv;
    hasSku: boolean;
    itemCartByrCnt: SeGuideUv;
    isTmallNewItem: boolean;
    payAmt: PayAmt;
    itemCartCnt: SeGuideUv;
    mtdPayItmCnt: SeGuideUv;
    itemId: MainProductId;
    payPct: SeGuideUv;
    cateLevel2Id: StatDate;
    subPayOrdAmt: PayAmt;
    itmPv: SeGuideUv;
    cateId: StatDate;
    brandId: StatDate;
    visitCltRate: VisitCltRate;
    crtByrCnt: SeGuideUv;
    newPayByrCnt: SeGuideUv;
    crtAmt: SeGuideUv;
    crtItmQty: SeGuideUv;
    mtdPayAmt: PayAmt;
    hasAction: boolean;
    rfdSucGoodsAmt: PayOldByrCnt;
    itemCltByrCnt: PayOldByrCnt;
    visitCartRate: VisitCartRate;
    itemStatus: string;
    isMonitored: boolean;
    olderPayAmt: VisitCltRate;
    isSubItem: MainProductId;
    seGuidePayRate: SeGuidePayByrCnt;
    hasCrowd: HasCrowd;
    itmStayTime: VisitCartRate;
    stayTimeAvg: VisitCartRate;
    ytdPayAmt: PayAmt;
    sucRefundAmt: PayOldByrCnt;
    cateLevel1Id: StatDate;
    itmBounceRate: SeGuideUv;
    subPayOrdItmQty: SeGuideUv;
    crtRate: SeGuideUv;
    itemTag?: string;
}

interface HasCrowd {
    value: boolean;
}

interface VisitCartRate {
    cycleCrc: number;
    syncCrc: number;
    value: Value;
}

interface VisitCltRate {
    cycleCrc?: number;
    syncCrc?: number;
    value: Value | number;
}

interface PayAmt {
    cycleCrc: number;
    syncCrc: number;
    value: number;
}

interface Value {
    s: number;
    e: number;
    c: number[];
}

interface JuPayAmt {
    value: number;
    syncCrc?: number;
}

interface Item {
    itemId: string;
    mainProductId: string;
    online: boolean;
    pictUrl: string;
    mallItem: boolean;
    detailUrl: string;
    title: string;
    userId: string;
    categoryId: number;
    mainSubItemType: string;
    itemNO?: string;
}

interface SeGuidePayByrCnt {
    cycleCrc?: number;
    syncCrc: number;
    value: number;
}

interface StatDate {
    value: number;
}

interface PayOldByrCnt {
    syncCrc?: number;
    value: number;
    cycleCrc?: number;
}

interface SeGuideUv {
    cycleCrc: number;
    syncCrc: number;
    value: number;
}

interface MainProductId {
    value: string;
}

export { 生意参谋商品排行页面 as 生意参谋商品排行页面 };
