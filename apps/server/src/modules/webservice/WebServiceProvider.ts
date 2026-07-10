//
//
//
import { Assert } from "../../utils/Assert"
import { Factory } from "../../utils/Factory"
import { HttpErrorNotFound } from "../errors/HttpErrors"
import { WEBSERVICE } from "./@consts"
import type { IWebServiceProvider } from "./base/IWebServiceProvider"

//
type ProviderLoader = () => Promise<{ new (): IWebServiceProvider }>

type ProviderMap = {
	[key in WEBSERVICE]: ProviderLoader
}

export class WebServiceProvider {
	static readonly #webServiceFactory = new Factory<Promise<IWebServiceProvider>>()
	static readonly #loadingPromises = new Map<WEBSERVICE, Promise<IWebServiceProvider>>()
	static readonly #providerMap: ProviderMap = {
		[WEBSERVICE.REST]: () => import("./providers/RestWebService").then((m) => m.RestWebService),
		[WEBSERVICE.SOAP]: () => import("./providers/SoapWebService").then((m) => m.SoapWebService),
	}

	static async GetProvider(providerName: WEBSERVICE): Promise<IWebServiceProvider> {
		// If already loaded, return from factory
		if (WebServiceProvider.#webServiceFactory.Has(providerName)) {
			const provider = await WebServiceProvider.#webServiceFactory.Get(providerName)

			Assert.Var<IWebServiceProvider>(provider, `Web service provider not found: ${providerName}`)

			return provider.Clone()
		}

		// If already loading, return the existing promise
		const existingPromise = WebServiceProvider.#loadingPromises.get(providerName)
		if (existingPromise) {
			const provider = await existingPromise
			return provider.Clone()
		}

		// Get the provider loader from the map
		const providerLoader = WebServiceProvider.#providerMap[providerName]
		if (!providerLoader) {
			throw new HttpErrorNotFound(`WebService Provider '${providerName}' not found`)
		}

		// Create a loading promise
		const loadPromise = (async () => {
			try {
				const ProviderClass = await providerLoader()
				const provider = new ProviderClass()
				WebServiceProvider.#webServiceFactory.Register(providerName, Promise.resolve(provider))
				return provider
			} finally {
				WebServiceProvider.#loadingPromises.delete(providerName)
			}
		})()

		// Store the loading promise to prevent duplicate loads
		WebServiceProvider.#loadingPromises.set(providerName, loadPromise)
		const provider = await loadPromise
		return provider.Clone()
	}
}
