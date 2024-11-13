//
//
//
//
//
import { HttpErrorNotFound } from "../server/HttpErrors"
import { Factory } from "../utils/Factory"
import { ACAuthProvider } from "./ACAuthProvider"
import { BasicAuth } from "./auth/BasicAuth"
import { DemoAuth } from "./auth/DemoAuth"


//
export enum AUTH_PROVIDER {
    BASIC = "basic",
    DEMO = "demo"
}


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
        AuthProvider.#AuthFactory.Register(AUTH_PROVIDER.BASIC, new BasicAuth())
    }

    static SetCurrent(providerName: string) {
        AuthProvider.Provider = AuthProvider.GetProvider(providerName)
    }
}