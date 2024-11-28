//
//
//
//
import _ from "lodash"
import { tags } from "typia"
//
import { TConfigRoles } from "../types/TConfig"
import { Config } from "./Config"
import { TUserTokenInfo } from "./User"
import { HttpErrorForbidden } from "./HttpErrors"


//
export enum PERMISSION {
    ADMIN = 'a',
    CREATE = 'c',
    READ = 'r',
    UPDATE = 'u',
    DELETE = 'd',
    LIST = 'l'
}

export type TRolePermissions = string
    & tags.MinLength<1>
    & tags.MaxLength<6>
    & tags.Pattern<"^(?=[crudal]*$)(?!.*(.).*\x01)[crudal]+$">


//
export class Roles {

    static #ServerRoles: TConfigRoles
    static UserDefaultRole?: string

    static Init(): void {
        Roles.#ServerRoles = Config.Configuration.roles ?? {}
        Roles.UserDefaultRole = Config.Configuration.server?.authentication["default-role"]
    }

    static HasPermission(userToken: TUserTokenInfo | undefined, schemaRoles: string[] | undefined, permission: string): boolean {
        if (!userToken)
            return true

        let { roles = [] } = userToken

        if (roles.length === 0)
            return true

        const rolesIntersection = _.intersection(roles, schemaRoles ?? roles)

        const userPermissions = _
            .chain(rolesIntersection.map(role => Roles.#ServerRoles[role].split('')))
            .flatten()
            .uniq()
            .value()

        return userPermissions.includes(permission)
    }

    static CheckPermission(userToken: TUserTokenInfo | undefined, schemaRoles: string[] | undefined, permission: string): void {
        if (!Roles.HasPermission(userToken, schemaRoles, permission))
            throw new HttpErrorForbidden('Permission denied')
    }
}