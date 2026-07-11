<template>
  <main class="page">
    <header class="header"><div><h1>接口分析</h1><p>{{ pageLabel }}</p></div></header>
    <p v-if="error" class="error">{{ error }}</p>
    <CoreIndexPanel :records="records" :enabled="scheduleEnabled" :interval-minutes="intervalMinutes" :intervals="AUTO_CAPTURE_INTERVALS" :next-run-at="nextRunAt" @refresh="loadRecords" @export="exportRecords" @clear="clearRecords" @update:enabled="setScheduleEnabled" @update:interval="setIntervalMinutes" />
  </main>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import CoreIndexPanel from '../../src/features/core-index/CoreIndexPanel.vue';
import { coreIndexFeature } from '../../src/features/core-index';
import { serializeCaptureRecords, type RequestRecord } from '../../src/shared/request-capture';
import { AUTO_CAPTURE_INTERVALS } from '../../src/shared/schedule';

const records = ref<RequestRecord[]>([]);
const pageLabel = ref('正在读取当前页面');
const error = ref('');
const scheduleEnabled = ref(false);
const intervalMinutes = ref(60);
const nextRunAt = ref<number>();
let activeTabId = '';

async function getActiveTab(): Promise<void> {
  const tab = (await browser.tabs.query({ active: true, currentWindow: true }))[0];
  activeTabId = tab?.id === undefined ? '' : String(tab.id);
  pageLabel.value = tab?.url?.includes('sycm.taobao.com') ? '当前生意参谋页面' : '当前页面不是生意参谋';
}

async function loadRecords(): Promise<void> {
  error.value = '';
  await getActiveTab();
  if (!activeTabId || !pageLabel.value.includes('生意参谋')) {
    error.value = '当前页面不是生意参谋';
    return;
  }
  await browser.tabs.sendMessage(Number(activeTabId), { type: 'CAPTURE_TRIGGER', interfaceId: coreIndexFeature.id });
  // 页面脚本异步复制响应内容，等待后读取可保留原有刷新体验。
  await new Promise((resolve) => window.setTimeout(resolve, 1500));
  await readRecords();
}

async function readRecords(): Promise<void> {
  await getActiveTab();
  if (!activeTabId) return;
  const response = await browser.runtime.sendMessage({ type: 'CAPTURE_LIST', pageId: activeTabId, interfaceId: coreIndexFeature.id }) as { records?: RequestRecord[] };
  records.value = response.records ?? [];
}

async function clearRecords(): Promise<void> {
  if (!activeTabId) return;
  await browser.runtime.sendMessage({ type: 'CAPTURE_CLEAR', pageId: activeTabId, interfaceId: coreIndexFeature.id });
  records.value = [];
}

async function loadScheduleStatus(): Promise<void> {
  const response = await browser.runtime.sendMessage({ type: 'CAPTURE_SCHEDULE_GET_STATUS', interfaceId: coreIndexFeature.id }) as { enabled?: boolean; intervalMinutes?: number; nextRunAt?: number };
  scheduleEnabled.value = Boolean(response.enabled);
  intervalMinutes.value = response.intervalMinutes ?? 60;
  nextRunAt.value = response.nextRunAt;
}

async function setScheduleEnabled(enabled: boolean): Promise<void> {
  scheduleEnabled.value = enabled;
  await saveSchedule();
}

async function setIntervalMinutes(value: number): Promise<void> {
  intervalMinutes.value = value;
  if (scheduleEnabled.value) await saveSchedule();
}

async function saveSchedule(): Promise<void> {
  await getActiveTab();
  if (scheduleEnabled.value && (!activeTabId || !pageLabel.value.includes('生意参谋'))) {
    scheduleEnabled.value = false;
    error.value = '请先打开生意参谋页面后再开启定时获取';
    return;
  }
  const response = await browser.runtime.sendMessage({ type: 'CAPTURE_SCHEDULE_SET', interfaceId: coreIndexFeature.id, enabled: scheduleEnabled.value, tabId: activeTabId ? Number(activeTabId) : undefined, intervalMinutes: intervalMinutes.value }) as { ok: boolean; error?: string; nextRunAt?: number };
  if (!response.ok) {
    scheduleEnabled.value = false;
    error.value = response.error ?? '定时获取启动失败';
    return;
  }
  nextRunAt.value = response.nextRunAt;
  if (scheduleEnabled.value) await loadRecords();
}

function exportRecords(): void {
  if (records.value.length === 0) return;
  const blob = new Blob([serializeCaptureRecords(records.value)], { type: 'application/json;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${coreIndexFeature.name}_${Date.now()}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
}

function handleRuntimeMessage(message: { type?: string; pageId?: string; interfaceId?: string }): void {
  if (message.type === 'CAPTURE_RECORD_UPDATED' && message.pageId === activeTabId && message.interfaceId === coreIndexFeature.id) void readRecords();
}

onMounted(async () => {
  browser.runtime.onMessage.addListener(handleRuntimeMessage);
  await readRecords();
  await loadScheduleStatus();
});
onUnmounted(() => browser.runtime.onMessage.removeListener(handleRuntimeMessage));
</script>
