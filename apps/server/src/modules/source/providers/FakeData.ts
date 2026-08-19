//
//
//
import {
	af_ZA,
	ar,
	az,
	bn_BD,
	cs_CZ,
	cy,
	da,
	de,
	de_AT,
	de_CH,
	dv,
	el,
	en,
	en_AU,
	en_BORK,
	en_CA,
	en_GB,
	en_GH,
	en_HK,
	en_IE,
	en_IN,
	en_NG,
	en_US,
	en_ZA,
	eo,
	es,
	es_MX,
	Faker,
	fa,
	fi,
	fr,
	fr_BE,
	fr_CA,
	fr_CH,
	fr_LU,
	fr_SN,
	he,
	hr,
	hu,
	hy,
	id_ID,
	it,
	ja,
	ka_GE,
	ko,
	type LocaleDefinition,
	lv,
	mk,
	nb_NO,
	ne,
	nl,
	nl_BE,
	pl,
	pt_BR,
	pt_PT,
	ro,
	ro_MD,
	ru,
	sk,
	sr_RS_latin,
	sv,
	ta_IN,
	th,
	tr,
	uk,
	ur,
	uz_UZ_latin,
	vi,
	yo_NG,
	zh_CN,
	zh_TW,
	zu_ZA,
} from "@faker-js/faker"
import { Logger } from "@metal/logger"
import { merge } from "lodash-es"
//
import { DataBase } from "../../../types/DataBase"
import { DataTable } from "../../../types/DataTable"
import { Assert } from "../../../utils/Assert"
import { SynchronizerManager } from "../../../utils/SynchronizerManager"
import { RESPONSE } from "../../core/@consts"
import { HttpResponse } from "../../core/HttpResponse"
import type { TInternalResponse } from "../../core/types/TInternalResponse"
import type { U__sources_source } from "../../core/types/U__sources"
import { HttpErrorBadRequest, HttpErrorNotFound, HttpErrorNotImplemented } from "../../errors/HttpErrors"
import { Sandbox } from "../../sandbox/Sandbox"
import type { TContext } from "../../sandbox/types/TContext"
import type {
	TSchemaRequest,
	TSchemaRequestDelete,
	TSchemaRequestInsert,
	TSchemaRequestListEntities,
	TSchemaRequestSelect,
	TSchemaRequestUpdate,
} from "../../schema/types/TSchemaRequest"
import type { TSchemaResponse } from "../../schema/types/TSchemaResponse"
import { DATA_ENTITY_TYPE, DATA_PROVIDER } from "../@consts"
import type { TOptionalParameter } from "../@types"
import type { U__source_fake_data, U__source_fake_data_entity } from "../types/U__source_fake_data"
import { MemoryData } from "./MemoryData"

//
const LOCALE_MAP: Record<string, LocaleDefinition> = {
	af_ZA: af_ZA,
	ar_AR: ar,
	az_AZ: az,
	bn_BD: bn_BD,
	cs_CZ: cs_CZ,
	cy_CY: cy,
	da_DA: da,
	de_DE: de,
	de_AT: de_AT,
	de_CH: de_CH,
	dv_DV: dv,
	el_EL: el,
	en_EN: en,
	en_AU: en_AU,
	en_BORK: en_BORK,
	en_CA: en_CA,
	en_GB: en_GB,
	en_GH: en_GH,
	en_HK: en_HK,
	en_IE: en_IE,
	en_IN: en_IN,
	en_NG: en_NG,
	en_US: en_US,
	en_ZA: en_ZA,
	eo_EO: eo,
	es_ES: es,
	es_MX: es_MX,
	fa_FA: fa,
	fi_FI: fi,
	fr_FR: fr,
	fr_BE: fr_BE,
	fr_CA: fr_CA,
	fr_CH: fr_CH,
	fr_LU: fr_LU,
	fr_SN: fr_SN,
	he_HE: he,
	hr_HR: hr,
	hu_HU: hu,
	hy_HY: hy,
	id_ID: id_ID,
	it_IT: it,
	ja_JA: ja,
	ka_GE: ka_GE,
	ko_KO: ko,
	lv_LV: lv,
	mk_MK: mk,
	nb_NO: nb_NO,
	ne_NE: ne,
	nl_NL: nl,
	nl_BE: nl_BE,
	pl_PL: pl,
	pt_BR: pt_BR,
	pt_PT: pt_PT,
	ro_RO: ro,
	ro_MD: ro_MD,
	ru_RU: ru,
	sk_SK: sk,
	sr_RS: sr_RS_latin,
	sv_SV: sv,
	ta_IN: ta_IN,
	th_TH: th,
	tr_TR: tr,
	uk_UK: uk,
	ur_UR: ur,
	uz_UZ: uz_UZ_latin,
	vi_VI: vi,
	yo_NG: yo_NG,
	zh_CN: zh_CN,
	zh_TW: zh_TW,
	zu_ZA: zu_ZA,
}

