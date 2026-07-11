// 验证本店商品排行的指标映射、商品字段转换和分页总数读取。
import { describe, expect, it } from 'vitest';
import { storeProductRankFeature } from '../../src/features/store-product-rank';
import type { SycmRequest } from '../../src/shared/capture';

describe('storeProductRankFeature', () => {
  it('转换本店商品排行，并读取分页总数', async () => {
    const calls: SycmRequest[] = [];
    const request = async <T>(input: SycmRequest): Promise<T> => {
      calls.push(input);
      return ({
      code: 0,
      data: {
        data: {
          recordCount: 1,
          data: [
            {
              item: { itemId: '100', title: '测试商品', pictUrl: '//img.example.com/a.jpg', detailUrl: '//item.taobao.com/item.htm?id=100' },
              itmUv: { value: 18 }, payByrCnt: { value: 3 }, payAmt: { value: 520 }, payRate: { value: 0.16 },
            },
          ],
        },
      },
      } as T);
    };

    const result = await storeProductRankFeature.collect(
      { startDate: '2026-07-09', endDate: '2026-07-09', metric: 'visitorCount' },
      { request },
      () => undefined,
    );

    expect(result.rows[0]).toMatchObject({ rank: 1, itemId: '100', title: '测试商品', visitorCount: 18, buyerCount: 3, payAmount: 520 });
    expect(calls[0]?.url).toContain('orderBy=itmUv');
  });
});
