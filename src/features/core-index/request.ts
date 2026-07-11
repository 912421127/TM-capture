import type { CaptureRequestOptions } from '../types';
import { findPageQueryValue } from '../../shared/page-request';

function formatToday(): string {
  const now = new Date();
  const date = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return `${date.toISOString().slice(0, 10)}|${date.toISOString().slice(0, 10)}`;
}

export async function requestCoreIndex(_options?: CaptureRequestOptions): Promise<void> {
  // 复用当前页面的登录会话，只补齐数据概览接口必需的 token 和日期。
  const token = findPageQueryValue('token');
  if (!token) return;

  const url = new URL('/portal/coreIndex/new/getTableData/v3.json', location.origin);
  url.searchParams.set('dateType', 'day');
  url.searchParams.set('dateRange', findPageQueryValue('dateRange') ?? formatToday());
  url.searchParams.set('_', String(Date.now()));
  url.searchParams.set('token', token);

  try {
    await fetch(url.href, { credentials: 'include' });
  } catch {
    // 登录状态失效时不影响页面正常使用，侧边栏仍可查看已有记录。
  }
}
