//
//
//
//

import { HttpErrorNotFound } from "../server/HttpErrors";
import { Factory } from "../utils/Factory"
import { ACAuthProvider } from "./ACAuthProvider";
import { BasicAuthProvider } from "./auth/BasicAuth"
import { DemoAuthProvider } from "./auth/DemoAuth"


export enum AUTH_PROVIDER {
    BASIC = "basic",
    DEMO = "demo"
}

export class AuthProvider {

    static readonly #AuthFactory = new Factory<ACAuthProvider>()
    static Provider: ACAuthProvider


    static GetProvider(providerName: string): ACAuthProvider {
        if (this.#AuthFactory.Has(providerName))
            return this.#AuthFactory.Get(providerName)!
        else
            throw new HttpErrorNotFound(`Provider '${providerName}' not found`)
    }

    static RegisterProviders() {
        this.#AuthFactory.Register(AUTH_PROVIDER.DEMO, new DemoAuthProvider())
        this.#AuthFactory.Register(AUTH_PROVIDER.BASIC, new BasicAuthProvider())
    }

    static SetCurrent(providerName: string) {
        this.Provider = this.GetProvider(providerName)
    }
}