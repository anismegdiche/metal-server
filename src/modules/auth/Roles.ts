//
//
//
//
import _ from "lodash"
//
import { TConfigRoles } from "../core/types/TConfig"
import { ConfigManager } from "../core/ConfigManager"
import { TUserTokenInfo } from "./@types"
import { HttpErrorForbidden } from "../errors/HttpErrors"
import { StringUtils } from "../../utils/StringUtils"


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

        let { roles = [] } = userToken

        if (roles.length === 0)
            return true

        const rolesIntersection = _.intersection(roles, schemaRoles ?? roles)

        const userPermissions = _
            .chain(rolesIntersection.map(role => {
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
        if (!Roles.HasPermission(userToken, schemaRoles, permission))
            throw new HttpErrorForbidden('Permission denied')
    }
}