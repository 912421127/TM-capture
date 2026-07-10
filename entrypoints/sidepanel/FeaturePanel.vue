<template>
  <section class="feature-panel">
    <a-alert
      v-if="!connected"
      type="warning"
      show-icon
      message="尚未连接生意参谋"
      description="请先打开并登录生意参谋，再回到这里开始采集。"
    />
    <a-alert v-if="error" class="notice" type="error" show-icon message="采集失败" :description="error" />
    <a-alert v-if="progress" class="notice" type="info" show-icon message="正在采集" :description="progress" />

    <div class="filter-grid">
      <label>
        <span>开始日期</span>
        <input
          type="date"
          :value="filters.startDate"
          :disabled="capturing"
          @input="updateFilter('startDate', ($event.target as HTMLInputElement).value)"
        />
      </label>
      <label>
        <span>结束日期</span>
        <input
          type="date"
          :value="filters.endDate"
          :disabled="capturing"
          @input="updateFilter('endDate', ($event.target as HTMLInputElement).value)"
        />
      </label>
      <label v-if="rankFilters">
        <span>排行指标</span>
        <a-select
          :value="rankFilters.metric"
          :disabled="capturing"
          :options="metricOptions"
          @change="updateFilter('metric', $event)"
        />
      </label>
      <label v-if="marketFilters" class="full-width">
        <span>市场类目</span>
        <a-select
          show-search
          option-filter-prop="label"
          placeholder="请选择市场类目"
          :value="marketFilters.categoryId || undefined"
          :disabled="capturing"
          :options="categories"
          @change="updateCategory"
        />
      </label>
    </div>

    <div class="actions">
      <a-button
        data-action="capture"
        type="primary"
        :loading="capturing"
        :disabled="!connected"
        @click="$emit('capture')"
      >
        {{ capturing ? '正在采集' : '开始采集' }}
      </a-button>
      <a-button :disabled="!capture || capturing" @click="$emit('exportExcel')">导出 Excel</a-button>
      <a-button :disabled="!capture || capturing" @click="$emit('exportCsv')">导出 CSV</a-button>
      <a-button danger :disabled="!capture || capturing" @click="$emit('clear')">清空结果</a-button>
    </div>

    <template v-if="capture">
      <div class="result-meta">
        <span>采集时间：{{ formatCapturedAt(capture.capturedAt) }}</span>
        <span>共 {{ capture.rows.length }} 行</span>
      </div>
      <div v-if="summaryEntries.length" class="summary-grid">
        <div v-for="[label, value] in summaryEntries" :key="label" class="summary-item">
          <span>{{ label }}</span>
          <strong>{{ value }}</strong>
        </div>
      </div>
      <a-table
        size="small"
        :columns="tableColumns"
        :data-source="capture.rows"
        :scroll="{ x: 'max-content' }"
        :pagination="{ pageSize: 20, showSizeChanger: false }"
        row-key="rank"
      >
        <template #bodyCell="{ column, record }">
          <a v-if="column.format === 'link' && record[column.key]" :href="String(record[column.key])" target="_blank">
            打开
          </a>
          <span v-else>{{ formatCellValue(record[column.key], column.format) }}</span>
        </template>
      </a-table>
    </template>
    <a-empty v-else class="empty-result" :description="`尚未采集${definition.label}`" />
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { FeatureDefinition } from '../../src/features/definitions';
import type {
  FeatureFiltersMap,
  FeatureId,
  LatestCapture,
  MarketProductRankFilters,
  StoreProductRankFilters,
} from '../../src/shared/capture';
import { formatCellValue } from '../../src/shared/format';

interface CategoryOption {
  label: string;
  value: string;
}

const props = defineProps<{
  definition: FeatureDefinition;
  filters: FeatureFiltersMap[FeatureId];
  capture: LatestCapture | null;
  connected: boolean;
  capturing: boolean;
  progress: string;
  error: string;
  categories: CategoryOption[];
}>();

const emit = defineEmits<{
  capture: [];
  exportExcel: [];
  exportCsv: [];
  clear: [];
  'update:filters': [filters: FeatureFiltersMap[FeatureId]];
}>();

const metricOptions = [
  { label: '支付金额', value: 'payAmount' },
  { label: '访客数', value: 'visitorCount' },
  { label: '支付买家数', value: 'buyerCount' },
];

const rankFilters = computed<StoreProductRankFilters | null>(() => {
  return props.definition.id === 'business-overview' ? null : (props.filters as StoreProductRankFilters);
});

const marketFilters = computed<MarketProductRankFilters | null>(() => {
  return props.definition.id === 'market-product-rank' ? (props.filters as MarketProductRankFilters) : null;
});

const tableColumns = computed(() =>
  props.definition.columns.map((column) => ({ ...column, title: column.label, dataIndex: column.key })),
);

const summaryEntries = computed(() => Object.entries(props.capture?.summary ?? {}));

function updateFilter(key: string, value: unknown): void {
  emit('update:filters', { ...props.filters, [key]: value } as FeatureFiltersMap[FeatureId]);
}

function updateCategory(categoryId: string): void {
  const category = props.categories.find((item) => item.value === categoryId);
  emit('update:filters', {
    ...props.filters,
    categoryId,
    categoryName: category?.label ?? '',
  } as FeatureFiltersMap[FeatureId]);
}

function formatCapturedAt(value: string): string {
  return new Date(value).toLocaleString('zh-CN', { hour12: false });
}
</script>

<style scoped>
.feature-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.notice {
  margin-top: -8px;
}

.filter-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.filter-grid label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: #4b5563;
  font-size: 13px;
}

.filter-grid input {
  height: 32px;
  padding: 0 8px;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
}

.full-width {
  grid-column: 1 / -1;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.result-meta {
  display: flex;
  justify-content: space-between;
  color: #6b7280;
  font-size: 12px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.summary-item {
  padding: 10px;
  border-radius: 6px;
  background: #f5f7fa;
}

.summary-item span,
.summary-item strong {
  display: block;
}

.summary-item span {
  margin-bottom: 4px;
  color: #6b7280;
  font-size: 12px;
}

.empty-result {
  padding: 28px 0;
}
</style>
