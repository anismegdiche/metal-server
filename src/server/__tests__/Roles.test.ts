// Roles.test.ts
import { Roles, PERMISSION } from "../Roles"
import { HttpErrorForbidden } from "../HttpErrors"
import { TUserTokenInfo } from '../User'

jest.mock("../Config", () => ({
    Config: {
        Configuration: {
            roles: {
                admin: "crudal",
                user: "r",
                none: null
            },
            server: {
                authentication: {
                    "default-role": "none",
                },
            },
        },
    },
}))

describe("Roles", () => {
    beforeEach(() => {
        Roles.Init()
    })

    describe("Init", () => {
        it("should initialize ServerRoles and UserDefaultRole", () => {
            expect(Roles.UserDefaultRole).toBe("none")
        })
    })

    describe("HasPermission", () => {
        it("should return true if userToken is undefined", () => {
            expect(Roles.HasPermission(undefined, ["admin"], PERMISSION.ADMIN)).toBe(true)
        })

        it("should return true if userToken roles are empty", () => {
            const userToken: TUserTokenInfo = {
                user: "test",
                roles: []
            }
            expect(Roles.HasPermission(userToken, ["admin"], PERMISSION.ADMIN)).toBe(true)
        })

        it("should return false if no intersection of roles with schemaRoles", () => {
            const userToken = {
                user: "test", roles: ["guest"]
            }
            expect(Roles.HasPermission(userToken, ["admin"], PERMISSION.ADMIN)).toBe(false)
        })

        it("should return true if permission exists in user's roles", () => {
            const userToken = {
                user: "test",
                roles: ["admin"]
            }
            expect(Roles.HasPermission(userToken, ["admin"], PERMISSION.ADMIN)).toBe(true)
        })

        it("should return false if permission does not exist in user's roles", () => {
            const userToken = {
                user: "test",
                roles: ["user"]
            }
            expect(Roles.HasPermission(userToken, ["admin"], PERMISSION.ADMIN)).toBe(false)
        })

        it("should return false if user has no permissions", () => {
            const userToken = {
                user: "test",
                roles: ["none"]
            }
            expect(Roles.HasPermission(userToken, undefined, PERMISSION.ADMIN)).toBe(false)
            expect(Roles.HasPermission(userToken, undefined, PERMISSION.READ)).toBe(false)
            expect(Roles.HasPermission(userToken, undefined, PERMISSION.CREATE)).toBe(false)
            expect(Roles.HasPermission(userToken, undefined, PERMISSION.DELETE)).toBe(false)
            expect(Roles.HasPermission(userToken, undefined, PERMISSION.LIST)).toBe(false)
            expect(Roles.HasPermission(userToken, undefined, PERMISSION.UPDATE)).toBe(false)
        })
    })

    describe("CheckPermission", () => {
        it("should not throw if user has permission", () => {
            const userToken = {
                user: "test",
                roles: ["admin"]
            }
            expect(() =>
                Roles.CheckPermission(userToken, ["admin"], PERMISSION.ADMIN)
            ).not.toThrow()
        })

        it("should throw HttpErrorForbidden if user lacks permission", () => {
            const userToken = {
                user: "test",
                roles: ["user"]
            }
            expect(() =>
                Roles.CheckPermission(userToken, ["admin"], PERMISSION.ADMIN)
            ).toThrow(HttpErrorForbidden)
        })
    })
})
