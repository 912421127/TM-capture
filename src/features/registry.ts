// 用 FeatureId 建立采集器索引，后台只依赖 get 方法而不关心具体模块实现。
import type { CaptureFeature, FeatureId } from '../shared/capture';

export function createFeatureRegistry(features: Array<CaptureFeature<FeatureId>>) {
  // Map 查找能在新增模块时保持调用方接口不变。
  const entries = new Map<FeatureId, CaptureFeature<FeatureId>>(features.map((feature) => [feature.id, feature]));
  return {
    get(featureId: FeatureId): CaptureFeature<FeatureId> | undefined {
      return entries.get(featureId);
    },
  };
}
