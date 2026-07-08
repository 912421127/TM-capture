<template>
    <div class="popup-page">
        <div class="status-title">{{ 状态 }}</div>
        <div class="status-detail">原商品排行日期：{{ 查询日期文本 }}</div>
        <div class="status-detail">市场排行周期：{{ 市场排行日期文本 }}</div>

        <label class="field-label" for="bx-ua-input">bx-ua（测试市场排行时可粘贴）</label>
        <textarea id="bx-ua-input" v-model.trim="bxUa" class="textarea-input" rows="3" placeholder="从浏览器请求头里复制 bx-ua"></textarea>

        <div class="button-list">
            <button class="action-button" :disabled="正在请求" @click="导出原商品排行Csv">导出原商品排行</button>
            <button class="action-button secondary" :disabled="正在请求" @click="导出市场排行Csv">测试市场排行接口</button>
        </div>

        <div v-if="错误信息" class="error-message">{{ 错误信息 }}</div>
    </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { 生意参谋商品排行页面 } from '@/lib/test';
import { fetchMarketRankRows } from '../features/marketRank';
import { downloadRowsAsCsv } from '../shared/csvExport';
import dayjs from 'dayjs';

const 昨天 = dayjs().subtract(1, 'day');
const 查询日期 = ref<dayjs.Dayjs>(昨天);
const 市场排行开始日期 = computed(() => 昨天.subtract(6, 'day'));
const 市场排行结束日期 = computed(() => 昨天);
const 状态 = ref('请选择要测试的接口');
const 错误信息 = ref('');
const 正在请求 = ref(false);
const bxUa = ref('');

const 查询日期文本 = computed(() => 查询日期.value.format('YYYY-MM-DD'));
const 市场排行日期文本 = computed(() => `${市场排行开始日期.value.format('YYYY-MM-DD')} 至 ${市场排行结束日期.value.format('YYYY-MM-DD')}`);

async function 导出原商品排行Csv() {
    try {
        正在请求.value = true;
        状态.value = '正在获取原商品排行数据...';
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
    } finally {
        正在请求.value = false;
    }
}

async function 导出市场排行Csv() {
    try {
        正在请求.value = true;
        状态.value = '正在测试市场排行接口...';
        错误信息.value = '';

        // 市场排行接口先固定使用用户提供的类目 2908，便于手动验证接口是否可用。
        const 数据 = await fetchMarketRankRows({
            startDate: 市场排行开始日期.value.format('YYYY-MM-DD'),
            endDate: 市场排行结束日期.value.format('YYYY-MM-DD'),
            cateId: '2908',
            requestTime: Date.now(),
            token: 'ad6f69c24',
            bxUa: bxUa.value,
        });

        状态.value = '正在生成市场排行 CSV 文件...';
        const 文件名 = `市场商品排行_${市场排行开始日期.value.format('YYYY-MM-DD')}_${市场排行结束日期.value.format('YYYY-MM-DD')}.csv`;

        await downloadRowsAsCsv(数据, 文件名);

        状态.value = '市场排行 CSV 已开始下载';
    } catch (error) {
        状态.value = '市场排行导出失败';
        错误信息.value = error instanceof Error ? error.message : '获取市场排行数据或导出文件时出错，请确认已登录生意参谋后再试。';
    } finally {
        正在请求.value = false;
    }
}
</script>

<style scoped>
.popup-page {
    min-width: 300px;
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

.button-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 14px;
}

.field-label {
    display: block;
    margin-top: 12px;
    color: #555;
    font-size: 13px;
}

.textarea-input {
    box-sizing: border-box;
    width: 100%;
    margin-top: 4px;
    border: 1px solid #d9d9d9;
    border-radius: 6px;
    padding: 6px 8px;
    resize: vertical;
    font-size: 12px;
}

.action-button {
    width: 100%;
    border: 0;
    border-radius: 6px;
    padding: 8px 10px;
    color: #fff;
    background: #1677ff;
    cursor: pointer;
}

.action-button.secondary {
    background: #13a8a8;
}

.action-button:disabled {
    cursor: not-allowed;
    opacity: 0.6;
}

.error-message {
    margin-top: 8px;
    color: #c00;
}
</style>
