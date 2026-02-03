
import { describe, expect, it } from 'vitest';
import { ConfigStore } from '../ConfigStore';

describe('ConfigStore', () => {
    it('should initialize with new config', () => {
        const store = new ConfigStore();
        const config = { server: { port: 3000 } };
        store.Init(config as any);
        expect(store.Configuration).toEqual(config);
    });
});