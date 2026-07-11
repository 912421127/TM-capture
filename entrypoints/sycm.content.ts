import { createMainWorldSessionBridge } from '../src/features/auxiliary-capture/interceptor';

const CAPTURE_EVENT = '__tm_capture_record';
const TRIGGER_EVENT = '__tm_capture_trigger';
const AUXILIARY_SESSION_EVENT = '__tm_capture_auxiliary_session';
const MAIN_WORLD_READY_EVENT = '__tm_capture_main_world_ready';
const MAIN_WORLD_READY_ATTRIBUTE = 'data-tm-capture-main-ready';

interface PageCaptureMessage {
  type: 'CAPTURE_RECORD';
  record: Record<string, unknown>;
}

export default defineContentScript({
  matches: ['https://sycm.taobao.com/*'],
  runAt: 'document_start',
  async main() {
    const sessionBridge = createMainWorldSessionBridge((enabled) => {
      window.dispatchEvent(new CustomEvent(AUXILIARY_SESSION_EVENT, {
        detail: { enabled },
      }));
    });

    window.addEventListener(MAIN_WORLD_READY_EVENT, () => {
      sessionBridge.markReady();
    });

    browser.runtime.onMessage.addListener((message: { type?: string }) => {
      if (message.type === 'CAPTURE_TRIGGER') {
        window.dispatchEvent(new CustomEvent(TRIGGER_EVENT, { detail: message }));
        return Promise.resolve({ ok: true });
      }
      if (message.type === 'CAPTURE_AUXILIARY_SESSION_SET') {
        // 会话消息可能比 MAIN world 监听器更早抵达，先保存，收到握手后再转发。
        sessionBridge.setEnabled(Boolean((message as { enabled?: boolean }).enabled));
        return Promise.resolve({ ok: true });
      }
      return undefined;
    });

    // 内容脚本无法直接读取主世界变量，因此使用页面事件作为单向桥接。
    window.addEventListener(CAPTURE_EVENT, (event) => {
      const detail = (event as CustomEvent<PageCaptureMessage['record']>).detail;
      if (!detail || typeof detail !== 'object') return;
      void browser.runtime.sendMessage({ type: 'CAPTURE_RECORD', record: detail });
    });

    // MAIN world 已先运行时不会再触发事件，读取持久属性即可补上握手。
    if (document.documentElement.getAttribute(MAIN_WORLD_READY_ATTRIBUTE) === 'true') {
      sessionBridge.markReady();
    }

    // 后台以 Tab 为边界清理记录，保证刷新页面后重新开始分析。
    void browser.runtime.sendMessage({ type: 'CAPTURE_PAGE_READY' });
  },
});
