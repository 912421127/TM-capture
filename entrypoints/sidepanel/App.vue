<template>
  <main class="app-shell">
    <header class="app-header">
      <div>
        <h1>生意参谋采集助手</h1>
        <p>采集最新数据，并按模块导出 Excel 或 CSV</p>
      </div>
      <a-tag :color="connected ? 'success' : 'warning'">{{ connected ? '已连接' : '未连接' }}</a-tag>
    </header>

    <div class="connection-actions">
      <a-button v-if="!connected" type="primary" @click="openSycm">打开生意参谋</a-button>
      <a-button @click="checkConnection">刷新连接状态</a-button>
    </div>

    <a-tabs v-model:active-key="activeFeature" size="small">
      <a-tab-pane v-for="definition in featureDefinitions" :key="definition.id" :tab="definition.label">
        <FeaturePanel
          :definition="definition"
          :filters="filtersByFeature[definition.id]"
          :capture="capturesByFeature[definition.id]"
          :connected="connected"
          :capturing="capturing"
          :progress="activeFeature === definition.id ? progress : ''"
          :error="activeFeature === definition.id ? error : ''"
          :categories="categories"
          @update:filters="filtersByFeature[definition.id] = $event"
          @capture="startCapture(definition.id)"
          @export-excel="exportResult(definition.id, 'xlsx')"
          @export-csv="exportResult(definition.id, 'csv')"
          @clear="clearResult(definition.id)"
        />
      </a-tab-pane>
    </a-tabs>

    <section v-if="diagnosticMode" class="diagnostic-panel">
      <div class="diagnostic-header">
        <div>
          <h2>接口诊断</h2>
          <p>仅诊断构建可用。开启后刷新页面，并依次操作三个目标模块。</p>
        </div>
        <a-switch :checked="diagnosticEnabled" checked-children="开" un-checked-children="关" @change="toggleDiagnostic" />
      </div>
      <a-alert
        type="info"
        show-icon
        message="敏感值会在离开页面前脱敏，记录只保存在后台内存中。"
      />
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
import { onMounted, onUnmounted, ref } from 'vue';
import FeaturePanel from './FeaturePanel.vue';
import { createDefaultFilters, featureDefinitions } from '../../src/features/definitions';
import type {
  CaptureFailure,
  CaptureProgress,
  CaptureRequest,
  CaptureSuccess,
  FeatureFiltersMap,
  FeatureId,
  LatestCapture,
} from '../../src/shared/capture';
import type { DiagnosticRecord } from '../../src/shared/diagnostic';
import { buildExportFileName, createExcelBlob, downloadBlob, rowsToCsv } from '../../src/shared/export';
import {
  clearLatestCapture,
  initializeStorage,
  loadFilters,
  loadLatestCapture,
  saveFilters,
} from '../../src/shared/storage';

interface CategoryOption {
  label: string;
  value: string;
}

const featureIds: FeatureId[] = ['business-overview', 'store-product-rank', 'market-product-rank'];
const activeFeature = ref<FeatureId>('business-overview');
const connected = ref(false);
const capturing = ref(false);
const activeRequestId = ref('');
const progress = ref('');
const error = ref('');
const categories = ref<CategoryOption[]>([]);
const diagnosticMode = import.meta.env.MODE === 'diagnostic';
const diagnosticEnabled = ref(false);
const diagnosticRecords = ref<DiagnosticRecord[]>([]);

const filtersByFeature = ref<Record<FeatureId, FeatureFiltersMap[FeatureId]>>({
  'business-overview': createDefaultFilters('business-overview'),
  'store-product-rank': createDefaultFilters('store-product-rank'),
  'market-product-rank': createDefaultFilters('market-product-rank'),
});

const capturesByFeature = ref<Record<FeatureId, LatestCapture | null>>({
  'business-overview': null,
  'store-product-rank': null,
  'market-product-rank': null,
});

async function checkConnection(): Promise<void> {
  const response = (await browser.runtime.sendMessage({ type: 'CONNECTION_CHECK' })) as { connected?: boolean };
  connected.value = Boolean(response?.connected);
}

async function openSycm(): Promise<void> {
  await browser.runtime.sendMessage({ type: 'OPEN_SYCM' });
}

async function startCapture(featureId: FeatureId): Promise<void> {
  const requestId = crypto.randomUUID();
  const filters = filtersByFeature.value[featureId];
  await saveFilters(featureId, filters);
  capturing.value = true;
  activeRequestId.value = requestId;
  progress.value = '正在准备采集…';
  error.value = '';

  try {
    const request: CaptureRequest = { type: 'CAPTURE_START', requestId, featureId, filters } as CaptureRequest;
    const response = (await browser.runtime.sendMessage(request)) as CaptureSuccess | CaptureFailure | undefined;
    if (!response) throw new Error('后台没有返回采集结果，请重新加载插件后重试。');
    if (response.type === 'CAPTURE_FAILURE') throw new Error(response.error);
    capturesByFeature.value[featureId] = response.capture;
    progress.value = `采集完成，共 ${response.capture.rows.length} 行。`;
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : '采集失败，请刷新页面后重试。';
    progress.value = '';
  } finally {
    capturing.value = false;
    activeRequestId.value = '';
  }
}

async function clearResult(featureId: FeatureId): Promise<void> {
  await clearLatestCapture(featureId);
  capturesByFeature.value[featureId] = null;
  progress.value = '';
  error.value = '';
}

async function exportResult(featureId: FeatureId, extension: 'xlsx' | 'csv'): Promise<void> {
  const capture = capturesByFeature.value[featureId];
  const definition = featureDefinitions.find((item) => item.id === featureId);
  if (!capture || !definition) return;
  const fileName = buildExportFileName(
    definition.label,
    capture.filters.startDate,
    capture.filters.endDate,
    new Date(),
    extension,
  );

  if (extension === 'csv') {
    downloadBlob(rowsToCsv(definition.columns, capture.rows), 'text/csv;charset=utf-8', fileName);
    return;
  }
  const excelBlob = await createExcelBlob(definition.label, definition.columns, capture.rows);
  downloadBlob(excelBlob, excelBlob.type, fileName);
}

async function toggleDiagnostic(enabled: boolean): Promise<void> {
  const response = (await browser.runtime.sendMessage({ type: 'DIAGNOSTIC_SET_ENABLED', enabled })) as {
    ok: boolean;
    error?: string;
  };
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
  for (const featureId of featureIds) {
    capturesByFeature.value[featureId] = await loadLatestCapture(featureId);
    filtersByFeature.value[featureId] = (await loadFilters(featureId)) ?? createDefaultFilters(featureId);
  }
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
