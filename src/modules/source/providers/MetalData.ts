//
//
//
import { merge } from "lodash-es"
//
import type { TUrl } from "../../../types/TUrl"
import { Assert } from "../../../utils/Assert"
import { Logger } from "../../../utils/Logger"
import { CONTENT } from "../../content/@consts"
import type { TInternalResponse } from "../../core/types/TInternalResponse"
import type { U__sources_source } from "../../core/types/U__sources"
import { HttpErrorInternalServerError, HttpErrorNotImplemented } from "../../errors/HttpErrors"
import type {
	TSchemaRequestAddEntity,
	TSchemaRequestDelete,
	TSchemaRequestInsert,
	TSchemaRequestListEntities,
	TSchemaRequestSelect,
	TSchemaRequestUpdate,
} from "../../schema/types/TSchemaRequest"
import type { TSchemaResponse } from "../../schema/types/TSchemaResponse"
import { ENDPOINT, WEBSERVICE } from "../../webservice/@consts"
import { DATA_PROVIDER } from "../@consts"
import { absDataProvider } from "../base/absDataProvider"
import { WebServiceData } from "./WebServiceData"

//
export type U__source_metal = {
	host: TUrl
	user: string
	password: string
	schema: string
}

// v2.0
export class MetalData extends absDataProvider {
	SourceName?: string
	ProviderName = DATA_PROVIDER.METAL
	Config: U__source_metal = <U__source_metal>{}
	Connection?: WebServiceData

	DEFAULT: U__source_metal = {
		host: "http://127.0.0.1:3000",
		user: "",
		password: "",
		schema: "",
	}

	constructor() {
		super()
		this.Connection = new WebServiceData()
	}

	@Logger.LogFunction()
	async Init(source: string, sourceConfig: U__sources_source): Promise<void> {
		await super.Init(source, sourceConfig)
		this.Config = merge(this.DEFAULT, sourceConfig, {
			schema: sourceConfig.database,
		})

		const webServiceConfig: U__sources_source = {
			provider: DATA_PROVIDER.WEBSERVICE,
			host: this.Config.host,
			options: {
				type: WEBSERVICE.REST,
				content: CONTENT.JSON,
				endpoints: {
					[ENDPOINT.SESSION]: {
						post: "/user/login",
						data: {
							username: this.Config.user,
							password: this.Config.password,
						},
						"session-headers": {
							Authorization: "Bearer ${{ $response.body.token }}",
						},
					},
					[ENDPOINT.COLLECTION_LIST]: {
						get: `/schema/${this.Config.schema}`,
						response: "rows",
					},
					[ENDPOINT.COLLECTION_READ]: {
						get: `/schema/${this.Config.schema}/\${{ $entity }}`,
						data: {
							fields: "${{ $options.fields }}",
							filter: "${{ $options.filter }}",
							"filter-expression": "${{ $options['filter-expression'] }}",
							sort: "${{ $options.sort }}",
							cache: "${{ $options.cache }}",
						},
						response: "rows",
					},
					[ENDPOINT.COLLECTION_CREATE]: {
						post: `/schema/${this.Config.schema}/\${{ $entity }}`,
						data: {
							data: "${{ $options.data }}",
						},
					},
					[ENDPOINT.COLLECTION_UPDATE]: {
						patch: `/schema/${this.Config.schema}/\${{ $entity }}`,
						data: {
							filter: "${{ $options.filter }}",
							"filter-expression": "${{ $options['filter-expression'] }}",
							data: "${{ $options.data }}",
						},
					},
					[ENDPOINT.COLLECTION_DELETE]: {
						delete: `/schema/${this.Config.schema}/\${{ $entity }}`,
						data: {
							filter: "${{ $options.filter }}",
							"filter-expression": "${{ $options['filter-expression'] }}",
							data: "${{ $options.data }}",
						},
					},
				},
			},
		}

		if (!this.Connection) throw new HttpErrorInternalServerError("Connection not initialized")

		this.Connection.Init(this.SourceName!, webServiceConfig)
	}

	@Logger.LogFunction()
	async Connect(): Promise<void> {
		if (!this.Connection) throw new HttpErrorInternalServerError("Connection not initialized")

		await this.Connection.Connect()

		// ROADMAP check server version for mismatch and Warn
		// if (data?.version != SERVER.VERSION) {
		//     Logger.Warn(`⚠️ WARNING ⚠️  The server version for '${this.SourceName}' (version: ${data?.version}) do not match with current Metal Server (version: ${SERVER.VERSION}). Please proceed with caution.`)
		// }
	}

	@Logger.LogFunction()
	async Disconnect(): Promise<void> {
		if (!this.Connection) throw new HttpErrorInternalServerError("Connection not initialized")

		await this.Connection.Disconnect()
	}

	@Logger.LogFunction()
	async Select(schemaRequest: TSchemaRequestSelect): Promise<TInternalResponse<TSchemaResponse>> {
		if (!this.Connection) throw new HttpErrorInternalServerError("Connection not initialized")

		const intResp = await this.Connection.Select(schemaRequest)
		if (!intResp) throw new HttpErrorInternalServerError("Select failed")

		return intResp
	}

	@Logger.LogFunction()
	async Insert(schemaRequest: TSchemaRequestInsert): Promise<TInternalResponse<undefined>> {
		if (!this.Connection) throw new HttpErrorInternalServerError("Connection not initialized")

		const intResp = await this.Connection.Insert(schemaRequest)
		if (!intResp) throw new HttpErrorInternalServerError("Insert failed")

		return intResp
	}

	@Logger.LogFunction()
	async Update(schemaRequest: TSchemaRequestUpdate): Promise<TInternalResponse<undefined>> {
		if (!this.Connection) throw new HttpErrorInternalServerError("Connection not initialized")

		const intResp = await this.Connection.Update(schemaRequest)
		if (!intResp) throw new HttpErrorInternalServerError("Update failed")

		return intResp
	}

	@Logger.LogFunction()
	async Delete(schemaRequest: TSchemaRequestDelete): Promise<TInternalResponse<undefined>> {
		if (!this.Connection) throw new HttpErrorInternalServerError("Connection not initialized")

		const intResp = await this.Connection.Delete(schemaRequest)
		if (!intResp) throw new HttpErrorInternalServerError("Delete failed")

		return intResp
	}

	@Logger.LogFunction()
	async ListEntities(schemaRequest: TSchemaRequestListEntities): Promise<TInternalResponse<TSchemaResponse>> {
		Assert.Var<WebServiceData>(
			this.Connection,
			this.Connection !== undefined,
			`${this.SourceName}: Connection not initialized`,
		)

		const intResp = await this.Connection.ListEntities(schemaRequest)
		Assert.Var<TInternalResponse<TSchemaResponse>>(intResp, intResp !== undefined, "ListEntities failed")

		return intResp
	}

	@Logger.LogFunction()
	async AddEntity(_schemaRequest: TSchemaRequestAddEntity): Promise<TInternalResponse<undefined>> {
		throw new HttpErrorNotImplemented()
	}

	EscapeEntity(entity: string): string {
		return entity
	}

	EscapeField(field: string): string {
		return field
	}
}
