import type { SycmRequest } from './capture';

export interface PageAuth {
  token?: string;
  bxUa?: string;
  bxVersion?: string;
}

export function rememberPageAuth(auth: PageAuth, requestUrl: string, headers: Record<string, string>): PageAuth {
  const url = new URL(requestUrl);
  return {
    token: url.searchParams.get('token') || auth.token,
    bxUa: headers['bx-ua'] || auth.bxUa,
    bxVersion: headers['bx-v'] || auth.bxVersion,
  };
}

export function prepareAuthenticatedRequest(request: SycmRequest, auth: PageAuth): SycmRequest {
  const url = new URL(request.url);
  if (!url.searchParams.get('token')) {
    if (!auth.token) throw new Error('未获取到生意参谋登录参数，请刷新页面后重试。');
    url.searchParams.set('token', auth.token);
  }

  const headers = { ...request.headers };
  if (auth.bxUa && !headers['bx-ua']) headers['bx-ua'] = auth.bxUa;
  if (auth.bxVersion && !headers['bx-v']) headers['bx-v'] = auth.bxVersion;
  return { ...request, url: url.href, headers };
}
