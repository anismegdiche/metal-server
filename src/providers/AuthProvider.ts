//
//
//
//
//
import { HttpErrorNotFound } from "../server/HttpErrors"
import { Factory } from "../utils/Factory"
import { ACAuthProvider } from "./ACAuthProvider"
// import { AzureAdAuth, TAzureAdAuthConfig } from "./auth/AzureAdAuth"
import { LocalAuth } from "./auth/LocalAuth"
import { DemoAuth } from "./auth/DemoAuth"
// import { LocalAuth } from "./auth/LocalAuth"
// import { TOpenIdConnectAuthConfig } from "./auth/OpenIDConnectAuth"



//
export enum AUTH_PROVIDER {
    LOCAL = "local",
    DEMO = "demo"//,
    // SYSTEM = "system",
    // AZURE_AD = "azure-ad"
}

export type TAuthentication = {
    provider: AUTH_PROVIDER
    "default-role"?: string
    // autocreate?: boolean
}
    // & TAzureAdAuthConfig
    // & TOpenIdConnectAuthConfig

//
export class AuthProvider {

    static readonly #AuthFactory = new Factory<ACAuthProvider>()
    static Provider: ACAuthProvider

    static GetProvider(providerName: string): ACAuthProvider {
        if (AuthProvider.#AuthFactory.Has(providerName))
            return AuthProvider.#AuthFactory.Get(providerName)!
        else
            throw new HttpErrorNotFound(`Auth Provider '${providerName}' not found`)
    }

    static RegisterProviders() {
        AuthProvider.#AuthFactory.Register(AUTH_PROVIDER.DEMO, new DemoAuth())
        AuthProvider.#AuthFactory.Register(AUTH_PROVIDER.LOCAL, new LocalAuth())
        // AuthProvider.#AuthFactory.Register(AUTH_PROVIDER.LOCAL, new LocalAuth())
        // AuthProvider.#AuthFactory.Register(AUTH_PROVIDER.AZURE_AD, new AzureAdAuth())
    }

    static SetCurrent(providerName: string) {
        AuthProvider.Provider = AuthProvider.GetProvider(providerName)
    }
}