// 在页面内存中暂存生意参谋请求所需的登录 token 和风控头，不写入扩展存储。
import type { SycmRequest } from './capture';

export interface PageAuth {
  token?: string;
  bxUa?: string;
  bxVersion?: string;
}

export function rememberPageAuth(auth: PageAuth, requestUrl: string, headers: Record<string, string>): PageAuth {
  const url = new URL(requestUrl);
  return {
    // 新请求没有某个字段时沿用上一次观察到的值，页面请求通常不会每次重复携带全部参数。
    token: url.searchParams.get('token') || auth.token,
    bxUa: headers['bx-ua'] || auth.bxUa,
    bxVersion: headers['bx-v'] || auth.bxVersion,
  };
}

export function prepareAuthenticatedRequest(request: SycmRequest, auth: PageAuth): SycmRequest {
  const url = new URL(request.url);
  if (!url.searchParams.get('token')) {
    // 适配器只描述业务接口，真正的登录参数由页面最近一次请求提供。
    if (!auth.token) throw new Error('未获取到生意参谋登录参数，请刷新页面后重试。');
    url.searchParams.set('token', auth.token);
  }

  const headers = { ...request.headers };
  if (auth.bxUa && !headers['bx-ua']) headers['bx-ua'] = auth.bxUa;
  if (auth.bxVersion && !headers['bx-v']) headers['bx-v'] = auth.bxVersion;
  return { ...request, url: url.href, headers };
}
