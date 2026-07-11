<template>
  <main class="page">
    <header class="header"><div><h1>接口分析</h1><p>{{ pageLabel }}</p></div></header>
    <p v-if="error" class="error">{{ error }}</p>
    <CoreIndexPanel :records="records" :enabled="scheduleEnabled" :interval-minutes="intervalMinutes" :intervals="AUTO_CAPTURE_INTERVALS" :next-run-at="nextRunAt" @refresh="loadRecords" @export="exportRecords" @clear="clearRecords" @update:enabled="setScheduleEnabled" @update:interval="setIntervalMinutes" />
    <ItemRankPanel :table="itemRankTable" :mode="itemRankMode" :loading="itemRankLoading" :error="itemRankError" @select-mode="loadItemRank" @refresh="refreshItemRank" @export="exportItemRank" @clear="clearItemRank" />
    <AuxiliaryCapturePanel :records="auxiliaryRecords" :enabled="auxiliaryCaptureEnabled" @toggle="toggleAuxiliaryCapture" @export="exportAuxiliaryRecords" @clear="clearAuxiliaryRecords" />
  </main>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { computed } from 'vue';
import CoreIndexPanel from '../../src/features/core-index/CoreIndexPanel.vue';
import ItemRankPanel from '../../src/features/item-rank/ItemRankPanel.vue';
import AuxiliaryCapturePanel from '../../src/features/auxiliary-capture/AuxiliaryCapturePanel.vue';
import { coreIndexFeature } from '../../src/features/core-index';
import { itemRankFeature, type ItemRankMode } from '../../src/features/item-rank';
import { buildItemRankTable } from '../../src/features/item-rank/table';
import { createCaptureExportFilename, serializeCaptureRecords, type RequestRecord } from '../../src/shared/request-capture';
import { AUTO_CAPTURE_INTERVALS } from '../../src/shared/schedule';

const records = ref<RequestRecord[]>([]);
const itemRankRecords = ref<RequestRecord[]>([]);
const itemRankMode = ref<ItemRankMode>('recent7');
const itemRankLoading = ref(false);
const itemRankError = ref('');
const auxiliaryRecords = ref<RequestRecord[]>([]);
const pageLabel = ref('正在读取当前页面');
const error = ref('');
const scheduleEnabled = ref(false);
const intervalMinutes = ref(60);
const nextRunAt = ref<number>();
const auxiliaryCaptureEnabled = ref(false);
let activeTabId = '';
const AUXILIARY_CAPTURE_INTERFACE_ID = 'auxiliary-capture';

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
  await refreshActiveTabData();
}

async function readRecordsForTab(tabId: string): Promise<void> {
  const [response, itemRankResponse, auxiliaryResponse] = await Promise.all([
    browser.runtime.sendMessage({ type: 'CAPTURE_LIST', pageId: tabId, interfaceId: coreIndexFeature.id }) as Promise<{ records?: RequestRecord[] }>,
    browser.runtime.sendMessage({ type: 'CAPTURE_LIST', pageId: tabId, interfaceId: itemRankFeature.id }) as Promise<{ records?: RequestRecord[] }>,
    browser.runtime.sendMessage({ type: 'CAPTURE_LIST', pageId: tabId, interfaceId: AUXILIARY_CAPTURE_INTERFACE_ID }) as Promise<{ records?: RequestRecord[] }>,
  ]);
  // 查询期间可能切换了标签页，不能把旧页记录显示到新页上。
  if (activeTabId !== tabId) return;
  records.value = response.records ?? [];
  itemRankRecords.value = itemRankResponse.records ?? [];
  auxiliaryRecords.value = auxiliaryResponse.records ?? [];
}

const itemRankTable = computed(() => {
  return buildItemRankTable(itemRankRecords.value.map((record) => record.responseBody), itemRankMode.value);
});

async function clearRecords(): Promise<void> {
  await getActiveTab();
  const tabId = activeTabId;
  if (!tabId) return;
  await browser.runtime.sendMessage({ type: 'CAPTURE_CLEAR', pageId: tabId, interfaceId: coreIndexFeature.id });
  if (activeTabId === tabId) records.value = [];
}

async function loadItemRank(mode: ItemRankMode): Promise<void> {
  itemRankMode.value = mode;
  itemRankLoading.value = true;
  itemRankError.value = '';
  await getActiveTab();
  const tabId = activeTabId;
  if (!tabId || !pageLabel.value.includes('生意参谋')) {
    itemRankLoading.value = false;
    itemRankError.value = '请先打开生意参谋页面后再获取商品排行';
    return;
  }

  try {
    await browser.runtime.sendMessage({ type: 'CAPTURE_CLEAR', pageId: tabId, interfaceId: itemRankFeature.id });
    await browser.tabs.sendMessage(Number(tabId), { type: 'CAPTURE_TRIGGER', interfaceId: itemRankFeature.id, mode });
    await waitForItemRankRecords(tabId, mode);
  } catch {
    itemRankError.value = '商品排行获取失败，请确认页面仍处于生意参谋后重试';
  } finally {
    itemRankLoading.value = false;
  }
}

