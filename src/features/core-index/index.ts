import type { CaptureFeature } from '../types';
import { requestCoreIndex } from './request';

export const coreIndexFeature: CaptureFeature = {
  id: 'core-index',
  name: '数据概览',
  url: '/portal/coreIndex/new/getTableData/v3.json',
  request: requestCoreIndex,
};
