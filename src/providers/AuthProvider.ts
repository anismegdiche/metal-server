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
// import { LocalAuth } from "./auth/LocalAuth"
// import { TOpenIdConnectAuthConfig } from "./auth/OpenIDConnectAuth"


//
export enum AUTH_PROVIDER {
    LOCAL = "local",            // Metal Config authentication
    DEMO = "demo"//,            // Demo authentication, not for production
    // SYSTEM = "system",
    // AZURE_AD = "azure-ad"
}

export type TAuthentication = {
    provider: AUTH_PROVIDER     // authentication provider
    "default-role"?: string     // default user role
    // autocreate?: boolean
}
    // & TAzureAdAuthConfig
    // & TOpenIdConnectAuthConfig

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
        // AuthProvider.#AuthFactory.Register(AUTH_PROVIDER.AZURE_AD, new AzureAdAuth())
    }

    static SetCurrent(providerName: string) {
        AuthProvider.Provider = AuthProvider.GetProvider(providerName)
    }
}