async function waitForItemRankRecords(tabId: string, mode: ItemRankMode): Promise<void> {
  // 分页请求是串行发起的，轮询直到已收到 recordCount 对应的全部商品，避免只显示前几页。
  for (let attempt = 0; attempt < 50; attempt += 1) {
    await readRecordsForTab(tabId);
    const table = buildItemRankTable(itemRankRecords.value.map((record) => record.responseBody), mode);
    if (itemRankRecords.value.length > 0 && (table.recordCount === 0 || table.rows.length >= table.recordCount)) return;
    await new Promise((resolve) => window.setTimeout(resolve, 100));
  }
  await readRecordsForTab(tabId);
}

function refreshItemRank(): void {
  void loadItemRank(itemRankMode.value);
}

async function clearItemRank(): Promise<void> {
  await getActiveTab();
  const tabId = activeTabId;
  if (!tabId) return;
  await browser.runtime.sendMessage({ type: 'CAPTURE_CLEAR', pageId: tabId, interfaceId: itemRankFeature.id });
  if (activeTabId === tabId) itemRankRecords.value = [];
}

async function exportItemRank(): Promise<void> {
  await refreshActiveTabData();
  if (itemRankRecords.value.length === 0) return;
  downloadCaptureRecords(itemRankRecords.value, `商品排行_${itemRankMode.value}`);
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

async function exportRecords(): Promise<void> {
  await refreshActiveTabData();
  if (records.value.length === 0) return;
  downloadCaptureRecords(records.value, coreIndexFeature.name);
}

async function toggleAuxiliaryCapture(): Promise<void> {
  error.value = '';
  await getActiveTab();
  if (!activeTabId || !pageLabel.value.includes('生意参谋')) {
    error.value = '请先打开生意参谋页面后再开始抓包';
    return;
  }
  const tabId = activeTabId;
  await loadAuxiliaryCaptureStatus(tabId);
  const response = await browser.runtime.sendMessage({
    type: 'CAPTURE_AUXILIARY_SESSION_SET',
    tabId: Number(tabId),
    enabled: !auxiliaryCaptureEnabled.value,
  }) as { ok: boolean; enabled?: boolean; error?: string };
  // 停止消息即使送达失败，后台也会关闭会话；UI 需以返回状态为准。
  auxiliaryCaptureEnabled.value = Boolean(response.enabled);
  if (!response.ok) {
    error.value = response.error ?? '辅助抓包启动失败，请重新打开生意参谋页面';
    return;
  }
  if (auxiliaryCaptureEnabled.value) auxiliaryRecords.value = [];
}

async function clearAuxiliaryRecords(): Promise<void> {
  await getActiveTab();
  const tabId = activeTabId;
  if (!tabId) return;
  await browser.runtime.sendMessage({ type: 'CAPTURE_CLEAR', pageId: tabId, interfaceId: AUXILIARY_CAPTURE_INTERFACE_ID });
  if (activeTabId === tabId) auxiliaryRecords.value = [];
}

async function exportAuxiliaryRecords(): Promise<void> {
  await refreshActiveTabData();
  if (auxiliaryRecords.value.length === 0) return;
  downloadCaptureRecords(auxiliaryRecords.value, '商品排行接口抓包');
}

function downloadCaptureRecords(records: RequestRecord[], featureName: string): void {
  // 两种抓包导出使用相同下载流程，统一处理序列化、临时 URL 和释放时机。
  const blob = new Blob([serializeCaptureRecords(records)], { type: 'application/json;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = createCaptureExportFilename(featureName);
  link.click();
  URL.revokeObjectURL(link.href);
}

async function loadAuxiliaryCaptureStatus(tabId: string): Promise<void> {
  if (!tabId) {
    auxiliaryCaptureEnabled.value = false;
    return;
  }
  const response = await browser.runtime.sendMessage({ type: 'CAPTURE_AUXILIARY_SESSION_GET_STATUS', tabId: Number(tabId) }) as { enabled?: boolean };
  if (activeTabId === tabId) auxiliaryCaptureEnabled.value = Boolean(response.enabled);
}

async function refreshActiveTabData(): Promise<void> {
  await getActiveTab();
  const tabId = activeTabId;
  if (!tabId) {
    records.value = [];
    auxiliaryRecords.value = [];
    auxiliaryCaptureEnabled.value = false;
    return;
  }
  await Promise.all([readRecordsForTab(tabId), loadAuxiliaryCaptureStatus(tabId)]);
}

function handleRuntimeMessage(message: { type?: string; pageId?: string; interfaceId?: string }): void {
  if (message.type === 'CAPTURE_RECORD_UPDATED' && message.pageId === activeTabId && (message.interfaceId === coreIndexFeature.id || message.interfaceId === itemRankFeature.id || message.interfaceId === AUXILIARY_CAPTURE_INTERFACE_ID)) void readRecordsForTab(activeTabId);
}

function handleTabActivated(): void {
  // 侧边栏常驻时必须同步到新活动标签页，避免按钮操作上一页的会话和记录。
  void refreshActiveTabData();
}

onMounted(async () => {
  browser.runtime.onMessage.addListener(handleRuntimeMessage);
  browser.tabs.onActivated.addListener(handleTabActivated);
  await refreshActiveTabData();
  await loadScheduleStatus();
  await loadAuxiliaryCaptureStatus(activeTabId);
});
onUnmounted(() => {
  browser.runtime.onMessage.removeListener(handleRuntimeMessage);
  browser.tabs.onActivated.removeListener(handleTabActivated);
});
</script>
