export type FeatureId = 'business-overview' | 'store-product-rank' | 'market-product-rank';

export type RankMetric = 'payAmount' | 'visitorCount' | 'buyerCount';

export interface DateRangeFilters {
  startDate: string;
  endDate: string;
}

export type BusinessOverviewFilters = DateRangeFilters;

export interface StoreProductRankFilters extends DateRangeFilters {
  metric: RankMetric;
}

export interface MarketProductRankFilters extends StoreProductRankFilters {
  categoryId: string;
  categoryName: string;
}

export interface FeatureFiltersMap {
  'business-overview': BusinessOverviewFilters;
  'store-product-rank': StoreProductRankFilters;
  'market-product-rank': MarketProductRankFilters;
}

export type CellValue = string | number | boolean | null;
export type TableRow = Record<string, CellValue>;

export interface BusinessOverviewRow extends TableRow {
  date: string;
  visitorCount: number;
  pageViewCount: number;
  buyerCount: number;
  payAmount: number;
  conversionRate: number;
}

export interface StoreProductRankRow extends TableRow {
  rank: number;
  itemId: string;
  title: string;
  itemUrl: string;
  imageUrl: string;
  visitorCount: number;
  buyerCount: number;
  payAmount: number;
  conversionRate: number;
}

export interface MarketProductRankRow extends TableRow {
  rank: number;
  itemId: string;
  title: string;
  itemUrl: string;
  imageUrl: string;
  sellerId: string;
  isTmall: boolean;
  visitorCount: number;
  buyerCount: number;
  payAmount: number;
}

export interface FeatureRowsMap {
  'business-overview': BusinessOverviewRow;
  'store-product-rank': StoreProductRankRow;
  'market-product-rank': MarketProductRankRow;
}

export type FiltersFor<F extends FeatureId> = FeatureFiltersMap[F];
export type RowFor<F extends FeatureId> = FeatureRowsMap[F];

export interface TableColumn {
  key: string;
  label: string;
}

export interface LatestCapture<F extends FeatureId = FeatureId> {
  schemaVersion: 1;
  featureId: F;
  filters: FiltersFor<F>;
  capturedAt: string;
  summary: Record<string, CellValue>;
  rows: Array<RowFor<F>>;
}

export interface SycmRequest {
  url: string;
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  body?: string;
  timeoutMs?: number;
}

export interface SycmTransport {
  request<T>(request: SycmRequest): Promise<T>;
}

export interface CaptureProgress {
  requestId: string;
  currentPage: number;
  totalPages?: number;
  message: string;
}

export interface FeatureCollectResult<F extends FeatureId> {
  summary: Record<string, CellValue>;
  rows: Array<RowFor<F>>;
}

export interface CaptureFeature<F extends FeatureId> {
  id: F;
  label: string;
  columns: TableColumn[];
  collect(
    filters: FiltersFor<F>,
    transport: SycmTransport,
    onProgress: (progress: Omit<CaptureProgress, 'requestId'>) => void,
  ): Promise<FeatureCollectResult<F>>;
}

export interface CaptureRequest<F extends FeatureId = FeatureId> {
  type: 'CAPTURE_START';
  requestId: string;
  featureId: F;
  filters: FiltersFor<F>;
}

export interface CaptureSuccess<F extends FeatureId = FeatureId> {
  type: 'CAPTURE_SUCCESS';
  requestId: string;
  capture: LatestCapture<F>;
}

export interface CaptureFailure {
  type: 'CAPTURE_FAILURE';
  requestId: string;
  error: string;
}

export type CaptureMessage = CaptureRequest | ({ type: 'CAPTURE_PROGRESS' } & CaptureProgress) | CaptureSuccess | CaptureFailure;
