import { describe, expect, it } from 'vitest';
import { AUTO_CAPTURE_INTERVALS, createScheduleConfig, disableSchedule, getAlarmName } from '../../src/shared/schedule';

describe('interface schedule helpers', () => {
  it('keeps schedules for different interfaces independent', () => {
    const config = createScheduleConfig();
    config['core-index'] = { enabled: true, tabId: 1, intervalMinutes: 15 };
    config.trend = { enabled: true, tabId: 2, intervalMinutes: 60 };

    disableSchedule(config, 'core-index');

    expect(config['core-index']).toEqual({ enabled: false });
    expect(config.trend).toEqual({ enabled: true, tabId: 2, intervalMinutes: 60 });
  });

  it('creates a unique alarm name and exposes fixed intervals', () => {
    expect(getAlarmName('core-index')).toBe('tm-capture-auto-core-index');
    expect(AUTO_CAPTURE_INTERVALS).toEqual([15, 30, 60]);
  });
});
