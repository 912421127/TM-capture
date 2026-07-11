<template>
  <main class="page">
    <header class="header">
      <div>
        <h1>接口分析</h1>
        <p>{{ pageLabel }}</p>
      </div>
      <div class="actions">
        <button type="button" @click="loadRecords">刷新</button>
        <button type="button" :disabled="records.length === 0" @click="exportRecords">导出 JSON</button>
        <button type="button" @click="clearRecords">清空</button>
      </div>
    </header>

    <section class="auto-capture-bar">
      <label>
        <input v-model="autoCaptureEnabled" type="checkbox" @change="toggleAutoCapture" />
        每小时自动获取
      </label>
      <span v-if="autoCaptureEnabled">已开启{{ nextRunAt ? `，下次获取：${formatTime(nextRunAt)}` : '' }}</span>
      <span v-else>已关闭</span>
    </section>

    <p v-if="error" class="error">{{ error }}</p>
    <p v-else class="summary">已记录 {{ records.length }} 条请求</p>

    <section v-if="table.columns.length > 0" class="overview-table-wrap">
      <table class="overview-table">
        <thead>
          <tr>
            <th>指标名称</th>
            <th v-for="column in table.columns" :key="column.timestamp">{{ column.label }}<br /><span>较上一周期</span></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in table.rows" :key="row.key">
            <th>{{ row.label }}</th>
            <td v-for="(cell, index) in row.cells" :key="`${row.key}-${index}`">
              <span>{{ formatMetric(row.key, cell.value) }}</span>
              <span v-if="cell.change !== null" :class="cell.change >= 0 ? 'change-up' : 'change-down'">{{ formatChange(cell.change) }}</span>
              <span v-else class="change-empty">-</span>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <section v-else-if="records.length === 0" class="empty">
      请先打开生意参谋页面并操作，匹配到的接口会显示在这里。
    </section>

  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { buildCoreIndexTable, serializeCaptureRecords, type RequestRecord } from '../../src/shared/request-capture';

const records = ref<RequestRecord[]>([]);
const pageLabel = ref('正在读取当前页面');
const error = ref('');
let activeTabId = '';
const autoCaptureEnabled = ref(false);
const nextRunAt = ref<number | undefined>();

// 这些指标在接口中以小数表示比例，展示时统一转换为百分比。
const percentMetricKeys = new Set([
  'payRate', 'payAmtRfdRate', 'ordRfdRate', 'oldRepeatByrRate',
  'consultRate', 'disputeDutyRatio', 'gotInTime24hRate', 'sucRefundRate',
]);

// 同一个接口可能被手动刷新和定时任务多次调用，只显示最新一次完整响应即可。
const table = computed(() => {
  const record = [...records.value].reverse().find((item) => item.url.includes('/portal/coreIndex/new/getTableData/v3.json'));
  return record ? buildCoreIndexTable(record.responseBody) : { columns: [], rows: [] };
});

async function getActiveTab(): Promise<void> {
  const tabs = await browser.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];
  activeTabId = tab?.id === undefined ? '' : String(tab.id);
  pageLabel.value = tab?.url?.includes('sycm.taobao.com') ? '当前生意参谋页面' : '当前页面不是生意参谋';
}

async function loadRecords(): Promise<void> {
  error.value = '';
  await getActiveTab();
  if (!activeTabId) return;

  if (!pageLabel.value.includes('生意参谋')) {
    error.value = '当前页面不是生意参谋';
    return;
  }

  // 直接在当前页面上下文调用目标接口，不再依赖滚动触发懒加载。
  await browser.tabs.sendMessage(Number(activeTabId), { type: 'LOAD_CORE_INDEX_DIRECT' });
  await new Promise((resolve) => window.setTimeout(resolve, 1500));
  await readRecords();
}

async function readRecords(): Promise<void> {
  await getActiveTab();
  if (!activeTabId) return;
  const response = await browser.runtime.sendMessage({ type: 'CAPTURE_LIST', pageId: activeTabId }) as { records?: RequestRecord[] };
  records.value = response.records ?? [];
}

async function clearRecords(): Promise<void> {
  if (!activeTabId) return;
  await browser.runtime.sendMessage({ type: 'CAPTURE_CLEAR', pageId: activeTabId });
  records.value = [];
}

async function loadAutoCaptureStatus(): Promise<void> {
  const response = await browser.runtime.sendMessage({ type: 'AUTO_CAPTURE_GET_STATUS' }) as { enabled?: boolean; nextRunAt?: number };
  autoCaptureEnabled.value = Boolean(response.enabled);
  nextRunAt.value = response.nextRunAt;
}

async function toggleAutoCapture(): Promise<void> {
  await getActiveTab();
  if (autoCaptureEnabled.value && !activeTabId) {
    autoCaptureEnabled.value = false;
    error.value = '请先打开生意参谋页面';
    return;
  }
  if (autoCaptureEnabled.value && !pageLabel.value.includes('生意参谋')) {
    autoCaptureEnabled.value = false;
    error.value = '当前页面不是生意参谋，无法开启自动获取';
    return;
  }
  const response = await browser.runtime.sendMessage({
    type: 'AUTO_CAPTURE_SET',
    enabled: autoCaptureEnabled.value,
    tabId: activeTabId ? Number(activeTabId) : undefined,
  }) as { ok: boolean; error?: string; nextRunAt?: number };
  if (!response.ok) {
    autoCaptureEnabled.value = false;
    error.value = response.error ?? '自动获取启动失败';
    return;
  }
  nextRunAt.value = response.nextRunAt;
  await loadRecords();
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}

function exportRecords(): void {
  if (records.value.length === 0) return;
  const blob = new Blob([serializeCaptureRecords(records.value)], { type: 'application/json;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `生意参谋接口分析_${Date.now()}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
}

function formatMetric(key: string, value: number | null): string {
  if (value === null) return '-';
  if (percentMetricKeys.has(key)) return `${(value * 100).toFixed(2)}%`;
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(2);
}

function formatChange(value: number): string {
  return `${value >= 0 ? '+' : ''}${(value * 100).toFixed(2)}%`;
}

onMounted(async () => {
  browser.runtime.onMessage.addListener(handleRuntimeMessage);
  await loadRecords();
  await loadAutoCaptureStatus();
});

function handleRuntimeMessage(message: { type?: string; pageId?: string }): void {
  // 新记录到达时只刷新显示，不能再次触发接口，否则会形成请求循环。
  if (message.type === 'CAPTURE_RECORD_UPDATED' && message.pageId === activeTabId) void readRecords();
}

onUnmounted(() => {
  browser.runtime.onMessage.removeListener(handleRuntimeMessage);
});
</script>
