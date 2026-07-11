// 把后台 tabs.sendMessage 封装成采集模块使用的通用传输接口。
import type { SycmRequest, SycmTransport } from './capture';

export type PageRequestResponse = { ok: true; data: unknown } | { ok: false; error: string };

type SendTabMessage = (
  tabId: number,
  message: { type: 'SYCM_PAGE_REQUEST'; request: SycmRequest },
) => Promise<PageRequestResponse>;

export function createTabTransport(tabId: number, sendMessage: SendTabMessage): SycmTransport {
  return {
    async request<T>(request: SycmRequest): Promise<T> {
      const response = await sendMessage(tabId, { type: 'SYCM_PAGE_REQUEST', request });
      // 页面桥接失败时直接抛出用户可读错误，采集协调器会负责统一返回失败结果。
      if (!response.ok) throw new Error(response.error);
      return response.data as T;
    },
  };
}
