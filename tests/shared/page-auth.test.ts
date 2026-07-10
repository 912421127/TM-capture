import { describe, expect, it } from 'vitest';
import { prepareAuthenticatedRequest, rememberPageAuth } from '../../src/shared/page-auth';

describe('prepareAuthenticatedRequest', () => {
  it('从当前页面缓存的参数补全 token 和风控请求头', () => {
    const result = prepareAuthenticatedRequest(
      { url: 'https://sycm.taobao.com/portal/coreIndex/new/overview/v3.json?dateType=day' },
      { token: 'page-token', bxUa: 'page-bx-ua', bxVersion: '2.5.36' },
    );

    expect(result.url).toContain('token=page-token');
    expect(result.headers).toEqual({ 'bx-ua': 'page-bx-ua', 'bx-v': '2.5.36' });
  });

  it('没有页面登录参数时提示刷新生意参谋页面', () => {
    expect(() => prepareAuthenticatedRequest({ url: 'https://sycm.taobao.com/portal/coreIndex/new/overview/v3.json' }, {})).toThrow(
      '未获取到生意参谋登录参数，请刷新页面后重试。',
    );
  });

  it('从页面自身请求缓存 token 和风控头，不写入扩展存储', () => {
    expect(
      rememberPageAuth({}, 'https://sycm.taobao.com/portal/home.json?token=page-token', {
        'bx-ua': 'page-bx-ua',
        'bx-v': '2.5.36',
      }),
    ).toEqual({ token: 'page-token', bxUa: 'page-bx-ua', bxVersion: '2.5.36' });
  });
});
