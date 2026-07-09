<template>
    <div style="padding: 16px;">
        <a-card title="API 返回数据" :bordered="false">
            <template v-if="responseData">
                <a-descriptions :column="1" size="small" bordered>
                    <a-descriptions-item label="时间">{{ responseData.time }}</a-descriptions-item>
                    <a-descriptions-item label="状态码">{{ responseData.status }}</a-descriptions-item>
                    <a-descriptions-item label="响应数据">
                        <pre style="max-height: 400px; overflow: auto; font-size: 12px; margin: 0; white-space: pre-wrap;">
{{ formatJSON(responseData.data) }}</pre>
                    </a-descriptions-item>
                </a-descriptions>
                <div style="margin-top: 12px; display: flex; gap: 8px;">
                    <a-button type="primary" @click="downloadJSON">下载 JSON</a-button>
                    <a-button danger @click="clearData">重新抓取</a-button>
                </div>
            </template>
            <a-empty v-else description="暂无数据，请先刷新淘宝商品页面" />
        </a-card>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

interface ResponseData {
    url: string;
    time: string;
    status: number;
    data: any;
}

const responseData = ref<ResponseData | null>(null);

async function loadData() {
    const data = await browser.storage.local.get('last_response');
    responseData.value = (data.last_response as ResponseData) || null;
}

async function clearData() {
    // 清除数据和抓取标记，允许重新抓取
    await browser.storage.local.remove(['last_response', '_captured']);
    responseData.value = null;
}

function downloadJSON() {
    if (!responseData.value) return;
    const blob = new Blob([formatJSON(responseData.value.data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `captured_data_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

function formatJSON(data: any): string {
    return JSON.stringify(data, null, 2);
}

onMounted(loadData);
</script>