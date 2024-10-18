//
//
//
//
//
import _ from 'lodash'
import jwt from 'jsonwebtoken'
import { randomBytes } from 'crypto'
import Bcrypt from 'bcrypt'
import typia from "typia"
//
import { Config } from './Config'
import { TInternalResponse } from '../types/TInternalResponse'
import { Logger } from "../utils/Logger"
import { HttpErrorBadRequest, HttpErrorUnauthorized } from "./HttpErrors"
import { TypeHelper } from "../lib/TypeHelper"
import { HttpResponse } from "./HttpResponse"
import { TJson } from "../types/TJson"

type TUsersList = Record<string, string>

export type TUserCredentials = {
    username: string
    password: string
}

export type TUserToken = string | undefined

export class User {

    static readonly #SALT_ROUNDS = 10
    static readonly #JWT_EXPIRATION_TIME = 60 * 60          // 1 hour
    static readonly #SECRET_LENGTH = 64                     // Length of the JWT secret
    static Users: TUsersList = {}
    static LoggedInUsers: { [token: string]: TUsersList } = {}
    static AuthenticationType =  'jwt'


    static #GenerateJwtSecret(): string {
        const bytes = randomBytes(this.#SECRET_LENGTH)
        return bytes.toString('hex')
    }

    static #HashPassword(password: string): string {
        return Bcrypt.hashSync(password, User.#SALT_ROUNDS)
    }

    // TODO: move to be decorator
    static #CheckToken(userToken: TUserToken) {
        if (userToken === undefined)
            return false

        return _.has(User.LoggedInUsers, userToken)
    }

    @Logger.LogFunction()
    static LoadUsers(): void {
        if (Config.Flags.EnableAuthentication)
            User.Users = _.mapValues(Config.Configuration.users, user => user.toString())
    }

    @Logger.LogFunction(Logger.Debug, true)
    static LogIn(userCredentials: TUserCredentials): TInternalResponse<TJson> {
        TypeHelper.Validate(typia.validateEquals<TUserCredentials>(userCredentials), new HttpErrorBadRequest())

        const { username, password } = userCredentials

        // Check if the user exists and the password is correct
        const isUserExist: boolean = _.has(User.Users, username)
        if (!isUserExist || !Bcrypt.compareSync(password, User.#HashPassword(User.Users[username]))) {
            throw new HttpErrorUnauthorized("Invalid username or password")
        }

        // Generate a JWT token and return it
        const userToken = jwt.sign({ username }, User.#GenerateJwtSecret(), { expiresIn: User.#JWT_EXPIRATION_TIME })
        User.LoggedInUsers[userToken] = {
            username,
            password
        }
        return HttpResponse.Ok({ token: userToken })
    }

    @Logger.LogFunction()
    static LogOut(userToken: TUserToken): TInternalResponse<undefined> {
        if (userToken && User.#CheckToken(userToken)) {
            delete User.LoggedInUsers[userToken]
            return HttpResponse.NoContent()
        }
        throw new HttpErrorBadRequest("Invalid username")
    }

    @Logger.LogFunction()
    static GetInfo(userToken: TUserToken): TInternalResponse<TJson> {
        if (userToken && User.#CheckToken(userToken)) {
            const { username } = User.LoggedInUsers[userToken]
            return HttpResponse.Ok({ username })
        }
        throw new HttpErrorBadRequest("Invalid username")
    }

    @Logger.LogFunction(Logger.Debug, true)
    static IsAuthenticated(userToken: TUserToken) {
        return Boolean(
            !Config.Flags.EnableAuthentication ||
            (userToken != undefined && User.#CheckToken(userToken))
        )
    }
}