//
export class FakeData extends MemoryData {
	ProviderName = DATA_PROVIDER.FAKE_DATA
	private _faker!: Faker
	private _fakeDataConfig!: U__source_fake_data
	private _seed!: number

	// biome-ignore lint/complexity/noUselessConstructor: compatibility
	constructor() {
		super()
	}

	@Logger.LogFunction()
	async Init(source: string, sourceConfig: U__sources_source): Promise<void> {
		await super.Init(source, sourceConfig)
		this._fakeDataConfig = sourceConfig as U__source_fake_data
	}

	@Logger.LogFunction()
	async Connect(): Promise<void> {
		Assert.Var<string>(this.SourceName, "SourceName is required")
		this.Connection = new DataBase(this.SourceName)

		// set seed
		this._seed = this._fakeDataConfig.options?.seed ?? Math.floor(Math.random() * 2_147_483_647)

		const entities = this._fakeDataConfig.options?.entities ?? {}
		for (const [entityName, entityDef] of Object.entries(entities)) {
			const entityRows = await this._generateRows(entityDef)
			this.Connection.AddTable(entityName)
			await this.Connection.Tables[entityName]!.RowsSet(entityRows)
		}

		Logger.Info(
			`${Logger.Out} Connected to '${this.SourceName}' with ${Object.keys(entities).length} fake entities (seed: ${this._seed})`,
		)
	}

	@Logger.LogFunction()
	async Disconnect(): Promise<void> {
		await super.Disconnect()
	}

	@Logger.LogFunction()
	@SynchronizerManager.Synchronized()
	async Select(
		schemaRequest: TSchemaRequestSelect,
		$context?: Partial<TContext>,
	): Promise<TInternalResponse<TSchemaResponse>> {
		const { schema, entity } = schemaRequest

		Assert.Var<DataBase>(this.Connection, `${schema}: Connection is required`)

		const schemaResponse = <TSchemaResponse>{ schema, entity }

		if (this._fakeDataConfig.options?.autocreate && !this.Connection.Tables[entity]) {
			this.Connection.AddTable(entity)
		}

		Assert.Var<DataTable>(
			this.Connection.Tables[entity],
			`${schema}: Entity '${entity}' not found`,
			new HttpErrorNotFound(),
		)

		$context = merge($context, this.GetContext(schemaRequest))

		const options: TOptionalParameter = this.Options.Parse(schemaRequest, $context)

		const data = new DataTable(entity)

		const memoryRows = await this.Connection.Tables[entity].Rows({
			fields: options.Fields,
			filter: options.Filter,
			sort: options.Sort,
			skip: options.Offset,
			limit: options.Limit,
		})

		if (memoryRows.length > 0) {
			await data.RowsSet(memoryRows)
			if (options?.Cache) await this.CacheSet(schemaRequest, data)
		}

		let total = 0
		if (options?.Limit !== undefined) {
			total = await this.Connection.Tables[entity].Count(options.Filter)
		}

		await this.SetPagination(data, options, total)

		return HttpResponse.Ok(<TSchemaResponse>{
			...schemaResponse,
			...RESPONSE.SELECT.SUCCESS.MESSAGE,
			...RESPONSE.SELECT.SUCCESS.STATUS,
			data,
		})
	}

