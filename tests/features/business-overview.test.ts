// 验证经营概览适配器的双接口请求、汇总字段和日期明细转换。
import { describe, expect, it } from 'vitest';
import { businessOverviewFeature } from '../../src/features/business-overview';
import type { SycmRequest } from '../../src/shared/capture';

describe('businessOverviewFeature', () => {
  it('使用经营概览接口生成汇总和每日明细', async () => {
    const calls: SycmRequest[] = [];
    const request = async <T>(input: SycmRequest): Promise<T> => {
      calls.push(input);
      if (input.url.includes('overview/v3')) {
        return {
          content: {
            code: 0,
            data: { self: { uv: { value: 21 }, pv: { value: 48 }, payByrCnt: { value: 2 }, payAmt: { value: 1238 }, payRate: { value: 0.12 } } },
          },
        } as T;
      }
      return {
        content: {
          code: 0,
          data: [
            { statDate: { value: Date.UTC(2026, 6, 8) }, uv: { value: 10 }, pv: { value: 20 }, payByrCnt: { value: 1 }, payAmt: { value: 100 }, payRate: { value: 0.1 } },
            { statDate: { value: Date.UTC(2026, 6, 9) }, uv: { value: 21 }, pv: { value: 48 }, payByrCnt: { value: 2 }, payAmt: { value: 1238 }, payRate: { value: 0.12 } },
          ],
        },
      } as T;
    };

    const result = await businessOverviewFeature.collect(
      { startDate: '2026-07-09', endDate: '2026-07-09' },
      { request },
      () => undefined,
    );

    expect(result.summary).toMatchObject({ 访客数: 21, 支付金额: 1238 });
    expect(result.rows).toEqual([
      { date: '2026-07-09', visitorCount: 21, pageViewCount: 48, buyerCount: 2, payAmount: 1238, conversionRate: 0.12 },
    ]);
    expect(calls[0]?.url).toContain('/portal/coreIndex/new/overview/v3.json');
    expect(calls[1]?.headers).toEqual({ 'sycm-referer': '/portal/home.htm' });
  });
});
