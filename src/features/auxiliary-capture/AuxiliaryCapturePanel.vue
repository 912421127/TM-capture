<template>
  <section class="interface-panel">
    <header class="interface-header">
      <div>
        <h2>商品排行接口辅助抓包</h2>
        <p>已记录 {{ records.length }} 条请求</p>
      </div>
      <div class="actions">
        <button type="button" @click="$emit('toggle')">{{ enabled ? '停止抓包' : '开始抓包' }}</button>
        <button type="button" :disabled="records.length === 0" @click="$emit('export')">导出 JSON</button>
        <button type="button" :disabled="records.length === 0" @click="$emit('clear')">清空</button>
      </div>
    </header>
    <p class="empty">{{ enabled ? '正在记录当前标签页内同源的 JSON 和文本请求。' : '开始后请在生意参谋页面手动打开商品排行，不会主动发起请求。' }}</p>
  </section>
</template>

<script setup lang="ts">
import type { RequestRecord } from '../../shared/request-capture';

defineProps<{ records: RequestRecord[]; enabled: boolean }>();
defineEmits<{ toggle: []; export: []; clear: [] }>();
</script>
