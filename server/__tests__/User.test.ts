import { expect, describe, beforeAll, it } from '@jest/globals'

import { TToken, User } from '../User'
import { Config } from '../Config'

describe('User', () => {
    beforeAll(() => {
        // Set up test data
        Config.Flags.EnableAuthentication = true
        Config.Configuration.users = {
            alice: 123456789,
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
            const _intLogIn = User.LogIn('alice', '123456789')
            expect(_intLogIn.Body?.token).toBeDefined()
        })

        it('should return undefined for an invalid username', () => {
            const _intLogIn = User.LogIn('eve', 'password')
            expect(_intLogIn).toEqual({
                StatusCode: 403,
                Body: { message: "Invalid username or password" }
            })
        })

        it('should return undefined for an invalid password', () => {
            const _intLogIn = User.LogIn('alice', 'wrongpassword')
            expect(_intLogIn).toEqual({
                StatusCode: 403,
                Body: { message: "Invalid username or password" }
            })
        })
    })

    describe('GetInfo', () => {
        it('should return username for a valid token', () => {
            const _IRLogIn = User.LogIn('alice', '123456789')
            const _IRGetInfo = User.GetInfo(<TToken>_IRLogIn.Body?.token)
            expect(_IRGetInfo).toEqual({
                StatusCode: 200,
                Body: {
                    username: 'alice'
                }
            })
        })

        it('should return nothing for an invalid token', () => {
            const info = User.GetInfo(undefined)
            expect(info).toEqual({
                StatusCode: 403,
                Body: {
                    message: 'Forbidden'
                }
            })
        })
    })

    describe('LogOut', () => {
        it('should remove a user from the logged-in users list', () => {
            const _intLogIn = User.LogIn('alice', '123456789')
            const _intLogOut = User.LogOut(<TToken>_intLogIn.Body?.token)
            expect(_intLogOut).toEqual({
                StatusCode: 200,
                Body: {
                    message: "Logged out successfully"
                }
            })
        })

        it('should do nothing if the token is undefined', () => {
            const _intLogOut = User.LogOut(undefined)
            expect(_intLogOut).toEqual({
                StatusCode: 400,
                Body: {
                  message: "Invalid username"
                }
              })
        })

        it('should do nothing if the token is invalid', () => {
            const _intLogOut = User.LogOut('invalidtoken')
            expect(_intLogOut).toEqual({
                StatusCode: 400,
                Body: {
                  message: "Invalid username"
                }
              })
        })
    })

})