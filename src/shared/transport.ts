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
      if (!response.ok) throw new Error(response.error);
      return response.data as T;
    },
  };
}
