//
//
//
import { HttpErrorNotFound } from "../errors/HttpErrors"
import { Factory } from "../../utils/Factory"
import { IAuthProvider } from "./base/IAuthProvider"
import { AUTH_PROVIDER } from "./@consts"
import { LocalAuth } from "./providers/LocalAuth"
import { DemoAuth } from "./providers/DemoAuth"
import { OidcAuth } from "./providers/OidcAuth"


//
export class AuthProvider {

    static readonly #AuthFactory = new Factory<IAuthProvider>()
    static Provider: IAuthProvider
    

    static GetProvider(providerName: string): IAuthProvider {
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