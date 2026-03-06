//
//
//
import { Factory } from "../../utils/Factory"
import { HttpErrorNotFound } from "../errors/HttpErrors"
import { CONTENT } from "./@consts"
import type { IContentProvider } from "./base/IContentProvider"

//
export class ContentProvider {
	static readonly #contentFactory = new Factory<Promise<IContentProvider>>()
	static readonly #loadingPromises = new Map<string, Promise<IContentProvider>>()
	static readonly #providerMap: Record<CONTENT, { import: () => Promise<new () => IContentProvider> }> = {
		[CONTENT.JSON]: {
			import: () => import("./providers/JsonContent").then((m) => m.JsonContent),
		},
		[CONTENT.CSV]: {
			import: () => import("./providers/CsvContent").then((m) => m.CsvContent),
		},
		[CONTENT.XLS]: {
			import: () => import("./providers/XlsContent").then((m) => m.XlsContent),
		},
		[CONTENT.XML]: {
			import: () => import("./providers/XmlContent").then((m) => m.XmlContent),
		},
		[CONTENT.PARQUET]: {
			import: () => import("./providers/ParquetContent").then((m) => m.ParquetContent),
		},
	} as const

	static async GetProvider(providerName: string): Promise<IContentProvider> {
		// If already loaded, return from factory
		if (ContentProvider.#contentFactory.Has(providerName)) {
			return (await ContentProvider.#contentFactory.Get(providerName)!).Clone()
		}

		// If already loading, return the existing promise
		if (ContentProvider.#loadingPromises.has(providerName)) {
			const provider = await ContentProvider.#loadingPromises.get(providerName)!
			return provider.Clone()
		}

		// Get the provider loader from the map
		if (!(providerName in ContentProvider.#providerMap)) {
			throw new HttpErrorNotFound(`Content Provider '${providerName}' not found`)
		}
		const providerLoader = ContentProvider.#providerMap[providerName as CONTENT]

		// Dynamically import the provider
		const loadPromise = (async () => {
			const ProviderClass = await providerLoader.import()
			const provider = new ProviderClass()

			// Register the provider in the factory
			ContentProvider.#contentFactory.Register(providerName, Promise.resolve(provider))
			return provider
		})()

		// Store the loading promise to prevent duplicate loads
		ContentProvider.#loadingPromises.set(providerName, loadPromise)
		const provider = await loadPromise
		ContentProvider.#loadingPromises.delete(providerName)

		return provider.Clone()
	}
}
