
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { User } from '../User';
import { AuthProvider } from '../AuthProvider';
import jwt from 'jsonwebtoken';
import { HttpErrorUnauthorized } from '../../errors/HttpErrors';

vi.mock('jsonwebtoken');
vi.mock('../AuthProvider', () => ({
    AuthProvider: {
        Provider: {
            Authenticate: vi.fn(),
            LogOut: vi.fn()
        }
    }
}));
vi.mock('../Roles', () => ({
    Roles: {
        UserDefaultRole: 'user'
    }
}));
vi.mock('../../../utils/Logger', () => ({
    Logger: {
        LogFunction: () => (target: any, propertyKey: string, descriptor: PropertyDescriptor) => descriptor,
        Info: vi.fn()
    }
}));

describe('User', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (User as any)._tokens.clear();
    });

    describe('Authenticate', () => {
        it('should authenticate user and return token', async () => {
            const credentials = { username: 'admin', password: 'password' }; // NOSONAR
            vi.mocked(AuthProvider.Provider.Authenticate).mockResolvedValue({ user: 'admin', roles: ['admin'] });
            vi.mocked(jwt.sign).mockReturnValue('mock-token' as any);

            const res = await User.Authenticate(credentials);

            expect(res.Body).toEqual({ token: 'mock-token' });
            expect(AuthProvider.Provider.Authenticate).toHaveBeenCalledWith(credentials);
            expect((User as any)._tokens.has('mock-token')).toBe(true);
        });
    });

    describe('_decodeToken', () => {
        it('should decode valid token', () => {
            const token = 'valid-token';
            const secret = 'secret';
            (User as any)._tokens.set(token, secret);
            vi.mocked(jwt.verify).mockReturnValue({ user: 'admin' } as any);

            const decoded = (User as any)._decodeToken(token);
            expect(decoded).toEqual({ user: 'admin' });
            expect(jwt.verify).toHaveBeenCalledWith(token, secret);
        });

        it('should throw HttpErrorUnauthorized for undefined token', () => {
            expect(() => (User as any)._decodeToken(undefined)).toThrow(HttpErrorUnauthorized);
        });

        it('should throw HttpErrorUnauthorized for invalid token', () => {
            (User as any)._tokens.set('bad', 'secret');
            vi.mocked(jwt.verify).mockImplementation(() => { throw new Error('invalid'); });
            expect(() => (User as any)._decodeToken('bad')).toThrow(HttpErrorUnauthorized);
        });
    });

    describe('LogOut', () => {
        it('should delete token and call provider LogOut', async () => {
            const token = 'token';
            vi.spyOn(User as any, '_decodeToken').mockReturnValue({ user: 'admin' });
            (User as any)._tokens.set(token, 'secret');

            await User.LogOut(token);

            expect((User as any)._tokens.has(token)).toBe(false);
            expect(AuthProvider.Provider.LogOut).toHaveBeenCalledWith('admin');
        });
    });
});