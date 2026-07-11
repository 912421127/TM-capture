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
      if (message.type === 'LOAD_CORE_INDEX_TABLE') return loadCoreIndexTable();
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
    // 首屏是懒加载页面，等“数据概览”真正渲染后自动触发一次，不依赖侧边栏是否已经打开。
    void waitForOverviewAndLoad();
  },
});

async function waitForOverviewAndLoad(): Promise<void> {
  if (findOverviewElement()) {
    await loadCoreIndexTable();
    return;
  }

  await new Promise<void>((resolve) => {
    let finished = false;
    const observer = new MutationObserver(() => {
      if (finished || !findOverviewElement()) return;
      finished = true;
      observer.disconnect();
      void loadCoreIndexTable().finally(resolve);
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    window.setTimeout(() => {
      if (finished) return;
      finished = true;
      observer.disconnect();
      resolve();
    }, 15_000);
  });
}

async function loadCoreIndexTable(): Promise<{ ok: boolean }> {
  const target = findOverviewElement();
  if (target) {
    target.scrollIntoView({ behavior: 'auto', block: 'center' });
    // 等待浏览器完成滚动和 IntersectionObserver 回调，官网才会发起懒加载请求。
    await new Promise((resolve) => window.setTimeout(resolve, 800));
    return { ok: true };
  }

  // 页面使用虚拟列表时，先分段滚动让懒加载容器产生请求。
  for (let index = 1; index <= 12; index += 1) {
    const scrollHeight = document.documentElement.scrollHeight;
    window.scrollTo(0, Math.min(scrollHeight, window.innerHeight * index));
    for (const element of [...document.querySelectorAll<HTMLElement>('*')]
      .filter((item) => item.scrollHeight > item.clientHeight + 40)) {
      element.scrollTop = element.scrollHeight;
      element.dispatchEvent(new Event('scroll', { bubbles: true }));
    }
    await new Promise((resolve) => window.setTimeout(resolve, 250));
  }
  return { ok: true };
}

function findOverviewElement(): HTMLElement | null {
  const candidates = [...document.querySelectorAll<HTMLElement>('h1,h2,h3,h4,div,span')]
    .filter((element) => element.textContent?.includes('数据概览'))
    .sort((left, right) => (left.textContent?.length ?? Infinity) - (right.textContent?.length ?? Infinity));
  return candidates[0] ?? null;
}
