// 验证生意参谋响应拆包、错误识别、指标读取和对象安全转换。
import { describe, expect, it } from 'vitest';
import { readMetric, unwrapSycmResponse } from '../../src/shared/sycm-response';

describe('Sycm response helpers', () => {
  it('解开 portal 接口的 content 包装', () => {
    expect(unwrapSycmResponse({ content: { code: 0, data: { uv: { value: 12 } } }, hasError: false })).toEqual({
      uv: { value: 12 },
    });
  });

  it('接口业务失败时使用服务端提示', () => {
    expect(() => unwrapSycmResponse({ code: 4001, message: '没有权限' })).toThrow('没有权限');
  });

  it('读取指标对象的 value 字段和空值', () => {
    expect(readMetric({ uv: { value: 12 } }, 'uv')).toBe(12);
    expect(readMetric({ uv: {} }, 'uv')).toBeNull();
  });
});
