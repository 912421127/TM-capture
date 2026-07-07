<template>
    <div class="popup-page">
        <div class="status-title">{{ 状态 }}</div>
        <div v-if="错误信息" class="error-message">{{ 错误信息 }}</div>
        <div v-else class="status-detail">查询日期：{{ 查询日期文本 }}</div>
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { 生意参谋商品排行页面 } from '@/lib/test';
import { downloadRowsAsCsv } from '../shared/csvExport';
import dayjs from 'dayjs';

const 昨天 = dayjs().subtract(1, 'day');
const 查询日期 = ref<dayjs.Dayjs>(昨天);
const 状态 = ref('正在获取昨天商品排行数据...');
const 错误信息 = ref('');

const 查询日期文本 = computed(() => 查询日期.value.format('YYYY-MM-DD'));

async function 自动导出Csv() {
    try {
        状态.value = '正在获取昨天商品排行数据...';
        错误信息.value = '';

        const 数据 = await 生意参谋商品排行页面.下载(查询日期.value);

        状态.value = '正在生成 CSV 文件...';
        const 文件名 = `商品排行_${查询日期文本.value}.csv`;

        // 数据拿到后立即下载 CSV，用户打开插件即可得到文件。
        await downloadRowsAsCsv(数据, 文件名);

        状态.value = 'CSV 已开始下载';
    } catch (error) {
        状态.value = '导出失败';
        错误信息.value = error instanceof Error ? error.message : '获取数据或导出文件时出错，请确认已登录生意参谋后再打开插件。';
    }
}

onMounted(() => {
    void 自动导出Csv();
});
</script>

<style scoped>
.popup-page {
    min-width: 260px;
    padding: 16px;
    line-height: 1.6;
}

.status-title {
    font-size: 15px;
    font-weight: 600;
    color: #222;
}

.status-detail {
    margin-top: 8px;
    color: #666;
}

.error-message {
    margin-top: 8px;
    color: #c00;
}
</style>
