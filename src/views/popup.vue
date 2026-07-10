<template>
    <div class="popup-page">
        <a-card title="生意参谋商品排行采集" :bordered="false">
            <template v-if="captureResult">
                <a-alert
                    :type="captureResult.status === 'success' ? 'success' : 'error'"
                    :message="statusText"
                    :description="captureResult.status === 'success' ? '已保存最新一份采集结果。' : captureResult.error"
                    show-icon
                />
                <a-descriptions class="capture-details" :column="1" size="small" bordered>
                    <a-descriptions-item label="来源">{{ sourceText }}</a-descriptions-item>
                    <a-descriptions-item label="采集时间">{{ formatTime(captureResult.capturedAt) }}</a-descriptions-item>
                    <a-descriptions-item label="接口状态">{{ captureResult.httpStatus }}</a-descriptions-item>
                </a-descriptions>
                <pre v-if="captureResult.status === 'success'" class="response-data">{{ formatJSON(captureResult.data) }}</pre>
                <div class="button-list">
                    <a-button v-if="captureResult.status === 'success'" type="primary" @click="downloadJSON">下载 JSON</a-button>
                    <a-button danger @click="clearData">清空采集结果</a-button>
                </div>
            </template>
            <a-empty v-else description="暂无采集结果。请打开生意参谋商品排行页面并刷新页面。" />
        </a-card>
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';

type CaptureSource = 'page-json' | 'export-excel';

interface CaptureResult {
    status: 'success' | 'error';
    source: CaptureSource;
    url: string;
    httpStatus: number;
    capturedAt: string;
    data?: unknown;
    error?: string;
}

const captureResult = ref<CaptureResult | null>(null);
const runtimeError = ref('');

const sourceText = computed(() => captureResult.value?.source === 'export-excel' ? '导出 Excel 接口' : '页面 JSON 接口');
const statusText = computed(() => {
    if (runtimeError.value) return '采集结果保存失败';
    return captureResult.value?.status === 'success' ? '采集成功' : '采集失败';
});

async function loadData() {
    const data = await browser.storage.local.get('last_response');
    captureResult.value = (data.last_response as CaptureResult) || null;
}

async function clearData() {
    await browser.storage.local.remove('last_response');
    captureResult.value = null;
    runtimeError.value = '';
}

function formatTime(value: string) {
    return new Date(value).toLocaleString('zh-CN', { hour12: false });
}

function formatJSON(data: unknown): string {
    return JSON.stringify(data, null, 2);
}

function downloadJSON() {
    if (!captureResult.value || captureResult.value.status !== 'success') return;
    const blob = new Blob([formatJSON(captureResult.value.data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `生意参谋商品排行_${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
}

function handleStorageChange(changes: Record<string, { newValue?: unknown }>, areaName: string) {
    if (areaName === 'local' && changes.last_response) {
        captureResult.value = (changes.last_response.newValue as CaptureResult) || null;
    }
}

function handleRuntimeMessage(message: { type?: string; error?: string }) {
    if (message.type === 'SYCM_CAPTURE_STORAGE_ERROR') runtimeError.value = message.error || '采集结果保存失败。';
}

onMounted(() => {
    void loadData();
    browser.storage.onChanged.addListener(handleStorageChange);
    browser.runtime.onMessage.addListener(handleRuntimeMessage);
});

onUnmounted(() => {
    browser.storage.onChanged.removeListener(handleStorageChange);
    browser.runtime.onMessage.removeListener(handleRuntimeMessage);
});
</script>

<style scoped>
.popup-page {
    min-width: 360px;
    padding: 16px;
}

.capture-details {
    margin-top: 12px;
}

.response-data {
    max-height: 300px;
    margin: 12px 0 0;
    overflow: auto;
    font-size: 12px;
    white-space: pre-wrap;
}

.button-list {
    display: flex;
    gap: 8px;
    margin-top: 12px;
}
</style>
