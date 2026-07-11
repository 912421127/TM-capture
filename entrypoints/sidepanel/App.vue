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

    <details v-for="record in records" :key="record.id" class="record">
      <summary>
        <span class="method">{{ record.method }}</span>
        <span class="status">{{ record.status }}</span>
        <span class="url">{{ shortUrl(record.url) }}</span>
      </summary>
      <div class="detail">
        <p>类型：{{ record.transport }} · {{ record.contentType || '未知' }}</p>
        <p>时间：{{ record.capturedAt }}</p>
        <pre v-if="record.responseBody">{{ formatBody(record.responseBody) }}</pre>
        <p v-else class="muted">未记录响应正文（二进制或空响应）</p>
      </div>
    </details>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { buildCoreIndexTable, formatCaptureUrl, serializeCaptureRecords, type RequestRecord } from '../../src/shared/request-capture';

const records = ref<RequestRecord[]>([]);
const pageLabel = ref('正在读取当前页面');
const error = ref('');
let activeTabId = '';
const autoCaptureEnabled = ref(false);
const nextRunAt = ref<number | undefined>();
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

async function triggerCurrentPageLoad(): Promise<void> {
  // 侧边栏刚打开时，Chrome 可能还没完成活动 Tab 切换，稍等一帧再获取目标。
  await new Promise((resolve) => window.setTimeout(resolve, 300));
  await getActiveTab();
  if (!activeTabId || !pageLabel.value.includes('生意参谋')) return;
  const tabId = Number(activeTabId);

  // 直接在当前 Tab 执行滚动，避免内容脚本尚未注册消息监听时没有任何视觉反馈。
  try {
    await browser.scripting.executeScript({
      target: { tabId },
      func: () => {
        const elements = [...document.querySelectorAll<HTMLElement>('h1,h2,h3,h4,div,span')]
          .filter((element) => element.textContent?.includes('数据概览'))
          .sort((left, right) => (left.textContent?.length ?? Infinity) - (right.textContent?.length ?? Infinity));
        const target = elements[0];
        if (target) {
          target.scrollIntoView({ behavior: 'auto', block: 'center' });
        } else {
          window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'auto' });
        }

        // 生意参谋部分区域使用内部滚动容器，单独滚动 window 不会触发它们的懒加载。
        const scrollableElements = [...document.querySelectorAll<HTMLElement>('*')]
          .filter((element) => element.scrollHeight > element.clientHeight + 40);
        for (const element of scrollableElements) {
          element.scrollTop = element.scrollHeight;
          element.dispatchEvent(new Event('scroll', { bubbles: true }));
        }
      },
    });
  } catch {
    error.value = '无法操作当前页面，请确认当前 Tab 是生意参谋页面';
  }

  // 打开侧边栏时直接操作当前 Tab，不新开页面，也不刷新用户正在浏览的页面。
  try {
    await browser.tabs.sendMessage(tabId, { type: 'LOAD_CORE_INDEX_TABLE' });
  } catch {
    error.value = '当前页面脚本尚未就绪，请刷新生意参谋页面后重试';
  }
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

function shortUrl(url: string): string {
  return formatCaptureUrl(url);
}

function formatBody(body: string): string {
  try {
    return JSON.stringify(JSON.parse(body), null, 2);
  } catch {
    return body;
  }
}

function formatMetric(key: string, value: number | null): string {
  if (value === null) return '-';
  const percentKeys = new Set([
    'payRate', 'payAmtRfdRate', 'ordRfdRate', 'oldRepeatByrRate',
    'consultRate', 'disputeDutyRatio', 'gotInTime24hRate', 'sucRefundRate',
  ]);
  if (percentKeys.has(key)) return `${(value * 100).toFixed(2)}%`;
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
