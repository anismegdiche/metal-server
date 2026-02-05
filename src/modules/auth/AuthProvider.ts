//
//
//
import { HttpErrorNotFound } from "../errors/HttpErrors"
import { Factory } from "../../utils/Factory"
import type { IAuthProvider } from "./base/IAuthProvider"
import { AUTH_PROVIDER } from "./@consts"


//
type ProviderLoader = () => Promise<{ new(): IAuthProvider }>;

type ProviderMap = {
    [key in AUTH_PROVIDER]: ProviderLoader;
};

export class AuthProvider {
    static readonly #authFactory = new Factory<Promise<IAuthProvider>>();
    static readonly #loadingPromises = new Map<AUTH_PROVIDER, Promise<IAuthProvider>>();
    static Provider: IAuthProvider;

    static readonly #providerMap: ProviderMap = {
        [AUTH_PROVIDER.DEMO]: () => import('./providers/DemoAuth').then(m => m.DemoAuth),
        [AUTH_PROVIDER.LOCAL]: () => import('./providers/LocalAuth').then(m => m.LocalAuth),
        [AUTH_PROVIDER.OIDC]: () => import('./providers/OidcAuth').then(m => m.OidcAuth)
        // [AUTH_PROVIDER.AZURE_AD]: () => import('./providers/AzureAdAuth').then(m => m.AzureAdAuth),
    };

    static async GetProvider(providerName: AUTH_PROVIDER): Promise<IAuthProvider> {
        // If already loaded, return from factory
        if (AuthProvider.#authFactory.Has(providerName)) {
            return (await AuthProvider.#authFactory.Get(providerName)!);
        }

        // If already loading, return the existing promise
        const existingPromise = AuthProvider.#loadingPromises.get(providerName);
        if (existingPromise) {
            return existingPromise;
        }

        // Get the provider loader from the map
        const providerLoader = AuthProvider.#providerMap[providerName];
        if (!providerLoader) {
            throw new HttpErrorNotFound(`Auth Provider '${providerName}' not found`);
        }

        // Create a loading promise
        const loadPromise = (async () => {
            try {
                const ProviderClass = await providerLoader();
                const provider = new ProviderClass();
                AuthProvider.#authFactory.Register(providerName, Promise.resolve(provider));
                return provider;
            } finally {
                AuthProvider.#loadingPromises.delete(providerName);
            }
        })();

        // Store the loading promise to prevent duplicate loads
        AuthProvider.#loadingPromises.set(providerName, loadPromise);
        return loadPromise;
    }

    static async SetCurrent(providerName: AUTH_PROVIDER): Promise<void> {
        AuthProvider.Provider = await AuthProvider.GetProvider(providerName);
    }
}