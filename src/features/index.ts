import { coreIndexFeature } from './core-index';
import { itemRankFeature } from './item-rank';
import type { CaptureFeature } from './types';

export const captureFeatures: CaptureFeature[] = [coreIndexFeature, itemRankFeature];

export function findCaptureFeature(url: string): CaptureFeature | undefined {
  return captureFeatures.find((feature) => {
    if (typeof feature.url === 'string') return url.includes(feature.url);
    feature.url.lastIndex = 0;
    return feature.url.test(url);
  });
}

export function getCaptureFeature(interfaceId: string): CaptureFeature | undefined {
  return captureFeatures.find((feature) => feature.id === interfaceId);
}
