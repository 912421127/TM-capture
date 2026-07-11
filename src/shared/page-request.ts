// 在页面环境中执行经过来源校验、鉴权补全和超时保护的生意参谋请求。
import type { SycmRequest } from './capture';
import type { PageAuth } from './page-auth';
import { prepareAuthenticatedRequest } from './page-auth';

const SYCM_ORIGIN = 'https://sycm.taobao.com';

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export async function executeSycmRequest<T>(request: SycmRequest, fetchImpl: FetchLike = fetch, auth?: PageAuth): Promise<T> {
  const authenticatedRequest = auth ? prepareAuthenticatedRequest(request, auth) : request;
  const url = new URL(authenticatedRequest.url, SYCM_ORIGIN);
  if (url.origin !== SYCM_ORIGIN) throw new Error('插件只允许请求生意参谋接口。');

  const controller = new AbortController();
  // 页面桥接请求必须有上限，防止接口无响应时采集任务永久占用。
  const timeout = setTimeout(() => controller.abort(), authenticatedRequest.timeoutMs ?? 30_000);

  try {
    const response = await fetchImpl(url.href, {
      method: authenticatedRequest.method ?? 'GET',
      headers: authenticatedRequest.headers,
      body: authenticatedRequest.body,
      credentials: 'include',
      signal: controller.signal,
    });

    if (response.status === 401) throw new Error('登录状态已失效，请重新登录生意参谋。');
    if (response.status === 403) throw new Error('请求被生意参谋风控拦截，请刷新页面后重试。');
    if (!response.ok) throw new Error(`生意参谋接口请求失败，状态码 ${response.status}。`);

    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes('json')) throw new Error('接口返回的不是 JSON 数据，无法继续采集。');
    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('接口请求超过 30 秒，请检查网络后重试。');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
