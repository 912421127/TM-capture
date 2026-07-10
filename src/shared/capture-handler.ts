import { featureDefinitions } from '../features/definitions';
import type {
  CaptureFailure,
  CaptureFeature,
  CaptureProgress,
  CaptureRequest,
  CaptureSuccess,
  FeatureId,
  LatestCapture,
  SycmTransport,
} from './capture';
import { createCaptureCoordinator } from './coordinator';
import { toUserErrorMessage } from './errors';

interface CaptureHandlerOptions {
  registry: { get(featureId: FeatureId): CaptureFeature<FeatureId> | undefined };
  getTabId(): Promise<number | null>;
  createTransport(tabId: number): SycmTransport;
  save(capture: LatestCapture<FeatureId>): Promise<void>;
  broadcast(message: { type: 'CAPTURE_PROGRESS' } & CaptureProgress): Promise<void>;
  now?: () => Date;
}

export function createCaptureHandler(options: CaptureHandlerOptions) {
  const coordinator = createCaptureCoordinator({ save: options.save, now: options.now });

  return async (request: CaptureRequest): Promise<CaptureSuccess | CaptureFailure> => {
    try {
      const tabId = await options.getTabId();
      if (tabId == null) throw new Error('请先打开并登录生意参谋。');

      const feature = options.registry.get(request.featureId);
      if (!feature) {
        const label = featureDefinitions.find((item) => item.id === request.featureId)?.label ?? '当前模块';
        throw new Error(`${label}接口尚未完成诊断，请先使用诊断构建采集真实样本。`);
      }

      const capture = await coordinator.run(request, feature, options.createTransport(tabId), (progress) => {
        void options.broadcast({ type: 'CAPTURE_PROGRESS', ...progress });
      });
      return { type: 'CAPTURE_SUCCESS', requestId: request.requestId, capture };
    } catch (error) {
      return { type: 'CAPTURE_FAILURE', requestId: request.requestId, error: toUserErrorMessage(error) };
    }
  };
}
