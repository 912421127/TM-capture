import { createFeatureRegistry } from './registry';
import { businessOverviewFeature } from './business-overview';
import { marketProductRankFeature } from './market-product-rank';
import { storeProductRankFeature } from './store-product-rank';

export const featureRegistry = createFeatureRegistry([businessOverviewFeature, storeProductRankFeature, marketProductRankFeature]);
