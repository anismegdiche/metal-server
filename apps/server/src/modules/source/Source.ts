
//
//
//
import { _MTR_ } from "@metal/config"
import type { TJson } from "../../types/TJson"
import { Logger } from "../../utils/Logger"
import { ConfigManager } from "../core/ConfigManager"
import type { U__sources_source } from "../core/types/U__sources"
import { HttpErrorLog } from "../errors/HttpErrors"
import { MetricsCollector } from "../metrics/MetricsCollector"
import { DATA_PROVIDER } from "./@consts"
import { DataProvider } from "./DataProvider"
import { SourceRegistry } from "./SourceRegistry"
import type { TSource } from "./types/TSource"

//
export class Source {
	// sources
	static get Sources() {
		return SourceRegistry.Sources
	}

	static async Init(): Promise<void> {
		if (ConfigManager.Has("sources")) await Source.ConnectAll()
		Source.DispatchMetrics()
	}

	static DispatchMetrics(): void {
		const sources = ConfigManager.Has("sources")
			? Object.keys(ConfigManager.Get<TJson>("sources"))
			: []
		MetricsCollector.DispatchSetEvent(_MTR_.SOURCES, sources)
		MetricsCollector.DispatchSetEvent(_MTR_.SOURCES_TOTAL, sources.length)
		MetricsCollector.DispatchSetEvent(_MTR_.SOURCES_ACTIVE, Source.Sources.size)
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
			await Source.Sources.get(source)?.DataProvider.Init(source, sourceConfig)
			Source.Sources.get(source)?.DataProvider.Connect()
			Source.DispatchMetrics()
		} catch (error: unknown) {
			HttpErrorLog(error)
		}
	}

	@Logger.LogFunction()
	static async ConnectAll(): Promise<void> {
		for (const _source in ConfigManager.Get<TJson>("sources")) {
			if (Object.hasOwn(ConfigManager.Get<TJson>("sources"), _source)) {
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
		Source.Sources.forEach(async (_dataProvider, source) => await Source.Disconnect(source))
	}
}
