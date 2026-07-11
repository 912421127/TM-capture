// 生产构建使用的模块注册表；新增采集功能时只需在这里加入对应适配器。
import { createFeatureRegistry } from './registry';
import { businessOverviewFeature } from './business-overview';
import { marketProductRankFeature } from './market-product-rank';
import { storeProductRankFeature } from './store-product-rank';

export const featureRegistry = createFeatureRegistry([businessOverviewFeature, storeProductRankFeature, marketProductRankFeature]);
