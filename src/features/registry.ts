import type { CaptureFeature, FeatureId } from '../shared/capture';

export function createFeatureRegistry(features: Array<CaptureFeature<FeatureId>>) {
  const entries = new Map<FeatureId, CaptureFeature<FeatureId>>(features.map((feature) => [feature.id, feature]));
  return {
    get(featureId: FeatureId): CaptureFeature<FeatureId> | undefined {
      return entries.get(featureId);
    },
  };
}
