<template>
</template>
<script setup lang="ts">
import { 生意参谋商品排行页面 } from '@/lib/test';
import dayjs from 'dayjs';
const 昨天 = dayjs().subtract(1, 'day');
const 查询日期 = ref<dayjs.Dayjs>(昨天);
const 数据 = await 生意参谋商品排行页面.下载(查询日期.value);
console.log(数据);
</script>
