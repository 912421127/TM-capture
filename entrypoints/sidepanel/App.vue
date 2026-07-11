<template>
  <main class="app-shell">
    <!-- 侧边栏只服务经营概览，后续新增接口时再增加独立模块，不在这里保留旧排行分支。 -->
    <header class="app-header">
      <div>
        <h1>经营概览采集</h1>
        <p>获取生意参谋首页数据并导出结果</p>
      </div>
      <a-tag :color="connected ? 'success' : 'warning'">{{ connected ? '已连接' : '未连接' }}</a-tag>
    </header>

    <div class="connection-actions">
      <a-button v-if="!connected" type="primary" @click="openSycm">打开生意参谋</a-button>
      <a-button @click="checkConnection">刷新连接状态</a-button>
    </div>

    <section class="overview-panel">
      <a-alert
        v-if="!connected"
        type="warning"
        show-icon
        message="尚未连接生意参谋"
        description="请先打开并登录生意参谋，再开始采集。"
      />
      <a-alert v-if="error" class="notice" type="error" show-icon message="采集失败" :description="error" />
      <a-alert v-if="progress" class="notice" type="info" show-icon message="采集进度" :description="progress" />

      <div class="filter-grid">
        <label>
          <span>开始日期</span>
          <input v-model="filters.startDate" type="date" :disabled="capturing" />
        </label>
        <label>
          <span>结束日期</span>
          <input v-model="filters.endDate" type="date" :disabled="capturing" />
        </label>
      </div>

      <div class="actions">
        <a-button type="primary" :loading="capturing" :disabled="!connected" @click="startCapture">
          {{ capturing ? '正在采集' : '开始采集' }}
        </a-button>
        <a-button :disabled="!capture || capturing" @click="exportResult('xlsx')">导出 Excel</a-button>
        <a-button :disabled="!capture || capturing" @click="exportResult('csv')">导出 CSV</a-button>
        <a-button danger :disabled="!capture || capturing" @click="clearResult">清空结果</a-button>
      </div>

      <template v-if="capture">
        <div class="result-meta">
          <span>采集时间：{{ formatCapturedAt(capture.capturedAt) }}</span>
          <span>共 {{ capture.rows.length }} 行</span>
        </div>
        <div v-if="summaryEntries.length" class="summary-grid">
          <div v-for="[label, value] in summaryEntries" :key="label" class="summary-item">
            <span>{{ label }}</span>
            <strong>{{ formatCellValue(value) }}</strong>
          </div>
        </div>
        <a-table
          size="small"
          :columns="tableColumns"
          :data-source="capture.rows"
          :scroll="{ x: 'max-content' }"
          :pagination="{ pageSize: 20, showSizeChanger: false }"
          row-key="date"
        >
          <template #bodyCell="{ column, record }">
            <span>{{ formatCellValue(record[column.key], column.format) }}</span>
          </template>
        </a-table>
      </template>
      <a-empty v-else class="empty-result" description="尚未采集经营概览" />
    </section>

    <section v-if="diagnosticMode" class="diagnostic-panel">
      <!-- 诊断能力保留给后续接口扩展使用，生产构建不会显示此区域。 -->
      <div class="diagnostic-header">
        <div>
          <h2>接口诊断</h2>
          <p>开启后刷新生意参谋页面，再操作经营概览面板。</p>
        </div>
        <a-switch :checked="diagnosticEnabled" checked-children="开" un-checked-children="关" @change="toggleDiagnostic" />
      </div>
      <a-alert type="info" show-icon message="敏感值会在离开页面前脱敏，记录只保存在后台内存中。" />
      <div class="diagnostic-actions">
        <span>已记录 {{ diagnosticRecords.length }} 条请求</span>
        <a-button size="small" :disabled="diagnosticRecords.length === 0" @click="exportDiagnostics">导出脱敏样本</a-button>
      </div>
      <div class="diagnostic-list">
        <details v-for="record in diagnosticRecords" :key="record.id">
          <summary>{{ record.method }} · {{ record.status }} · {{ diagnosticPath(record.url) }}</summary>
          <pre>{{ JSON.stringify(record, null, 2) }}</pre>
        </details>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
// 根组件只协调经营概览采集、结果展示、导出和诊断消息，具体接口转换位于 feature 模块。
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { businessOverviewColumns, createDefaultBusinessOverviewFilters } from '../../src/features/business-overview';
import type {
  BusinessOverviewFilters,
  CaptureFailure,
  CaptureProgress,
  CaptureRequest,
  CaptureSuccess,
  LatestCapture,
} from '../../src/shared/capture';
import type { DiagnosticRecord } from '../../src/shared/diagnostic';
import { requestDiagnosticToggle } from '../../src/shared/diagnostic-control';
import { buildExportFileName, createExcelBlob, downloadBlob, rowsToCsv } from '../../src/shared/export';
import { formatCellValue } from '../../src/shared/format';
import { clearLatestCapture, initializeStorage, loadFilters, loadLatestCapture, saveFilters } from '../../src/shared/storage';

