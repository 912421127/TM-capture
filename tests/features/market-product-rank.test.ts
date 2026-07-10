import { describe, expect, it } from 'vitest';
import { loadMarketCategories, marketProductRankFeature } from '../../src/features/market-product-rank';
import type { SycmRequest } from '../../src/shared/capture';

describe('marketProductRankFeature', () => {
  it('转换市场排行中的区间指标与商品信息', async () => {
    const calls: SycmRequest[] = [];
    const request = async <T>(input: SycmRequest): Promise<T> => {
      calls.push(input);
      return ({
      code: 0,
      data: {
        recordCount: 1,
        data: [
          {
            cateRankId: { value: 1 }, uv: { value: '1万 ~ 2.5万' }, payByrCnt: { value: '2500 ~ 5000' }, payAmt: { value: '10万 ~ 25万' },
            item: { itemId: '200', title: '市场商品', pictUrl: '//img.example.com/b.jpg', detailUrl: '//detail.tmall.com/item.htm?id=200', userId: '__REDACTED__' },
            shop: { b2CShop: true },
          },
        ],
      },
      } as T);
    };

    const result = await marketProductRankFeature.collect(
      { startDate: '2026-07-03', endDate: '2026-07-09', metric: 'payAmount', categoryId: '2908', categoryName: 'ZIPPO/芝宝' },
      { request },
      () => undefined,
    );

    expect(result.rows[0]).toMatchObject({ rank: 1, itemId: '200', visitorCount: '1万 ~ 2.5万', buyerCount: '2500 ~ 5000', isTmall: true });
    expect(calls[0]?.url).toContain('cateId=2908');
  });

  it('只把可选叶子类目提供给界面', async () => {
    const categories = await loadMarketCategories({
      request: async <T>() => ({ code: 0, data: [[0, 28, '打火机', 1, 'free', 'N'], [122444001, 2908, 'ZIPPO/芝宝', 0, 'free', 'Y']] } as T),
    });

    expect(categories).toEqual([{ value: '2908', label: 'ZIPPO/芝宝' }]);
  });
});
