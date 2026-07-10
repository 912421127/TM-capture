import { createFeatureRegistry } from './registry';

// 适配器必须在真实接口样本经过脱敏并加入测试后才能注册。
export const featureRegistry = createFeatureRegistry([]);
