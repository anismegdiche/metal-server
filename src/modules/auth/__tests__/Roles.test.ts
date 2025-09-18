// Roles.test.ts
import { Roles } from "../Roles"
import { AUTH_PERMISSION, AUTH_PROVIDER } from "../@consts"
import { TUserTokenInfo } from "../@types"
import { HttpErrorForbidden } from "../../errors/HttpErrors"
import { TConfig } from "../../core/types/TConfig"

// Minimal test configuration that matches TConfig
const config: Partial<TConfig> = {
    roles: {
        admin: "crudal",
        user: "r",
        none: null
    },
    server: {
        authentication: {
            provider: AUTH_PROVIDER.LOCAL,
            "default-role": "none"
        },
    }
}

// Mock ConfigManager.Get with specific path handling
const mockConfigManager = {
    Get: jest.fn((path: string) => {
        // Direct path resolution for known test paths
        if (path === 'roles') 
            return config.roles;
        if (path === 'server.authentication.default-role') 
            return config.server?.authentication?.['default-role'];
        return undefined;
    })
};

jest.mock("../../core/ConfigManager", () => ({
    ConfigManager: mockConfigManager
}));

describe("Roles", () => {
    beforeEach(() => {
        // Reset all mocks before each test
        jest.clearAllMocks()
        // Initialize Roles
        Roles.Init()
    })

    describe("Init", () => {
        it("should initialize ServerRoles and UserDefaultRole", () => {
            expect(Roles.UserDefaultRole).toBe("none")
        })
    })

    describe("HasPermission", () => {
        it("should return true if userToken is undefined", () => {
            expect(Roles.HasPermission(undefined, ["admin"], AUTH_PERMISSION.ADMIN)).toBe(true)
        })

        it("should return true if userToken roles are empty", () => {
            const userToken: TUserTokenInfo = {
                user: "test",
                roles: []
            }
            expect(Roles.HasPermission(userToken, ["admin"], AUTH_PERMISSION.ADMIN)).toBe(true)
        })

        it("should return false if no intersection of roles with schemaRoles", () => {
            const userToken = {
                user: "test",
roles: ["guest"]
            }
            expect(Roles.HasPermission(userToken, ["admin"], AUTH_PERMISSION.ADMIN)).toBe(false)
        })

        it("should return true if permission exists in user's roles", () => {
            const userToken = {
                user: "test",
                roles: ["admin"]
            }
            expect(Roles.HasPermission(userToken, ["admin"], AUTH_PERMISSION.ADMIN)).toBe(true)
        })

        it("should return false if permission does not exist in user's roles", () => {
            const userToken = {
                user: "test",
                roles: ["user"]
            }
            expect(Roles.HasPermission(userToken, ["admin"], AUTH_PERMISSION.ADMIN)).toBe(false)
        })

        it("should return false if user has no permissions", () => {
            const userToken = {
                user: "test",
                roles: ["none"]
            }
            expect(Roles.HasPermission(userToken, undefined, AUTH_PERMISSION.ADMIN)).toBe(false)
            expect(Roles.HasPermission(userToken, undefined, AUTH_PERMISSION.READ)).toBe(false)
            expect(Roles.HasPermission(userToken, undefined, AUTH_PERMISSION.CREATE)).toBe(false)
            expect(Roles.HasPermission(userToken, undefined, AUTH_PERMISSION.DELETE)).toBe(false)
            expect(Roles.HasPermission(userToken, undefined, AUTH_PERMISSION.LIST)).toBe(false)
            expect(Roles.HasPermission(userToken, undefined, AUTH_PERMISSION.UPDATE)).toBe(false)
        })
    })

    describe("CheckPermission", () => {
        it("should not throw if user has permission", () => {
            const userToken = {
                user: "test",
                roles: ["admin"]
            }
            expect(() => Roles.CheckPermission(userToken, ["admin"], AUTH_PERMISSION.ADMIN)
            ).not.toThrow()
        })

        it("should throw HttpErrorForbidden if user lacks permission", () => {
            const userToken = {
                user: "test",
                roles: ["user"]
            }
            expect(() => Roles.CheckPermission(userToken, ["admin"], AUTH_PERMISSION.ADMIN)
            ).toThrow(HttpErrorForbidden)
        })
    })
})
