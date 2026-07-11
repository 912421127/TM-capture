export interface CaptureFeature {
  id: string;
  name: string;
  url: string | RegExp;
  request(): Promise<void>;
}