const featureId = 'business-overview' as const;
const filters = ref<BusinessOverviewFilters>(createDefaultBusinessOverviewFilters());
const capture = ref<LatestCapture<'business-overview'> | null>(null);
const connected = ref(false);
const capturing = ref(false);
const activeRequestId = ref('');
const progress = ref('');
const error = ref('');
const diagnosticMode = import.meta.env.MODE === 'diagnostic';
const diagnosticEnabled = ref(false);
const diagnosticRecords = ref<DiagnosticRecord[]>([]);

const tableColumns = computed(() => businessOverviewColumns.map((column) => ({ ...column, title: column.label, dataIndex: column.key })));
const summaryEntries = computed(() => Object.entries(capture.value?.summary ?? {}));

async function checkConnection(): Promise<void> {
  const response = (await browser.runtime.sendMessage({ type: 'CONNECTION_CHECK' })) as { connected?: boolean };
  connected.value = Boolean(response?.connected);
}

async function openSycm(): Promise<void> {
  await browser.runtime.sendMessage({ type: 'OPEN_SYCM' });
}

async function startCapture(): Promise<void> {
  const requestId = crypto.randomUUID();
  await saveFilters(featureId, filters.value);
  capturing.value = true;
  activeRequestId.value = requestId;
  progress.value = '正在准备采集…';
  error.value = '';

  try {
    const request: CaptureRequest<'business-overview'> = { type: 'CAPTURE_START', requestId, featureId, filters: filters.value };
    const response = (await browser.runtime.sendMessage(request)) as CaptureSuccess<'business-overview'> | CaptureFailure | undefined;
    if (!response) throw new Error('后台没有返回采集结果，请重新加载插件后重试。');
    if (response.type === 'CAPTURE_FAILURE') throw new Error(response.error);
    capture.value = response.capture;
    progress.value = `采集完成，共 ${response.capture.rows.length} 行。`;
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : '采集失败，请刷新页面后重试。';
    progress.value = '';
  } finally {
    capturing.value = false;
    activeRequestId.value = '';
  }
}

async function clearResult(): Promise<void> {
  await clearLatestCapture(featureId);
  capture.value = null;
  progress.value = '';
  error.value = '';
}

function formatCapturedAt(value: string): string {
  return new Date(value).toLocaleString('zh-CN', { hour12: false });
}

async function exportResult(extension: 'xlsx' | 'csv'): Promise<void> {
  if (!capture.value) return;
  const fileName = buildExportFileName(
    '经营概览',
    capture.value.filters.startDate,
    capture.value.filters.endDate,
    new Date(),
    extension,
  );

  if (extension === 'csv') {
    downloadBlob(rowsToCsv(businessOverviewColumns, capture.value.rows), 'text/csv;charset=utf-8', fileName);
    return;
  }
  const excelBlob = await createExcelBlob('经营概览', businessOverviewColumns, capture.value.rows);
  downloadBlob(excelBlob, excelBlob.type, fileName);
}

async function toggleDiagnostic(enabled: boolean): Promise<void> {
  const response = await requestDiagnosticToggle(enabled, browser.runtime.sendMessage);
  if (!response.ok) {
    error.value = response.error ?? '无法启动接口诊断。';
    return;
  }
  diagnosticEnabled.value = enabled;
  if (enabled) diagnosticRecords.value = [];
}

function diagnosticPath(url: string): string {
  const parsed = new URL(url);
  return `${parsed.pathname}${parsed.search}`;
}

function exportDiagnostics(): void {
  const content = JSON.stringify({ exportedAt: new Date().toISOString(), records: diagnosticRecords.value }, null, 2);
  downloadBlob(content, 'application/json', `生意参谋接口诊断_${Date.now()}.json`);
}

function handleRuntimeMessage(message: { type?: string; record?: DiagnosticRecord } & Partial<CaptureProgress>): void {
  if (message.type === 'CAPTURE_PROGRESS' && message.requestId === activeRequestId.value) {
    progress.value = message.message ?? '';
  }
  if (message.type === 'DIAGNOSTIC_UPDATE' && message.record) {
    diagnosticRecords.value = [...diagnosticRecords.value, message.record].slice(-100);
  }
}

onMounted(async () => {
  await initializeStorage();
  capture.value = await loadLatestCapture(featureId);
  filters.value = (await loadFilters(featureId)) ?? createDefaultBusinessOverviewFilters();
  if (diagnosticMode) {
    const response = (await browser.runtime.sendMessage({ type: 'DIAGNOSTIC_LIST' })) as { records?: DiagnosticRecord[] };
    diagnosticRecords.value = response.records ?? [];
  }
  browser.runtime.onMessage.addListener(handleRuntimeMessage);
  await checkConnection();
});

onUnmounted(() => {
  browser.runtime.onMessage.removeListener(handleRuntimeMessage);
});
</script>
