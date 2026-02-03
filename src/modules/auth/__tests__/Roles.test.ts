
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Roles } from '../Roles';
import { ConfigManager } from '../../core/ConfigManager';
import { HttpErrorForbidden } from '../../errors/HttpErrors';

vi.mock('../../core/ConfigManager');

describe('Roles', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        Roles._serverRoles = {};
    });

    describe('Init', () => {
        it('should load roles from config', () => {
            vi.mocked(ConfigManager.Get).mockImplementation((key: string) => {
                if (key === 'roles') return { admin: 'CRUD', user: 'R' };
                if (key === 'server.authentication.default-role') return 'user';
                return undefined;
            });

            Roles.Init();
            expect(Roles._serverRoles).toEqual({ admin: 'CRUD', user: 'R' });
            expect(Roles.UserDefaultRole).toBe('user');
        });
    });

    describe('HasPermission', () => {
        it('should return true if no userToken provided', () => {
            expect(Roles.HasPermission(undefined, [], 'C')).toBe(true);
        });

        it('should return true if user has no roles', () => {
            expect(Roles.HasPermission({ user: 'u', roles: [] }, [], 'C')).toBe(true);
        });

        it('should check permissions correctly', () => {
            Roles._serverRoles = { admin: 'CRUD', user: 'R' };

            expect(Roles.HasPermission({ user: 'a', roles: ['admin'] }, ['admin'], 'C')).toBe(true);
            expect(Roles.HasPermission({ user: 'a', roles: ['admin'] }, ['admin'], 'X')).toBe(false);
            expect(Roles.HasPermission({ user: 'u', roles: ['user'] }, ['user'], 'R')).toBe(true);
            expect(Roles.HasPermission({ user: 'u', roles: ['user'] }, ['user'], 'C')).toBe(false);
        });
    });

    describe('CheckPermission', () => {
        it('should throw HttpErrorForbidden if permission denied', () => {
            Roles._serverRoles = { user: 'R' };
            expect(() => Roles.CheckPermission({ user: 'u', roles: ['user'] }, ['user'], 'C'))
                .toThrow(HttpErrorForbidden);
        });

        it('should not throw if permission granted', () => {
            Roles._serverRoles = { admin: 'CRUD' };
            expect(() => Roles.CheckPermission({ user: 'a', roles: ['admin'] }, ['admin'], 'C'))
                .not.toThrow();
        });
    });
});
