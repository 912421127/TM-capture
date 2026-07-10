import { describe, expect, it } from 'vitest';
import config from '../../wxt.config';

describe('extension manifest', () => {
  it('只申请首版实际使用的权限和生意参谋域名', () => {
    const manifest = config.manifest as {
      permissions: string[];
      host_permissions: string[];
      minimum_chrome_version: string;
    };

    expect(manifest.permissions).toEqual(['sidePanel', 'storage', 'tabs']);
    expect(manifest.host_permissions).toEqual(['https://sycm.taobao.com/*']);
    expect(manifest.minimum_chrome_version).toBe('114');
  });
});
