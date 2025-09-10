//
//
//
//
import _ from "lodash"
//
import { Assert } from "../../utils/Assert"
import { StringUtils } from "../../utils/StringUtils"
import { ConfigManager } from "../core/ConfigManager"
import { TConfigRoles } from "../core/types/TConfig"
import { HttpErrorForbidden } from "../errors/HttpErrors"
import { TUserTokenInfo } from "./@types"


//
export class Roles {

    static #ServerRoles: TConfigRoles
    static UserDefaultRole?: string

    static Init(): void {
        Roles.#ServerRoles = ConfigManager.Get<TConfigRoles>("roles") ?? {}
        Roles.UserDefaultRole = ConfigManager.Get("server.authentication.default-role")
    }

    static HasPermission(userToken: TUserTokenInfo | undefined, schemaRoles: string[] | undefined, permission: string): boolean {
        if (!userToken)
            return true

        const { roles = [] } = userToken

        if (roles.length === 0)
            return true

        const rolesIntersection = _.intersection(roles, schemaRoles ?? roles)

        const userPermissions = _.chain(rolesIntersection.map(role => {
            if (!StringUtils.IsEmpty(Roles.#ServerRoles[role])) {
                return Roles.#ServerRoles[role]!.split('')
            }
            return []
        }))
            .flatten()
            .uniq()
            .value()

        if (userPermissions === undefined)
            return false

        return (userPermissions as string[]).includes(permission)
    }

    static CheckPermission(userToken: TUserTokenInfo | undefined, schemaRoles: string[] | undefined, permission: string): void {
        Assert.Condition(
            Roles.HasPermission(userToken, schemaRoles, permission),
            'Permission denied',
            new HttpErrorForbidden()
        )
    }
}