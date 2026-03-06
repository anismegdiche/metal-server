//
//
//
import * as _ from "lodash-es"
//
import { Assert } from "../../utils/Assert"
import { StringUtils } from "../../utils/StringUtils"
import { ConfigManager } from "../core/ConfigManager"
import type { U_config_roles } from "../core/types/U_config_roles"
import { HttpErrorForbidden } from "../errors/HttpErrors"
import type { TUserTokenInfo } from "./@types"

//
export class Roles {
	static _serverRoles: U_config_roles
	static UserDefaultRole?: string

	static Init(): void {
		Roles._serverRoles = ConfigManager.Get<U_config_roles>("roles") ?? <U_config_roles>{}
		Roles.UserDefaultRole = ConfigManager.Get("server.authentication.default-role")
	}

	static HasPermission(
		userToken: TUserTokenInfo | undefined,
		schemaRoles: string[] | undefined,
		permission: string,
	): boolean {
		if (!userToken) return true

		const { roles = [] } = userToken

		if (roles.length === 0) return true

		const rolesIntersection = _.intersection(roles, schemaRoles ?? roles)

		const userPermissions: string[] = _.chain(
			rolesIntersection.map((role) => {
				if (!StringUtils.IsEmpty(Roles._serverRoles[role])) {
					return Roles._serverRoles[role]?.split("") || []
				}
				return []
			}),
		)
			.flatten()
			.uniq()
			.value()

		if (userPermissions === undefined) return false

		return userPermissions.includes(permission)
	}

	static CheckPermission(
		userToken: TUserTokenInfo | undefined,
		schemaRoles: string[] | undefined,
		permission: string,
	): void {
		Assert.Condition(
			Roles.HasPermission(userToken, schemaRoles, permission),
			"Permission denied",
			new HttpErrorForbidden(),
		)
	}
}
