import { getCaptureFeature } from '../src/features';
import { createPageCaptureStore, type RequestRecord } from '../src/shared/request-capture';
import {
  AUTO_CAPTURE_ALARM_PREFIX,
  createScheduleConfig,
  disableSchedule,
  getAlarmName,
  isSupportedInterval,
  type InterfaceSchedule,
  type ScheduleConfig,
} from '../src/shared/schedule';

const captureStore = createPageCaptureStore();
const SCHEDULE_STORAGE_KEY = 'interfaceSchedules';

async function readScheduleConfig(): Promise<ScheduleConfig> {
  const result = await browser.storage.local.get(SCHEDULE_STORAGE_KEY);
  return (result[SCHEDULE_STORAGE_KEY] as ScheduleConfig | undefined) ?? createScheduleConfig();
}

async function saveScheduleConfig(config: ScheduleConfig): Promise<void> {
  await browser.storage.local.set({ [SCHEDULE_STORAGE_KEY]: config });
}

async function stopSchedule(interfaceId: string): Promise<void> {
  await browser.alarms.clear(getAlarmName(interfaceId));
  const config = await readScheduleConfig();
  disableSchedule(config, interfaceId);
  await saveScheduleConfig(config);
}

async function triggerInterface(tabId: number, interfaceId: string): Promise<{ ok: boolean; error?: string }> {
  if (!getCaptureFeature(interfaceId)) return { ok: false, error: '未找到该接口的采集配置' };

  try {
    const tab = await browser.tabs.get(tabId);
    if (!tab.url?.startsWith('https://sycm.taobao.com/')) {
      await stopSchedule(interfaceId);
      return { ok: false, error: '目标生意参谋页面已关闭或地址已改变' };
    }
    // 请求在页面上下文完成，复用用户的登录状态且不改变当前页面位置。
    await browser.tabs.sendMessage(tabId, { type: 'CAPTURE_TRIGGER', interfaceId });
    return { ok: true };
  } catch {
    await stopSchedule(interfaceId);
    return { ok: false, error: '无法连接目标生意参谋页面，请重新打开页面' };
  }
}

async function startSchedule(tabId: number, interfaceId: string, intervalMinutes: number): Promise<{ ok: boolean; error?: string; nextRunAt?: number }> {
  if (!isSupportedInterval(intervalMinutes)) return { ok: false, error: '请选择 15、30 或 60 分钟' };

  const result = await triggerInterface(tabId, interfaceId);
  if (!result.ok) return result;

  await browser.alarms.create(getAlarmName(interfaceId), { delayInMinutes: intervalMinutes, periodInMinutes: intervalMinutes });
  const config = await readScheduleConfig();
  config[interfaceId] = { enabled: true, tabId, intervalMinutes };
  await saveScheduleConfig(config);
  return { ok: true, nextRunAt: Date.now() + intervalMinutes * 60 * 1000 };
}

async function restoreSchedules(): Promise<void> {
  const config = await readScheduleConfig();
  await Promise.all(Object.entries(config).map(async ([interfaceId, schedule]) => {
    if (!schedule.enabled || schedule.tabId === undefined || schedule.intervalMinutes === undefined) return;
    const result = await triggerInterface(schedule.tabId, interfaceId);
    if (result.ok) {
      await browser.alarms.create(getAlarmName(interfaceId), {
        delayInMinutes: schedule.intervalMinutes,
        periodInMinutes: schedule.intervalMinutes,
      });
    }
  }));
}

export default defineBackground(() => {
  void browser.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  void restoreSchedules();

  browser.alarms.onAlarm.addListener((alarm) => {
    if (!alarm.name.startsWith(AUTO_CAPTURE_ALARM_PREFIX)) return;
    const interfaceId = alarm.name.slice(AUTO_CAPTURE_ALARM_PREFIX.length);
    void readScheduleConfig().then((config) => {
      const schedule = config[interfaceId];
      if (schedule?.enabled && schedule.tabId !== undefined) void triggerInterface(schedule.tabId, interfaceId);
    });
  });

  browser.tabs.onRemoved.addListener((tabId) => {
    void readScheduleConfig().then((config) => {
      Object.entries(config).forEach(([interfaceId, schedule]) => {
        if (schedule.tabId === tabId) void stopSchedule(interfaceId);
      });
    });
  });

  browser.runtime.onMessage.addListener((message: {
    type?: string;
    record?: RequestRecord;
    pageId?: string;
    interfaceId?: string;
    enabled?: boolean;
    tabId?: number;
    intervalMinutes?: number;
  }, sender) => {
    if (message.type === 'CAPTURE_RECORD' && message.record) {
      const pageId = String(sender.tab?.id ?? message.record.pageId);
      const record = { ...message.record, pageId };
      captureStore.add(record);
      void browser.runtime.sendMessage({ type: 'CAPTURE_RECORD_UPDATED', pageId, interfaceId: record.interfaceId }).catch(() => undefined);
      return Promise.resolve({ ok: true });
    }

    if (message.type === 'CAPTURE_PAGE_READY') {
      captureStore.clear(String(sender.tab?.id ?? message.pageId ?? 'unknown'));
      return Promise.resolve({ ok: true });
    }

    if (message.type === 'CAPTURE_LIST' && message.pageId && message.interfaceId) {
      return Promise.resolve({ ok: true, records: captureStore.list(message.pageId, message.interfaceId) });
    }

    if (message.type === 'CAPTURE_CLEAR' && message.pageId && message.interfaceId) {
      captureStore.clear(message.pageId, message.interfaceId);
      return Promise.resolve({ ok: true });
    }

    if (message.type === 'CAPTURE_SCHEDULE_SET' && message.interfaceId) {
      if (message.enabled && message.tabId !== undefined && message.intervalMinutes !== undefined) {
        return startSchedule(message.tabId, message.interfaceId, message.intervalMinutes);
      }
      return stopSchedule(message.interfaceId).then(() => ({ ok: true }));
    }

    if (message.type === 'CAPTURE_SCHEDULE_GET_STATUS' && message.interfaceId) {
      // Promise 回调不会保留消息对象的类型收窄，提前保存接口 ID。
      const interfaceId = message.interfaceId;
      return Promise.all([readScheduleConfig(), browser.alarms.get(getAlarmName(interfaceId))]).then(([config, alarm]) => ({
        ok: true,
        ...(config[interfaceId] ?? { enabled: false } as InterfaceSchedule),
        nextRunAt: alarm?.scheduledTime,
      }));
    }

    return undefined;
  });
});
