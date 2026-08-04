//
//
//

import { Logger } from "@metal/logger"
//
import { JsonUtils } from "@metal/utils"
import { intersection, merge } from "lodash-es"
import {
	type Configuration,
	discovery,
	fetchUserInfo,
	genericGrantRequest,
	skipSubjectCheck,
	type TokenEndpointResponse,
	tokenRevocation,
} from "openid-client"
import { ConfigManager } from "../../core/ConfigManager"
import { HttpErrorInternalServerError, HttpErrorUnauthorized } from "../../errors/HttpErrors"
import type { TUserCredentials, TUserTokenInfo } from "../@types"
import { absAuthProvider } from "../base/absAuthProvider"

//
enum OIDC_ERROR_MESSAGE {
	NOT_INITIALIZED = "OIDC client not initialized",
}

import type { U__server_authentication_oidc } from "../types/U__server_authentication_oidc"

//
export class OidcAuth extends absAuthProvider {
	#OidcConfig: Configuration | null = null
	#Config?: U__server_authentication_oidc
	readonly #TokenCache: Map<string, TokenEndpointResponse> = new Map()

	GetUsers() {
		// Since Oidc users are managed externally, return empty object
		return {}
	}

	readonly DEFAULT: Partial<U__server_authentication_oidc> = {
		scope: "openid roles",
		"roles-path": "realm_access.roles",
	}

	@Logger.LogFunction()
	async Init(): Promise<void> {
		//TODO workaround for SSL/TLS errors
		process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"

		this.#Config = merge(this.DEFAULT, ConfigManager.Get<U__server_authentication_oidc>("server.authentication"))

		if (this.#Config.issuer) this.#Config.issuer = `${this.#Config.issuer}/.well-known/openid-configuration`

		Logger.Info(`Initializing OIDC authentication provider ${this.#Config.issuer} ...`)

		if (!this.#Config) throw new HttpErrorInternalServerError(OIDC_ERROR_MESSAGE.NOT_INITIALIZED)

		try {
			this.#OidcConfig = await discovery(
				new URL(this.#Config.issuer),
				this.#Config["client-id"],
				this.#Config["client-secret"],
			)
		} catch (e: unknown) {
			throw new HttpErrorInternalServerError(`Failed to initialize OIDC Authentication: ${(e as Error).message}`)
		}
	}

	async Authenticate(userCredentials: TUserCredentials): Promise<TUserTokenInfo> {
		if (!this.#OidcConfig || !this.#Config) throw new HttpErrorInternalServerError(OIDC_ERROR_MESSAGE.NOT_INITIALIZED)

		const { username, password } = userCredentials

		try {
			const tokenResponse = await genericGrantRequest(this.#OidcConfig, "password", {
				username,
				password,
				scope: this.#Config.scope ?? "openid roles",
			})

			this.#TokenCache.set(username, tokenResponse)

			const userInfo = await fetchUserInfo(this.#OidcConfig, tokenResponse.access_token, skipSubjectCheck)

			const userRoles: string[] = JsonUtils.Get(userInfo, this.#Config["roles-path"]) ?? []

			const roles = intersection(userRoles, Object.keys(ConfigManager.Get("roles") ?? {}))

			return {
				user: username,
				roles,
			}
		} catch (e: unknown) {
			throw new HttpErrorUnauthorized(`Authentication failed: ${(e as Error).message}`)
		}
	}

	async LogOut(username: string): Promise<void> {
		if (!this.#OidcConfig) throw new HttpErrorInternalServerError(OIDC_ERROR_MESSAGE.NOT_INITIALIZED)

		try {
			const tokenResponse = this.#TokenCache.get(username)
			if (tokenResponse) {
				await tokenRevocation(this.#OidcConfig, tokenResponse.access_token)
				this.#TokenCache.delete(username)
			}
			Logger.Debug(`User ${username} logged out`)
		} catch (e: unknown) {
			Logger.Error(`Error during logout for user ${username}: ${(e as Error).message}`)
		}
	}
}
