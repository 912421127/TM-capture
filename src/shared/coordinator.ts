import type {
  CaptureFeature,
  CaptureProgress,
  CaptureRequest,
  FeatureId,
  LatestCapture,
  SycmTransport,
} from './capture';
import { validateFilters } from './validation';

interface CoordinatorOptions {
  save(capture: LatestCapture<FeatureId>): Promise<void>;
  now?: () => Date;
}

export function createCaptureCoordinator({ save, now = () => new Date() }: CoordinatorOptions) {
  let activeRequestId: string | null = null;

  return {
    async run<F extends FeatureId>(
      request: CaptureRequest<F>,
      feature: CaptureFeature<F>,
      transport: SycmTransport,
      onProgress: (progress: CaptureProgress) => void,
    ): Promise<LatestCapture<F>> {
      if (activeRequestId) throw new Error('已有采集任务正在运行，请等待完成后再试。');

      const validationErrors = validateFilters(request.featureId, request.filters);
      if (validationErrors.length > 0) throw new Error(validationErrors[0]);

      activeRequestId = request.requestId;
      try {
        const collected = await feature.collect(request.filters, transport, (progress) => {
          onProgress({ requestId: request.requestId, ...progress });
        });
        const capture: LatestCapture<F> = {
          schemaVersion: 1,
          featureId: request.featureId,
          filters: request.filters,
          capturedAt: now().toISOString(),
          summary: collected.summary,
          rows: collected.rows,
        };

        // 只有所有分页都成功后才保存，旧的成功结果不会被半成品覆盖。
        await save(capture as LatestCapture<FeatureId>);
        return capture;
      } finally {
        activeRequestId = null;
      }
    },
  };
}