	@Logger.LogFunction()
	async Insert(
		schemaRequest: TSchemaRequestInsert,
		$context?: Partial<TContext>,
	): Promise<TInternalResponse<undefined>> {
		const { schema, entity } = schemaRequest

		Assert.Var<DataBase>(this.Connection, `${schema}: Connection is required`)

		Assert.Var<DataTable>(
			this.Connection.Tables[entity],
			`${schema}: Entity '${entity}' not found`,
			new HttpErrorNotFound(),
		)

		$context = merge($context, this.GetContext(schemaRequest))

		const options: TOptionalParameter = this.Options.Parse(schemaRequest, $context)

		Assert.Var<DataTable>(options.Data, `${schema}: data is missing`, new HttpErrorBadRequest())

		return this.Connection.Tables[entity]
			.RowsAdd(await options.Data.Rows())
			.then(() => this.CacheRemove(schemaRequest))
			.then(() => HttpResponse.Created())
	}

	@Logger.LogFunction()
	async Update(
		schemaRequest: TSchemaRequestUpdate,
		$context?: Partial<TContext>,
	): Promise<TInternalResponse<undefined>> {
		return super.Update(schemaRequest, $context)
	}

	@Logger.LogFunction()
	async Delete(
		schemaRequest: TSchemaRequestDelete,
		$context?: Partial<TContext>,
	): Promise<TInternalResponse<undefined>> {
		return super.Delete(schemaRequest, $context)
	}

	@Logger.LogFunction()
	async AddEntity(_schemaRequest: TSchemaRequest): Promise<TInternalResponse<undefined>> {
		throw new HttpErrorNotImplemented("FakeData: entities are defined in source configuration")
	}

	@Logger.LogFunction()
	async ListEntities(schemaRequest: TSchemaRequestListEntities): Promise<TInternalResponse<TSchemaResponse>> {
		const { schema } = schemaRequest

		Assert.Var<DataBase>(this.Connection, `${schema}: Connection is required`)

		const rows = await Promise.all(
			Object.keys(this.Connection.Tables).map(async (entity) => ({
				name: entity,
				type: DATA_ENTITY_TYPE.DATATABLE,
				size: await this.Connection?.Tables[entity]?.Count(),
			})),
		)

		Assert.Condition(rows.length > 0, `${schema}: No entities found`, new HttpErrorNotFound())

		return HttpResponse.Ok(<TSchemaResponse>{
			schema,
			...RESPONSE.LIST_ENTITIES.SUCCESS.MESSAGE,
			...RESPONSE.LIST_ENTITIES.SUCCESS.STATUS,
			data: new DataTable(undefined, rows),
		})
	}

	EscapeEntity(entity: string): string {
		return `"${entity}"`
	}

	EscapeField(field: string): string {
		return field
	}

	// --- Private helpers ---

	private async _generateRows(entityDef: U__source_fake_data_entity): Promise<Record<string, unknown>[]> {
		const fields = entityDef.fields ?? {}
		const count = entityDef.rows ?? 100

		if (Object.keys(fields).length === 0) return []

		// entity locale		
		const locale =
			LOCALE_MAP[
			this._fakeDataConfig.options?.entities
				? (Object.values(this._fakeDataConfig.options.entities)[0]?.locale ?? "en_US")
				: "en_US"
			] ?? en_US

		const sandbox = new Sandbox({
			faker: new Faker({ locale, seed: this._seed }),
			fallbackFaker: new Faker({ locale: en, seed: this._seed })
		} as Partial<TContext>)

		const generators = Object.entries(fields).map(([fieldName, expression]) => {
			const mainCode = `() => faker.${expression}`
			const fallbackCode = `() => fallbackFaker.${expression}`

			let mainFn: (() => unknown) | undefined
			let fallbackFn: (() => unknown) | undefined

			try {
				mainFn = sandbox.Evaluate<() => unknown>(mainCode) ?? undefined
			} catch {
				mainFn = undefined
			}

			try {
				fallbackFn = sandbox.Evaluate<() => unknown>(fallbackCode) ?? undefined
			} catch {
				fallbackFn = undefined
			}

			const fn = (): unknown => {
				try {
					if (!mainFn) throw new Error("no main fn")
					return mainFn()
				} catch {
					try {
						if (!fallbackFn) return undefined
						return fallbackFn()
					} catch {
						return undefined
					}
				}
			}

			return { fieldName, fn }
		})

		const rows: Record<string, unknown>[] = []
		for (let i = 0; i < count; i++) {
			const row: Record<string, unknown> = {}
			for (const { fieldName, fn } of generators) {
				row[fieldName] = fn()
			}
			rows.push(row)
		}

		return rows
	}
}
