// 把后台消息转换为一次完整采集任务，并统一处理连接、模块不存在和用户可读错误。
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

interface CaptureHandlerOptions {
  registry: Map<FeatureId, CaptureFeature<FeatureId>>;
  getTabId(): Promise<number | null>;
  createTransport(tabId: number): SycmTransport;
  save(capture: LatestCapture<FeatureId>): Promise<void>;
  broadcast(message: { type: 'CAPTURE_PROGRESS' } & CaptureProgress): Promise<void>;
  now?: () => Date;
}

export function createCaptureHandler(options: CaptureHandlerOptions) {
  // coordinator 负责互斥、校验和保存；这里只负责浏览器标签页与消息传递。
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
      const message = error instanceof Error && error.message.trim() ? error.message : '采集失败，请刷新生意参谋页面后重试。';
      return { type: 'CAPTURE_FAILURE', requestId: request.requestId, error: message };
    }
  };
}
