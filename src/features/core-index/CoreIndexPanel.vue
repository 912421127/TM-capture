<template>
  <section class="interface-panel">
    <header class="interface-header">
      <div>
        <h2>数据概览</h2>
        <p>已记录 {{ records.length }} 条请求</p>
      </div>
      <div class="actions">
        <button type="button" @click="$emit('refresh')">刷新</button>
        <button type="button" :disabled="records.length === 0" @click="$emit('export')">导出 JSON</button>
        <button type="button" :disabled="records.length === 0" @click="$emit('clear')">清空</button>
      </div>
    </header>

    <div class="auto-capture-bar">
      <label>
        <input :checked="enabled" type="checkbox" @change="$emit('update:enabled', ($event.target as HTMLInputElement).checked)" />
        定时获取
      </label>
      <select :value="intervalMinutes" :disabled="!enabled" @change="$emit('update:interval', Number(($event.target as HTMLSelectElement).value))">
        <option v-for="interval in intervals" :key="interval" :value="interval">每 {{ interval }} 分钟</option>
      </select>
      <span v-if="enabled">已开启{{ nextRunAt ? `，下次获取：${formatTime(nextRunAt)}` : '' }}</span>
      <span v-else>已关闭</span>
    </div>

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

    <p v-else class="empty">暂无数据，点击“刷新”开始获取。</p>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { RequestRecord } from '../../shared/request-capture';
import { buildCoreIndexTable } from './table';

const props = defineProps<{
  records: RequestRecord[];
  enabled: boolean;
  intervalMinutes: number;
  intervals: readonly number[];
  nextRunAt?: number;
}>();

defineEmits<{
  refresh: [];
  export: [];
  clear: [];
  'update:enabled': [enabled: boolean];
  'update:interval': [intervalMinutes: number];
}>();

const percentMetricKeys = new Set([
  'payRate', 'payAmtRfdRate', 'ordRfdRate', 'oldRepeatByrRate',
  'consultRate', 'disputeDutyRatio', 'gotInTime24hRate', 'sucRefundRate',
]);

const table = computed(() => {
  const latestRecord = [...props.records].reverse()[0];
  return latestRecord ? buildCoreIndexTable(latestRecord.responseBody) : { columns: [], rows: [] };
});

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
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
</script>
