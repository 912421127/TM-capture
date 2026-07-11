import type { CaptureRequestOptions, CaptureFeature } from '../types';
import { requestItemRank } from './request';

export type ItemRankMode = 'realtime' | 'recent7' | 'recent30';

export const itemRankFeature: CaptureFeature = {
  id: 'item-rank',
  name: '商品排行',
  url: /\/cc\/item\/(?:live\/)?view\/top\.json/,
  request(options?: CaptureRequestOptions): Promise<void> {
    const mode = options?.mode;
    return requestItemRank(mode === 'realtime' || mode === 'recent7' || mode === 'recent30' ? mode : 'recent7');
  },
};

export { buildItemRankRequestUrl, requestItemRank } from './request';
