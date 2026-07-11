export const AUTO_CAPTURE_INTERVALS = [15, 30, 60] as const;
export const AUTO_CAPTURE_ALARM_PREFIX = 'tm-capture-auto-';

export interface InterfaceSchedule {
  enabled: boolean;
  tabId?: number;
  intervalMinutes?: number;
}

export type ScheduleConfig = Record<string, InterfaceSchedule>;

export function createScheduleConfig(): ScheduleConfig {
  return {};
}

export function getAlarmName(interfaceId: string): string {
  return `${AUTO_CAPTURE_ALARM_PREFIX}${interfaceId}`;
}

export function disableSchedule(config: ScheduleConfig, interfaceId: string): void {
  config[interfaceId] = { enabled: false };
}

export function isSupportedInterval(intervalMinutes: number): boolean {
  return AUTO_CAPTURE_INTERVALS.includes(intervalMinutes as (typeof AUTO_CAPTURE_INTERVALS)[number]);
}
