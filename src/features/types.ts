export interface CaptureRequestOptions {
  mode?: string;
}

export interface CaptureFeature {
  id: string;
  name: string;
  url: string | RegExp;
  request(options?: CaptureRequestOptions): Promise<void>;
}
