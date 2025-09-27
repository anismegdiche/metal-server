
import _ from "lodash"
import { User } from '../User'
import { TUserTokenInfo, TUserToken, TUserCredentials } from "../@types"
import { HttpErrorUnauthorized } from "../../errors/HttpErrors"
import { HTTP_STATUS_CODE } from "../../core/@consts"
import { TConfig, TConfigRoles } from "../../core/types/TConfig"
import { AuthProvider } from "../AuthProvider"
import { ConfigManager } from "../../core/ConfigManager"
import { Roles } from "../Roles"
import { TConfigUsers } from "../../core/types/TConfigUsers"

// Minimal test configuration that matches TConfig
const config: Partial<TConfig> = {
    roles: {
        admin: "crudal",
        user: "r",
        none: null
    },
    users: {
        alice: {
            password: '123456789',
            roles: ['lister']
        },
        bob: {
            password: 'password2',
            roles: ['admin']
        }
    }
}

jest.spyOn(ConfigManager, 'Get').mockImplementation((path: string) => {
    if (path === 'server.authentication.default-role') {
        return config.server?.authentication?.["default-role"] as string
    } else if (path === 'roles') {
        return config.roles as TConfigRoles
    }
    return undefined
})

AuthProvider.Provider = {
    Init: jest.fn(),
    GetUsers: jest.fn().mockImplementation(() => config.users as TConfigUsers),
    Authenticate: jest.fn().mockImplementation((userCredentials: TUserCredentials) => {
        if (userCredentials.username === 'alice' && userCredentials.password === '123456789') {
            return {
                user: 'alice',
                roles: ['lister']
            }
        }
        throw new HttpErrorUnauthorized('Invalid username or password')
    }),
    LogOut: jest.fn()
}


describe('User', () => {
    beforeEach(() => {
        // Reset all mocks before each test
        jest.clearAllMocks()
        // Initialize Roles
        Roles.Init()
    })

    describe('LoadUsers', () => {
        it('should convert password to string', () => {

            expect(AuthProvider.Provider.GetUsers()).toEqual({
                alice: {
                    password: '123456789',
                    roles: ['lister']
                },
                bob: {
                    password: 'password2',
                    roles: ['admin']
                }
            })
        })
    })

    describe('LogIn', () => {
        it('should return a token for a valid username and password', async () => {
            const _intLogIn = await User.Authenticate({
                username: 'alice',
                password: '123456789'
            })
            expect(_intLogIn.Body?.token).toBeDefined()
        })

        it('should throw HttpUnauthorized for invalid username', async () => {
            try {
                await User.Authenticate({
                    username: 'eve',
                    password: 'password'
                })
            } catch (error) {
                expect(error).toBeInstanceOf(HttpErrorUnauthorized)
            }
        })

        it('should throw HttpUnauthorized for an invalid password', async () => {
            try {
                await User.Authenticate({
                    username: 'alice',
                    password: 'wrongpassword'
                })
            } catch (error) {
                expect(error).toBeInstanceOf(HttpErrorUnauthorized)
            }
        })
    })

    describe('GetInfo', () => {
        it('should return user for a valid token', async () => {

            const respLogin = await User.Authenticate({
                username: 'alice',
                password: '123456789'
            })
            const _IRGetInfo = await User.GetUserInfo(<TUserToken>respLogin.Body?.token)
            expect(_.omit(_IRGetInfo, 'Body.exp', 'Body.iat')).toEqual({
                StatusCode: 200,
                Body: <TUserTokenInfo>{
                    user: 'alice',
                    roles: ['lister']
                }
            })
        })

        it('should return nothing for an invalid token', async () => {
            try {
                await User.GetUserInfo('invalidtoken')
            } catch (error) {
                expect(error).toBeInstanceOf(HttpErrorUnauthorized)
            }
        })
    })

    describe('LogOut', () => {
        it('should remove a user from the logged-in users list', async () => {
            const intRespLogIn = await User.Authenticate({
                username: 'alice',
                password: '123456789'
            })
            const intRespLogOut = await User.LogOut(<TUserToken>intRespLogIn.Body?.token)
            expect(intRespLogOut).toEqual({
                StatusCode: HTTP_STATUS_CODE.NO_CONTENT
            })
        })

        it('should do nothing if the token is invalid', async () => {
            try {
                await User.LogOut('invalidtoken')
            } catch (error) {
                expect(error).toBeInstanceOf(HttpErrorUnauthorized)
            }
        })
    })
})