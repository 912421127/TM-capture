// 生产构建使用的模块注册表；新增采集功能时只需在这里加入对应适配器。
import { businessOverviewFeature } from './business-overview';
import { marketProductRankFeature } from './market-product-rank';
import { storeProductRankFeature } from './store-product-rank';
import type { CaptureFeature, FeatureId } from '../shared/capture';

// 只有一个生产调用方需要按 id 查找适配器，直接使用 Map 比再包一层 registry 更直白。
export const featureRegistry = new Map<FeatureId, CaptureFeature<FeatureId>>([
  [businessOverviewFeature.id, businessOverviewFeature],
  [storeProductRankFeature.id, storeProductRankFeature],
  [marketProductRankFeature.id, marketProductRankFeature],
]);
