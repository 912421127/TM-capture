const CAPTURE_EVENT = '__tm_capture_record';
const TRIGGER_EVENT = '__tm_capture_trigger';

interface PageCaptureMessage {
  type: 'CAPTURE_RECORD';
  record: Record<string, unknown>;
}

export default defineContentScript({
  matches: ['https://sycm.taobao.com/*'],
  runAt: 'document_start',
  async main() {
    browser.runtime.onMessage.addListener((message: { type?: string }) => {
      if (message.type === 'CAPTURE_TRIGGER') {
        window.dispatchEvent(new CustomEvent(TRIGGER_EVENT, { detail: message }));
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

    // 后台以 Tab 为边界清理记录，保证刷新页面后重新开始分析。
    void browser.runtime.sendMessage({ type: 'CAPTURE_PAGE_READY' });
  },
});
