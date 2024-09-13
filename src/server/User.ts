//
//
//
//
//
import _ from 'lodash'
import jwt from 'jsonwebtoken'
import { randomBytes } from 'crypto'
import Bcrypt from 'bcrypt'
//
import { Config } from './Config'
import { HTTP_STATUS_CODE, HTTP_STATUS_MESSAGE } from '../lib/Const'
import { TInternalResponse } from '../types/TInternalResponse'
import { Logger } from "../utils/Logger"

type TUser = Record<string, string>
export type TToken = string | undefined

export class User {

    static readonly #SALT_ROUNDS = 10
    static readonly #JWT_EXPIRATION_TIME = 60 * 60 // 1 hour
    static readonly #SECRET_LENGTH = 64 // Length of the JWT secret
    
    static Users: TUser = {}
    static LoggedInUsers: { [token: string]: TUser } = {}

    static #GenerateJwtSecret(): string {
        const bytes = randomBytes(this.#SECRET_LENGTH)
        return bytes.toString('hex')
    }

    static #HashPassword(password: string): string {
        return Bcrypt.hashSync(password, User.#SALT_ROUNDS)
    }

    static #CheckToken(token: TToken) {
        if (token === undefined) {
            return false
        }
        return _.has(User.LoggedInUsers, token)
    }

    @Logger.LogFunction()
    static LoadUsers(): void {
        if (Config.Flags.EnableAuthentication)
            User.Users = _.mapValues(Config.Configuration.users, user => user.toString())
    }

    @Logger.LogFunction()
    static LogIn(username: string, password: string): TInternalResponse {

        // Check if the user exists and the password is correct
        const _isUserExist: boolean = _.has(User.Users, username)
        if (!_isUserExist || !Bcrypt.compareSync(password, User.#HashPassword(User.Users[username]))) {
            return {
                StatusCode: HTTP_STATUS_CODE.FORBIDDEN,
                Body: { message: 'Invalid username or password' }
            }
        }

        // Generate a JWT token and return it
        const token = jwt.sign({ username }, User.#GenerateJwtSecret(), { expiresIn: User.#JWT_EXPIRATION_TIME })
        User.LoggedInUsers[token] = {
            username,
            password
        }
        return {
            StatusCode: HTTP_STATUS_CODE.OK,
            Body: { token }
        }
    }

    @Logger.LogFunction()
    static LogOut(token: TToken): TInternalResponse {
        if (token && User.#CheckToken(token)) {
            delete User.LoggedInUsers[token]
            return {
                StatusCode: HTTP_STATUS_CODE.OK,
                Body: { message: 'Logged out successfully' }
            }
        }
        return {
            StatusCode: HTTP_STATUS_CODE.BAD_REQUEST,
            Body: { message: 'Invalid username' }
        }
    }

    @Logger.LogFunction()
    static GetInfo(token: TToken): TInternalResponse {
        if (token && User.#CheckToken(token)) {
            const { username } = User.LoggedInUsers[token]
            return {
                StatusCode: HTTP_STATUS_CODE.OK,
                Body: { username }
            }
        }
        return {
            StatusCode: HTTP_STATUS_CODE.FORBIDDEN,
            Body: { message: HTTP_STATUS_MESSAGE.FORBIDDEN }
        }
    }

    @Logger.LogFunction()
    static IsAuthenticated(token: TToken) {
        return Boolean(
            !Config.Flags.EnableAuthentication ||
            (token != undefined && User.#CheckToken(token))
        )
    }

    @Logger.LogFunction()
    static IsNotAuthenticated(token: TToken) {
        return !User.IsAuthenticated(token)
    }
}