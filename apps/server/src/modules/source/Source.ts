//
//
//
import { _MTR_ } from "@metal/config"
import { Logger } from "@metal/logger"
import type { TJson } from "@metal/types"
import { pick } from "lodash-es"
import { Assert } from "../../utils/Assert"
import { ConfigManager } from "../core/ConfigManager"
import type { U__sources, U__sources_source } from "../core/types/U__sources"
import { MetricsCollector } from "../metrics/MetricsCollector"
import { DATA_PROVIDER } from "./@consts"
import type { IDataProvider } from "./base/IDataProvider"
import { DataProvider } from "./DataProvider"
import { SourceRegistry } from "./SourceRegistry"
import type { TSource } from "./types/TSource"

//
export class Source {
	// sources
	static get Sources() {
		return SourceRegistry.Sources
	}

	@Logger.LogFunction()
	static async Init(): Promise<void> {
		if (ConfigManager.Has("sources")) await Source.ConnectAll()
		Source.DispatchMetrics()
	}

	static DispatchMetrics(): void {

		let _sources: U__sources
		try {
			_sources = ConfigManager.Get<U__sources>("sources") ?? {}
		} catch {
			return
		}

		const _sourcesNames = Object.keys(_sources)

		const details: Record<
			string,
			{ provider: string; host: string; port: number | null; database: string | null; status: string }
		> = {}
		for (const name of _sourcesNames) {
			const config = _sources[name]
			details[name] = {
				...pick(config, ["provider", "host", "port", "database"]),
				status: "unknown",
			} as { provider: string; host: string; port: number | null; database: string | null; status: string }
		}

		MetricsCollector.DispatchEvent_set(_MTR_.SOURCES, _sourcesNames)
		MetricsCollector.DispatchEvent_set(_MTR_.SOURCES_TOTAL, _sourcesNames.length)
		MetricsCollector.DispatchEvent_set(_MTR_.SOURCES_ACTIVE, 0)
		MetricsCollector.DispatchEvent_set(_MTR_.SOURCES_DETAILS, details)
	}

	@Logger.LogFunction()
	static async Connect(source: string, sourceConfig: U__sources_source): Promise<void> {
		const { provider } = sourceConfig

		if (!Object.values(DATA_PROVIDER).includes(provider)) {
			Logger.Error(`Source '${source}', Provider '${provider}' not found. The source will not be connected`)
			return
		}
		try {
			Source.Sources.set(source, <TSource>{
				SourceConfig: sourceConfig,
				DataProvider: await DataProvider.GetProvider(provider),
			})

			const _dataProvider = Assert.Get<IDataProvider>(
				Source.Sources.get(source)?.DataProvider,
				`no DataProvider found for source '${source}'`,
			)
			_dataProvider.Init(source, sourceConfig).then(() => {
				_dataProvider
					.Connect()
					.then(() => {
						Logger.Info(`${Logger.Out} Source.Connect '${source}': connected`)
						MetricsCollector.DispatchEvent_set(_MTR_.SOURCES_ACTIVE, MetricsCollector.Get(_MTR_.SOURCES_ACTIVE, 0) + 1)
						MetricsCollector.DispatchEvent_update(_MTR_.SOURCES_DETAILS, { [source]: { status: "connected" } })
					})
					.catch((e) => {
						Logger.Error(`${Logger.Out} Error connecting to source '${source}': ${(e as Error).message}`)
						MetricsCollector.DispatchEvent_update(_MTR_.SOURCES_DETAILS, { [source]: { status: "disconnected" } })
					})
			})
		} catch (e: unknown) {
			// HttpErrorLog(error)
			Logger.Error(`${Logger.Out} Error connecting to source '${source}': ${(e as Error).message}`)
			MetricsCollector.DispatchEvent_update(_MTR_.SOURCES_DETAILS, { [source]: { status: "disconnected" } })
		}
	}

	@Logger.LogFunction()
	static async ConnectAll(): Promise<void> {
		const sources = ConfigManager.Get<U__sources>("sources") ?? {}
		if (sources === undefined || Object.keys(sources).length === 0) {
			Logger.Warn(Logger.Out, 'sources configuration is not set or empty. No sources will be connected')
			return
		}

		for (const _source in sources) {
			if (Object.hasOwn(sources, _source)) {
				Logger.Info(`${Logger.Out} found source '${_source}'`)
				const __sourceConfig = ConfigManager.Get<U__sources_source>(`sources.${_source}`)
				Source.Connect(_source, __sourceConfig)
			}
		}
	}
	@Logger.LogFunction()
	static async Disconnect(source: string): Promise<void> {
		if (source !== undefined && Source.Sources.has(source)) {
			await Source.Sources.get(source)?.DataProvider.Disconnect()
			Source.Sources.delete(source)
			Source.DispatchMetrics()
		}
	}

	@Logger.LogFunction()
	static async DisconnectAll(): Promise<void> {
		await Promise.all([...Source.Sources.keys()].map((source) => Source.Disconnect(source)))
	}
}
