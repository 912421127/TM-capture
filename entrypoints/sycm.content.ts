// 生意参谋内容脚本：连接扩展后台与页面主世界脚本，不直接读取登录敏感信息。
import { injectScript } from '#imports';
import type { SycmRequest } from '../src/shared/capture';
import type { DiagnosticRecord } from '../src/shared/diagnostic';
import type { PageRequestResponse } from '../src/shared/transport';

const REQUEST_EVENT = '__tm_capture_request';
const RESULT_EVENT = '__tm_capture_result';
const DIAGNOSTIC_EVENT = '__tm_capture_diagnostic';
const DIAGNOSTIC_TOGGLE_EVENT = '__tm_capture_diagnostic_toggle';

interface ContentMessage {
  type: 'SYCM_PAGE_REQUEST' | 'DIAGNOSTIC_SET_ENABLED';
  request?: SycmRequest;
  enabled?: boolean;
}

type PageResultDetail = PageRequestResponse & {
  channelId: string;
  requestId: string;
};

export default defineContentScript({
  matches: ['https://sycm.taobao.com/*'],
  runAt: 'document_start',
  async main() {
    const channelId = crypto.randomUUID();
    // 主世界脚本必须尽早注入，才能观察页面后续产生的鉴权请求。
    await injectScript('/sycm-main-world.js');

    browser.runtime.onMessage.addListener((message: ContentMessage) => {
      if (message.type === 'DIAGNOSTIC_SET_ENABLED' && import.meta.env.MODE === 'diagnostic') {
        window.dispatchEvent(new CustomEvent(DIAGNOSTIC_TOGGLE_EVENT, { detail: { enabled: Boolean(message.enabled) } }));
        return Promise.resolve({ ok: true });
      }

      if (message.type !== 'SYCM_PAGE_REQUEST' || !message.request) return undefined;
      const requestId = crypto.randomUUID();
      return new Promise<PageRequestResponse>((resolve) => {
        // 每个请求使用独立 requestId，避免并发请求互相消费对方的页面事件。
        const timeout = window.setTimeout(() => {
          window.removeEventListener(RESULT_EVENT, handleResult);
          resolve({ ok: false, error: '页面桥接响应超时，请刷新生意参谋页面后重试。' });
        }, 35_000);

        function handleResult(event: Event): void {
          const detail = (event as CustomEvent<PageResultDetail>).detail;
          if (detail.channelId !== channelId || detail.requestId !== requestId) return;
          window.clearTimeout(timeout);
          window.removeEventListener(RESULT_EVENT, handleResult);
          resolve(detail.ok ? { ok: true, data: detail.data } : { ok: false, error: detail.error });
        }

        window.addEventListener(RESULT_EVENT, handleResult);
        // CustomEvent 只传递请求描述，真实 token 仍由主世界脚本留在页面内存。
        window.dispatchEvent(
          new CustomEvent(REQUEST_EVENT, { detail: { channelId, requestId, request: message.request } }),
        );
      });
    });

    if (import.meta.env.MODE === 'diagnostic') {
      window.addEventListener(DIAGNOSTIC_EVENT, (event) => {
        const record = (event as CustomEvent<DiagnosticRecord>).detail;
        void browser.runtime.sendMessage({ type: 'DIAGNOSTIC_RECORD', record });
      });
    }
  },
});
