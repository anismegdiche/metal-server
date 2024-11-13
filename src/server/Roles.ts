//
//
//
//
import _ from "lodash"
//
import { TConfigRoles } from "../types/TConfig"
import { Config } from "./Config"
import { TUserTokenInfo } from "./User"


//
export enum PERMISSION {
    ADMIN = 'a',
    CREATE = 'c',
    READ = 'r',
    UPDATE = 'u',
    DELETE = 'd',
    LIST = 'l'
}

//
export class Roles {

    static ServerRoles: TConfigRoles

    static Init(): void {
        this.ServerRoles = Config.Configuration.roles ?? {}
    }

    static HasPermission(userToken: TUserTokenInfo | undefined, schemaRoles: string[] | undefined, permission: string): boolean {
        if (!userToken)
            return true

        const { roles } = userToken

        if (!roles || roles.length === 0)
            return true

        const rolesIntersection = _.intersection(roles, schemaRoles ?? roles)

        const userPermissions = _
            .chain(rolesIntersection.map(role => this.ServerRoles[role].split('')))
            .flatten()
            .uniq()
            .value()

        return userPermissions.includes(permission)
    }
}