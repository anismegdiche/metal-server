import { expect, describe, beforeAll, it } from '@jest/globals'

import { TUserToken, TUserTokenInfo, User } from '../User'
import { Config } from '../Config'
import { HttpErrorUnauthorized } from "../HttpErrors"
import { HTTP_STATUS_CODE } from "../../lib/Const"
import { TConfig, TConfigUsers } from "../../types/TConfig"
import typia from "typia"
import { AUTH_PROVIDER, AuthProvider } from "../../providers/AuthProvider"
import { Server } from "../Server"
import _ from "lodash"


const users: TConfigUsers = {
    alice: {
        password: 123_456_789,
        roles: ['lister']
    },
    bob: {
        password: 'password2',
        roles: ['admin']
    }
}

describe('User', () => {
    beforeAll(() => {
        Server.RegisterProviders()
        // Set up test data
        Config.Configuration = typia.random<TConfig>()
        Config.Configuration.server = {
            ...Config.Configuration.server,
            authentication: {
                provider: AUTH_PROVIDER.LOCAL
            }
        }
        Config.Flags.EnableAuthentication = true
        Config.Configuration.users = users
        Config.InitAuthentication()
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
                // file deepcode ignore NoHardcodedPasswords/test: testing
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
            // eslint-disable-next-line you-dont-need-lodash-underscore/omit
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
            const intrespLogIn = await User.Authenticate({
                username: 'alice',
                password: '123456789'
            })
            const intrespLogOut = await User.LogOut(<TUserToken>intrespLogIn.Body?.token)
            expect(intrespLogOut).toEqual({
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