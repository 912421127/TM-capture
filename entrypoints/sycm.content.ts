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
    await injectScript('/sycm-main-world.js');

    browser.runtime.onMessage.addListener((message: ContentMessage) => {
      if (message.type === 'DIAGNOSTIC_SET_ENABLED' && import.meta.env.MODE === 'diagnostic') {
        window.dispatchEvent(new CustomEvent(DIAGNOSTIC_TOGGLE_EVENT, { detail: { enabled: Boolean(message.enabled) } }));
        return Promise.resolve({ ok: true });
      }

      if (message.type !== 'SYCM_PAGE_REQUEST' || !message.request) return undefined;
      const requestId = crypto.randomUUID();
      return new Promise<PageRequestResponse>((resolve) => {
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
