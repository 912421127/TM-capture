<template>
  <section class="interface-panel item-rank-panel">
    <header class="interface-header">
      <div>
        <h2>商品排行</h2>
        <p>{{ table.recordCount ? `共 ${table.recordCount} 件商品，当前显示 ${table.rows.length} 件` : '还没有商品排行数据' }}</p>
      </div>
      <div class="actions">
        <button type="button" @click="$emit('refresh')">刷新</button>
        <button type="button" :disabled="table.rows.length === 0" @click="$emit('export')">导出 JSON</button>
        <button type="button" :disabled="table.rows.length === 0" @click="$emit('clear')">清空</button>
      </div>
    </header>

    <div class="item-rank-toolbar">
      <div class="item-rank-modes" role="tablist" aria-label="商品排行时间范围">
        <button
          v-for="item in modes"
          :key="item.value"
          type="button"
          :class="{ 'item-rank-mode-active': mode === item.value }"
          role="tab"
          :aria-selected="mode === item.value"
          @click="$emit('selectMode', item.value)"
        >{{ item.label }}</button>
      </div>
      <span class="item-rank-sort">历史按支付金额，实时按访客数</span>
    </div>

    <p v-if="error" class="error">{{ error }}</p>
    <p v-else-if="loading" class="empty">正在获取商品排行数据，请稍候…</p>
    <div v-else-if="table.rows.length > 0" class="item-rank-table-wrap">
      <table class="item-rank-table">
        <thead>
          <tr>
            <th class="item-rank-product-column">商品</th>
            <th v-for="metric in table.metrics" :key="metric.key">{{ metric.label }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in table.rows" :key="row.itemId">
            <th class="item-rank-product-cell">
              <div class="item-rank-product">
                <img v-if="row.imageUrl" :src="row.imageUrl" alt="" />
                <span v-else class="item-rank-image-empty">无图</span>
                <span class="item-rank-product-text">
                  <span class="item-rank-title" :title="row.title">{{ row.title || '未命名商品' }}</span>
                  <small>ID: {{ row.itemId || '-' }}</small>
                </span>
              </div>
            </th>
            <td v-for="metric in table.metrics" :key="`${row.itemId}-${metric.key}`">
              <span>{{ formatValue(metric.format, row.cells[metric.key].value) }}</span>
              <span :class="changeClass(row.cells[metric.key].change)">{{ formatChange(row.cells[metric.key].change) }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <p v-else class="empty">暂无数据，点击“刷新”获取当前模式的商品排行。</p>
  </section>
</template>

<script setup lang="ts">
import type { ItemRankMode } from './index';
import type { ItemRankMetricFormat, ItemRankTable } from './table';

defineProps<{
  table: ItemRankTable;
  mode: ItemRankMode;
  loading: boolean;
  error: string;
}>();

defineEmits<{
  selectMode: [mode: ItemRankMode];
  refresh: [];
  export: [];
  clear: [];
}>();

const modes: Array<{ value: ItemRankMode; label: string }> = [
  { value: 'realtime', label: '实时' },
  { value: 'recent7', label: '7天' },
  { value: 'recent30', label: '30天' },
];

function formatValue(format: ItemRankMetricFormat, value: number | string | null): string {
  if (value === null || value === '') return '-';
  if (typeof value === 'string' || format === 'text') return String(value);
  if (format === 'percent') return `${(value * 100).toFixed(2)}%`;
  if (format === 'currency') return value.toFixed(2);
  if (format === 'number') return Number.isInteger(value) ? String(value) : value.toFixed(2);
  return value.toFixed(2);
}

function formatChange(value: number | null): string {
  if (value === null) return '-';
  return `${value >= 0 ? '+' : ''}${(value * 100).toFixed(2)}%`;
}

function changeClass(value: number | null): string {
  if (value === null) return 'change-empty';
  return value >= 0 ? 'change-up' : 'change-down';
}
</script>
