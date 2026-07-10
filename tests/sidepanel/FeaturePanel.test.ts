import { shallowMount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import FeaturePanel from '../../entrypoints/sidepanel/FeaturePanel.vue';
import { featureDefinitions } from '../../src/features/definitions';

const stubs = {
  'a-alert': { props: ['message', 'description'], template: '<div>{{ message }} {{ description }}</div>' },
  'a-button': { template: '<button><slot /></button>' },
  'a-empty': { props: ['description'], template: '<div>{{ description }}</div>' },
  'a-select': { template: '<select />' },
  'a-table': { template: '<div class="table"><slot name="bodyCell" /></div>' },
  'a-tag': { template: '<span><slot /></span>' },
};

describe('FeaturePanel', () => {
  it('没有结果时显示清楚的操作提示', () => {
    const wrapper = shallowMount(FeaturePanel, {
      props: {
        definition: featureDefinitions[0]!,
        filters: { startDate: '2026-07-01', endDate: '2026-07-07' },
        capture: null,
        connected: true,
        capturing: false,
        progress: '',
        error: '',
        categories: [],
      },
      global: { stubs },
    });

    expect(wrapper.text()).toContain('尚未采集经营概览');
  });

  it('点击采集按钮后通知父组件', async () => {
    const wrapper = shallowMount(FeaturePanel, {
      props: {
        definition: featureDefinitions[0]!,
        filters: { startDate: '2026-07-01', endDate: '2026-07-07' },
        capture: null,
        connected: true,
        capturing: false,
        progress: '',
        error: '',
        categories: [],
      },
      global: { stubs },
    });

    await wrapper.get('[data-action="capture"]').trigger('click');
    expect(wrapper.emitted('capture')).toHaveLength(1);
  });

  it('未连接页面时提示下一步操作', () => {
    const wrapper = shallowMount(FeaturePanel, {
      props: {
        definition: featureDefinitions[0]!,
        filters: { startDate: '2026-07-01', endDate: '2026-07-07' },
        capture: null,
        connected: false,
        capturing: false,
        progress: '',
        error: '',
        categories: [],
      },
      global: { stubs },
    });

    expect(wrapper.text()).toContain('请先打开并登录生意参谋');
  });
});
