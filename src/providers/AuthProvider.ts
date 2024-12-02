//
//
//
//
//
import { HttpErrorNotFound } from "../server/HttpErrors"
import { Factory } from "../utils/Factory"
import { absAuthProvider } from "./absAuthProvider"
// import { AzureAdAuth, TAzureAdAuthConfig } from "./auth/AzureAdAuth"
import { LocalAuth } from "./auth/LocalAuth"
import { DemoAuth } from "./auth/DemoAuth"
import { OidcAuth, TOidcAuthConfig } from "./auth/OidcAuth"


//
export enum AUTH_PROVIDER {
    DEMO = "demo",              // Demo authentication, not for production
    LOCAL = "local",            // Metal Local authentication
    OIDC = "oidc"               // OpenID Connect authentication
    // SYSTEM = "system",
    // AZURE_AD = "azure-ad"
}

export type TAuthentication = {
    provider: AUTH_PROVIDER     // authentication provider
    "default-role"?: string     // default user role
    // autocreate?: boolean
}
   & TOidcAuthConfig
    // & TAzureAdAuthConfig

//
export class AuthProvider {

    static readonly #AuthFactory = new Factory<absAuthProvider>()
    static Provider: absAuthProvider

    static GetProvider(providerName: string): absAuthProvider {
        if (AuthProvider.#AuthFactory.Has(providerName))
            return AuthProvider.#AuthFactory.Get(providerName)!
        else
            throw new HttpErrorNotFound(`Auth Provider '${providerName}' not found`)
    }

    static RegisterProviders() {
        AuthProvider.#AuthFactory.Register(AUTH_PROVIDER.DEMO, new DemoAuth())
        AuthProvider.#AuthFactory.Register(AUTH_PROVIDER.LOCAL, new LocalAuth())
        AuthProvider.#AuthFactory.Register(AUTH_PROVIDER.OIDC, new OidcAuth())
        // AuthProvider.#AuthFactory.Register(AUTH_PROVIDER.AZURE_AD, new AzureAdAuth())
    }

    static SetCurrent(providerName: string) {
        AuthProvider.Provider = AuthProvider.GetProvider(providerName)
    }
}