import { expect, describe, beforeAll, it } from '@jest/globals'

import { TUserToken, User } from '../User'
import { Config } from '../Config'
import { HttpErrorBadRequest, HttpErrorUnauthorized } from "../HttpErrors"
import { HTTP_STATUS_CODE } from "../../lib/Const"
import { TConfig } from "../../types/TConfig"
import typia from "typia"

describe('User', () => {
    beforeAll(() => {
        // Set up test data
        Config.Configuration = typia.random<TConfig>()
        Config.Flags.EnableAuthentication = true
        Config.Configuration.users = {
            alice: 123_456_789,
            bob: 'password2'
        }
        User.LoadUsers()
    })

    describe('LoadUsers', () => {
        it('should convert password to string', () => {
            User.LoadUsers()
            expect(User.Users).toEqual({
                alice: '123456789',
                bob: 'password2'
            })
        })
    })


    describe('LogIn', () => {
        it('should return a token for a valid username and password', () => {
            const _intLogIn = User.LogIn({
                username: 'alice',
                // file deepcode ignore NoHardcodedPasswords/test: testing
                password: '123456789'
            })
            expect(_intLogIn.Body?.token).toBeDefined()
        })

        it('should throw HttpUnauthorized for invalid username', () => {
            try {
                User.LogIn({
                    username: 'eve',
                    password: 'password'
                })
            } catch (error) {
                expect(error).toBeInstanceOf(HttpErrorUnauthorized)
            }
        })

        it('should throw HttpUnauthorized for an invalid password', () => {
            try {
                User.LogIn({
                    username: 'alice',
                    password: 'wrongpassword'
                })
            } catch (error) {
                expect(error).toBeInstanceOf(HttpErrorUnauthorized)
            }
        })
    })

    describe('GetInfo', () => {
        it('should return username for a valid token', () => {
            const _IRLogIn = User.LogIn({
                username: 'alice',
                password: '123456789'
            })
            const _IRGetInfo = User.GetInfo(<TUserToken>_IRLogIn.Body?.token)
            expect(_IRGetInfo).toEqual({
                StatusCode: 200,
                Body: {
                    username: 'alice'
                }
            })
        })

        it('should return nothing for an invalid token', () => {
            try {
                User.GetInfo(undefined)
            } catch (error) {
                expect(error).toBeInstanceOf(HttpErrorBadRequest)
            }
        })
    })

    describe('LogOut', () => {
        it('should remove a user from the logged-in users list', () => {
            const _intLogIn = User.LogIn({
                username: 'alice',
                password: '123456789'
            })
            const _intLogOut = User.LogOut(<TUserToken>_intLogIn.Body?.token)
            expect(_intLogOut).toEqual({
                StatusCode: HTTP_STATUS_CODE.NO_CONTENT,
                Body: undefined
            })
        })

        it('should do nothing if the token is undefined', () => {
            try {
                User.LogOut(undefined)
            } catch (error) {
                expect(error).toBeInstanceOf(HttpErrorBadRequest)
            }
        })

        it('should do nothing if the token is invalid', () => {
            try {
                User.LogOut('invalidtoken')
            } catch (error) {
                expect(error).toBeInstanceOf(HttpErrorBadRequest)
            }
        })
    })
})