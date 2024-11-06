//
//
//
//
//
import _ from "lodash"
import Bcrypt from 'bcrypt'
//
import { Logger } from "../../utils/Logger"
import { Config } from "../../server/Config"
import { ACAuthProvider, TUserCredentials } from "../ACAuthProvider"
import { HttpErrorUnauthorized } from "../../server/HttpErrors"


//
export type TUsersList = Record<string, string>


//
export class BasicAuthProvider extends ACAuthProvider {

    readonly #SALT_ROUNDS = 10
    #Users: TUsersList = {}
    
    #HashPassword(password: string): string {
        return Bcrypt.hashSync(password, this.#SALT_ROUNDS)
    }
  
    GetUsers() {
        return this.#Users
    }

    @Logger.LogFunction()
    Init(): void {
        if (Config.Flags.EnableAuthentication)
            this.#Users = _.mapValues(Config.Configuration.users, user => user.toString())
    }

    IsUserExist(username: string): boolean {
        return _.has(this.#Users, username)
    }

    async Authenticate(userCredentials: TUserCredentials): Promise<void> {
        const { username, password } = userCredentials
        // Check if the user exists and the password is correct
        const isUserExist = this.IsUserExist(username)
        if (!isUserExist || !Bcrypt.compareSync(password, this.#HashPassword(this.#Users[username]))) {
            throw new HttpErrorUnauthorized("Invalid username or password")
        }
    }

    // eslint-disable-next-line class-methods-use-this
    async LogOut(username: string): Promise<void> {
        Logger.Debug(`User ${username} logged out`)
    }
  }
  