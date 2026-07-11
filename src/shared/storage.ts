// 统一管理最新采集结果和筛选条件的浏览器本地存储键，避免 UI 直接拼接键名。
import { browser } from 'wxt/browser';
import type { FeatureId, FiltersFor, LatestCapture } from './capture';

const SCHEMA_VERSION = 1;
const SCHEMA_KEY = 'tm_capture_schema_version';
const LEGACY_KEYS = ['last_response', '_captured'];

function captureKey(featureId: FeatureId): string {
  return `tm_capture_latest_${featureId}`;
}

function filtersKey(featureId: FeatureId): string {
  return `tm_capture_filters_${featureId}`;
}

export async function initializeStorage(): Promise<void> {
  const stored = await browser.storage.local.get(SCHEMA_KEY);
  if (stored[SCHEMA_KEY] === SCHEMA_VERSION) return;

  // 新架构不兼容旧数据，首次运行时明确清理，避免旧字段污染新界面。
  await browser.storage.local.remove(LEGACY_KEYS);
  await browser.storage.local.set({ [SCHEMA_KEY]: SCHEMA_VERSION });
}

export async function saveLatestCapture<F extends FeatureId>(capture: LatestCapture<F>): Promise<void> {
  await browser.storage.local.set({ [captureKey(capture.featureId)]: capture });
}

export async function loadLatestCapture<F extends FeatureId>(featureId: F): Promise<LatestCapture<F> | null> {
  const key = captureKey(featureId);
  const stored = await browser.storage.local.get(key);
  return (stored[key] as LatestCapture<F> | undefined) ?? null;
}

export async function clearLatestCapture(featureId: FeatureId): Promise<void> {
  await browser.storage.local.remove(captureKey(featureId));
}

export async function saveFilters<F extends FeatureId>(featureId: F, filters: FiltersFor<F>): Promise<void> {
  await browser.storage.local.set({ [filtersKey(featureId)]: filters });
}

export async function loadFilters<F extends FeatureId>(featureId: F): Promise<FiltersFor<F> | null> {
  const key = filtersKey(featureId);
  const stored = await browser.storage.local.get(key);
  return (stored[key] as FiltersFor<F> | undefined) ?? null;
}
