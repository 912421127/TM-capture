import { featureDefinitions } from './definitions';
import type { CaptureFeature, FeatureCollectResult, MarketProductRankRow, SycmTransport } from '../shared/capture';
import { getRangeDateType } from '../shared/date-range';
import { collectPages } from '../shared/pagination';
import { readMetric, readObject, unwrapSycmResponse } from '../shared/sycm-response';

const PAGE_SIZE = 10;
const columns = featureDefinitions.find((feature) => feature.id === 'market-product-rank')!.columns;
const rankTypeMap = { payAmount: 'gmv', visitorCount: 'uv', buyerCount: 'payByrCnt' } as const;

function toAbsoluteUrl(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.startsWith('//') ? `https:${value.replaceAll('&amp;', '&')}` : value.replaceAll('&amp;', '&');
}

export interface MarketCategory {
  value: string;
  label: string;
}

export async function loadMarketCategories(transport: SycmTransport): Promise<MarketCategory[]> {
  const data = unwrapSycmResponse(await transport.request({ url: 'https://sycm.taobao.com/mc/common/free/getCateInfo.json?marketVersion=free' }));
  if (!Array.isArray(data)) return [];
  return data
    .filter((item): item is unknown[] => Array.isArray(item) && item[5] === 'Y')
    .map((item) => ({ value: String(item[1] ?? ''), label: String(item[2] ?? '') }))
    .filter((item) => item.value && item.label);
}

export const marketProductRankFeature: CaptureFeature<'market-product-rank'> = {
  id: 'market-product-rank',
  label: '市场商品排行',
  columns,
  async collect(filters, transport, onProgress): Promise<FeatureCollectResult<'market-product-rank'>> {
    const rows = await collectPages<MarketProductRankRow>({
      onProgress,
      loadPage: async (page) => {
        const query = new URLSearchParams({
          dateRange: `${filters.startDate}|${filters.endDate}`,
          dateType: getRangeDateType(filters.startDate, filters.endDate, 'day'),
          pageSize: String(PAGE_SIZE),
          page: String(page),
          cateId: filters.categoryId,
          rankType: rankTypeMap[filters.metric],
          minPrice: '',
          maxPrice: '',
          priceSeg: '',
          sellerType: '-1',
          keyWord: '',
          cateFlag: '0',
          indexCode: 'payAmt,payByrCnt,uv',
          marketVersion: 'free',
        });
        const data = readObject(unwrapSycmResponse(await transport.request({
          url: `https://sycm.taobao.com/mc/mq/mkt/item/offline/rank.json?${query}`,
          headers: { 'sycm-referer': '/mc/free/market_rank' },
        })));
        const items = Array.isArray(data.data) ? data.data : [];
        const recordCount = Number(data.recordCount ?? 0);
        return {
          rows: items.map((source, index): MarketProductRankRow => {
            const item = readObject(readObject(source).item);
            const shop = readObject(readObject(source).shop);
            return {
              rank: Number(readMetric(source, 'cateRankId') ?? (page - 1) * PAGE_SIZE + index + 1),
              itemId: String(readMetric(source, 'itemId') ?? item.itemId ?? ''),
              title: String(item.title ?? ''),
              itemUrl: toAbsoluteUrl(item.detailUrl),
              imageUrl: toAbsoluteUrl(item.pictUrl),
              sellerId: String(item.userId ?? ''),
              isTmall: Boolean(shop.b2CShop),
              visitorCount: readMetric(source, 'uv'),
              buyerCount: readMetric(source, 'payByrCnt'),
              payAmount: readMetric(source, 'payAmt'),
            };
          }),
          hasNext: page * PAGE_SIZE < recordCount,
          totalPages: Math.ceil(recordCount / PAGE_SIZE),
        };
      },
    });
    return { summary: { 类目: filters.categoryName, 商品数量: rows.length }, rows };
  },
};
