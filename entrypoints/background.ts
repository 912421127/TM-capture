import { createPageCaptureStore, type RequestRecord } from '../src/shared/request-capture';

// 后台只管理两件事：按标签页保存接口响应，以及按小时向指定标签页发起刷新。
const captureStore = createPageCaptureStore();
const AUTO_CAPTURE_ALARM = 'tm-capture-auto-hourly';
const AUTO_CAPTURE_STORAGE_KEY = 'autoCaptureConfig';

interface AutoCaptureConfig {
  enabled: boolean;
  tabId?: number;
}

async function readAutoCaptureConfig(): Promise<AutoCaptureConfig> {
  const result = await browser.storage.local.get(AUTO_CAPTURE_STORAGE_KEY);
  return (result[AUTO_CAPTURE_STORAGE_KEY] as AutoCaptureConfig | undefined) ?? { enabled: false };
}

async function saveAutoCaptureConfig(config: AutoCaptureConfig): Promise<void> {
  await browser.storage.local.set({ [AUTO_CAPTURE_STORAGE_KEY]: config });
}

async function stopAutoCapture(): Promise<void> {
  await browser.alarms.clear(AUTO_CAPTURE_ALARM);
  await saveAutoCaptureConfig({ enabled: false });
}

async function triggerTabCapture(tabId: number): Promise<{ ok: boolean; error?: string }> {
  try {
    const tab = await browser.tabs.get(tabId);
    if (!tab.url?.startsWith('https://sycm.taobao.com/')) {
      await stopAutoCapture();
      return { ok: false, error: '目标生意参谋页面已关闭或地址已改变' };
    }
    // 定时任务直接在当前页面上下文调用目标接口，不刷新页面、不改变用户位置。
    await browser.tabs.sendMessage(tabId, { type: 'LOAD_CORE_INDEX_DIRECT' });
    return { ok: true };
  } catch {
    await stopAutoCapture();
    return { ok: false, error: '无法连接目标生意参谋页面，请重新打开页面' };
  }
}

async function startAutoCapture(tabId: number): Promise<{ ok: boolean; error?: string; nextRunAt?: number }> {
  const result = await triggerTabCapture(tabId);
  if (!result.ok) return result;
  await browser.alarms.create(AUTO_CAPTURE_ALARM, { delayInMinutes: 60, periodInMinutes: 60 });
  await saveAutoCaptureConfig({ enabled: true, tabId });
  return { ok: true, nextRunAt: Date.now() + 60 * 60 * 1000 };
}

async function restoreAutoCapture(): Promise<void> {
<<<<<<< HEAD
=======
  // 浏览器重启后 alarms 会丢失，使用本地开关恢复用户已启用的任务。
>>>>>>> c459f5d9f7c14a0dd2b8ff16977aeeaf71dc8b29
  const config = await readAutoCaptureConfig();
  if (!config.enabled || config.tabId === undefined) return;
  const result = await triggerTabCapture(config.tabId);
  if (result.ok) await browser.alarms.create(AUTO_CAPTURE_ALARM, { delayInMinutes: 60, periodInMinutes: 60 });
}

export default defineBackground(() => {
  // 点击扩展图标直接打开侧边栏，用户无需先进入浏览器菜单寻找面板。
  void browser.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

  void restoreAutoCapture();

  browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name !== AUTO_CAPTURE_ALARM) return;
    void readAutoCaptureConfig().then((config) => {
      if (config.enabled && config.tabId !== undefined) void triggerTabCapture(config.tabId);
    });
  });

  browser.tabs.onRemoved.addListener((tabId) => {
    void readAutoCaptureConfig().then((config) => {
      if (config.tabId === tabId) void stopAutoCapture();
    });
  });

  browser.runtime.onMessage.addListener((message: { type?: string; record?: RequestRecord; pageId?: string; enabled?: boolean; tabId?: number }, sender) => {
    if (message.type === 'CAPTURE_RECORD' && message.record) {
      const pageId = String(sender.tab?.id ?? message.record.pageId);
      const record = { ...message.record, pageId };
      captureStore.add(record);
      // 侧边栏打开时实时刷新，关闭时则由下次打开的列表查询获取历史记录。
      void browser.runtime.sendMessage({ type: 'CAPTURE_RECORD_UPDATED', pageId, record }).catch(() => undefined);
      return Promise.resolve({ ok: true });
    }

    if (message.type === 'CAPTURE_PAGE_READY') {
      // 页面刷新后，旧记录已经不属于当前分析上下文，按 Tab 清理。
      const pageId = String(sender.tab?.id ?? message.pageId ?? 'unknown');
      captureStore.clear(pageId);
      return Promise.resolve({ ok: true });
    }

    if (message.type === 'CAPTURE_LIST' && message.pageId) {
      return Promise.resolve({ ok: true, records: captureStore.list(message.pageId) });
    }

    if (message.type === 'CAPTURE_CLEAR' && message.pageId) {
      captureStore.clear(message.pageId);
      return Promise.resolve({ ok: true });
    }

    if (message.type === 'AUTO_CAPTURE_SET') {
      if (message.enabled && message.tabId !== undefined) return startAutoCapture(message.tabId);
      return stopAutoCapture().then(() => ({ ok: true }));
    }

    if (message.type === 'AUTO_CAPTURE_GET_STATUS') {
      return Promise.all([readAutoCaptureConfig(), browser.alarms.get(AUTO_CAPTURE_ALARM)]).then(([config, alarm]) => ({
        ok: true,
        enabled: config.enabled,
        tabId: config.tabId,
        nextRunAt: alarm?.scheduledTime,
      }));
    }

    return undefined;
  });
});
