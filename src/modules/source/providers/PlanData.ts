//
//
//
import { merge } from "lodash-es"
//
import { DataTable } from "../../../types/DataTable"
import { Logger } from "../../../utils/Logger"
import { SynchronizerManager } from "../../../utils/SynchronizerManager"
import { RESPONSE } from "../../core/@consts"
import { HttpResponse } from "../../core/HttpResponse"
import type { TInternalResponse } from "../../core/types/TInternalResponse"
import type { U__sources_source } from "../../core/types/U__sources"
import { HttpErrorBadRequest, HttpErrorNotFound } from "../../errors/HttpErrors"
import { Plans } from "../../plan/Plans"
import type { TContext } from "../../sandbox/types/TContext"
import type { TSchemaRequest, TSchemaRequestDelete, TSchemaRequestInsert, TSchemaRequestListEntities, TSchemaRequestSelect, TSchemaRequestUpdate, } from "../../schema/types/TSchemaRequest"
import type { TSchemaResponse } from "../../schema/types/TSchemaResponse"
import { DATA_PROVIDER } from "../@consts"
import type { TOptionalParameter } from "../@types"
import { absDataProvider } from "../base/absDataProvider"
import { Source } from "../Source"
import { Assert } from "../../../utils/Assert"
import type { Plan } from "../../plan/Plan"


//
export class PlanData extends absDataProvider {
	SourceName?: string
	ProviderName = DATA_PROVIDER.PLANS
	Config: U__sources_source = <U__sources_source>{}
	Connection: undefined

	// biome-ignore lint/complexity/noUselessConstructor: compatibility
	constructor() {
		super()
	}

	@Logger.LogFunction()
	async Init(source: string, sourceConfig: U__sources_source): Promise<void> {
		await super.Init(source, sourceConfig)
		this.Config = sourceConfig
	}

	@Logger.LogFunction()
	async Connect(): Promise<void> {
		Logger.Info(`${Logger.Out} connected to '${this.SourceName} (${this.Config.database})'`)
	}

	@Logger.LogFunction()
	async Disconnect(): Promise<void> {
		Logger.Info(`${Logger.In} '${this.SourceName} (${this.Config.database})' disconnected`)
	}

	@Logger.LogFunction()
	@SynchronizerManager.Synchronized()
	async Select(schemaRequest: TSchemaRequestSelect, $context?: Partial<TContext>,): Promise<TInternalResponse<TSchemaResponse>> {
		const { schema, entity, source } = schemaRequest

		$context = merge($context, this.GetContext(schemaRequest))

		const options: TOptionalParameter = this.Options.Parse(schemaRequest, $context)

		const sqlQueryHelper = this.GenerateSqlSelect(schemaRequest, options)

		const sqlQuery = this.GetSqlQuery(sqlQueryHelper, options)

		Assert.Var<string>(source, source !== undefined,
			`${schema}: plan '${source}' is missing`,
			new HttpErrorNotFound())

		Assert.Condition(
			Source.Sources.has(source),
			`${schema}: plan '${source}' is missing`,
			new HttpErrorNotFound()
		)

		const sourceConfig = Source.Sources.get(source)?.SourceConfig
		const planName = sourceConfig?.database

		Assert.Var<string>(planName,
			planName !== undefined,
			`${schema}: plan '${source}' is missing`,
			new HttpErrorBadRequest()
		)

		const plan = Plans.get(planName)

		Assert.Var<Plan>(
			plan,
			`${schema}: No plan found`,
			new HttpErrorNotFound()
		)

		const data = new DataTable(schemaRequest.entity)

		if (plan) {
			const planData = await plan.ProcessSchemaRequest(schemaRequest, sqlQuery)
			if (planData) {
				await data.RowsSet(await planData.Rows())
				if (options?.Cache)
					await this.CacheSet(
						{
							...schemaRequest,
							source: this.SourceName,
						},
						data,
					)
			}
		}

		return HttpResponse.Ok(<TSchemaResponse>{
			schema,
			entity,
			...RESPONSE.SELECT.SUCCESS.MESSAGE,
			...RESPONSE.SELECT.SUCCESS.STATUS,
			data,
		})
	}

	@Logger.LogFunction()
	async Insert(schemaRequest: TSchemaRequestInsert): Promise<TInternalResponse<undefined>> {
		const { schema, entity } = schemaRequest
		throw new HttpErrorBadRequest(`Not allowed for plans '${schema}', entity '${entity}'`)
	}

	@Logger.LogFunction()
	async Update(schemaRequest: TSchemaRequestUpdate): Promise<TInternalResponse<undefined>> {
		const { schema, entity } = schemaRequest
		throw new HttpErrorBadRequest(`Not allowed for plans '${schema}', entity '${entity}'`)
	}

	@Logger.LogFunction()
	async Delete(schemaRequest: TSchemaRequestDelete): Promise<TInternalResponse<undefined>> {
		const { schema, entity } = schemaRequest
		throw new HttpErrorBadRequest(`Not allowed for plans '${schema}', entity '${entity}'`)
	}

	@Logger.LogFunction()
	async AddEntity(schemaRequest: TSchemaRequest): Promise<TInternalResponse<undefined>> {
		const { schema } = schemaRequest
		throw new HttpErrorBadRequest(`Not allowed for plans '${schema}'`)
	}

	@Logger.LogFunction()
	async ListEntities(schemaRequest: TSchemaRequestListEntities): Promise<TInternalResponse<TSchemaResponse>> {
		const { schema } = schemaRequest
		throw new HttpErrorBadRequest(`Not allowed for plans '${schema}'`)
	}

	EscapeEntity(entity: string): string {
		return `"${entity}"`
	}

	EscapeField(field: string): string {
		return `"${field}"`
	}
}
