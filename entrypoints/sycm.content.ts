const CAPTURE_EVENT = '__tm_capture_record';
const DIRECT_CAPTURE_EVENT = '__tm_capture_direct_record';

interface PageCaptureMessage {
  type: 'CAPTURE_RECORD';
  record: Record<string, unknown>;
}

export default defineContentScript({
  matches: ['https://sycm.taobao.com/*'],
  runAt: 'document_start',
  async main() {
    browser.runtime.onMessage.addListener((message: { type?: string }) => {
      if (message.type === 'LOAD_CORE_INDEX_DIRECT') {
        window.dispatchEvent(new CustomEvent(DIRECT_CAPTURE_EVENT));
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

    window.addEventListener(DIRECT_CAPTURE_EVENT, (event) => {
      const detail = (event as CustomEvent<PageCaptureMessage['record']>).detail;
      if (!detail || typeof detail !== 'object') return;
      void browser.runtime.sendMessage({ type: 'CAPTURE_RECORD', record: detail });
    });

    // 后台以 Tab 为边界清理记录，保证刷新页面后重新开始分析。
    void browser.runtime.sendMessage({ type: 'CAPTURE_PAGE_READY' });
  },
});
