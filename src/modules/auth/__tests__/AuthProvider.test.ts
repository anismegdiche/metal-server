
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AuthProvider } from '../AuthProvider';
import { AUTH_PROVIDER } from '../@consts';
import { HttpErrorNotFound } from '../../errors/HttpErrors';

vi.mock('../providers/DemoAuth', () => ({
    DemoAuth: class { Name = 'DemoAuth' }
}));
vi.mock('../providers/LocalAuth', () => ({
    LocalAuth: class { Name = 'LocalAuth' }
}));
vi.mock('../providers/OidcAuth', () => ({
    OidcAuth: class { Name = 'OidcAuth' }
}));

describe('AuthProvider', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('GetProvider', () => {
        it('should load DemoAuth provider correctly', async () => {
            const provider = await AuthProvider.GetProvider(AUTH_PROVIDER.DEMO);
            expect(provider).toBeDefined();
            expect((provider as any).Name).toBe('DemoAuth');
        });

        it('should load LocalAuth provider correctly', async () => {
            const provider = await AuthProvider.GetProvider(AUTH_PROVIDER.LOCAL);
            expect(provider).toBeDefined();
            expect((provider as any).Name).toBe('LocalAuth');
        });

        it('should throw HttpErrorNotFound for unknown provider', async () => {
            await expect(AuthProvider.GetProvider('unknown' as any))
                .rejects
                .toThrow(HttpErrorNotFound);
        });

        it('should return already loaded provider from factory', async () => {
            const provider1 = await AuthProvider.GetProvider(AUTH_PROVIDER.DEMO);
            const provider2 = await AuthProvider.GetProvider(AUTH_PROVIDER.DEMO);
            expect(provider1).toBe(provider2);
        });
    });

    describe('SetCurrent', () => {
        it('should set the current provider', async () => {
            await AuthProvider.SetCurrent(AUTH_PROVIDER.DEMO);
            expect(AuthProvider.Provider).toBeDefined();
            expect((AuthProvider.Provider as any).Name).toBe('DemoAuth');
        });
    });
});
