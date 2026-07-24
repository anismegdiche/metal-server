//
//
//
import { Readable } from "node:stream"
import { Logger } from "@metal/logger"
import { merge } from "lodash-es"
import z from "zod"
//
import type { TRowsCopyParams } from "../../../types/DataTable"
import { DataTable } from "../../../types/DataTable"
import type { TJson } from "@metal/types"
import { Assert } from "../../../utils/Assert"
import { JsonUtils } from "../../../utils/JsonUtils"
import { PlaceHolder } from "../../../utils/PlaceHolder"
import { ReadableUtils } from "../../../utils/ReadableUtils"
import { VirtualFileSystem } from "../../../utils/VirtualFileSystem"
import { Sandbox } from "../../sandbox/Sandbox"
import type { TContext } from "../../sandbox/types/TContext"
import { absContentProvider } from "../base/absContentProvider"

//
export const z_U__source_options_content_json = z.object({
	"json-path": z.string().optional(),
})

export const z_T_JsonContentParams = z.object({
	path: z.string().optional(),
})

//
export type U__source_options_content_json = z.infer<typeof z_U__source_options_content_json>
export type T_JsonContentParams = z.infer<typeof z_T_JsonContentParams>

//
export class JsonContent extends absContentProvider {
	Params: T_JsonContentParams | undefined
	DEFAULT: U__source_options_content_json = {
		"json-path": undefined,
	}

	SetConfig(contentConfig: U__source_options_content_json): void {
		super.SetConfig(contentConfig)
		this.Config = merge(this.DEFAULT, this.Config) as U__source_options_content_json
		this.Params = {
			path: this.Config["json-path"],
		}
	}

	@Logger.LogFunction()
	InitContent(entity: string, content: Readable): void {
		this.EntityName = entity
		Assert.Var<U__source_options_content_json>(
			this.Config,
			z_U__source_options_content_json.safeParse(this.Config).success,
			"Config is not defined",
		)

		this.Content.UploadFile(entity, content)
	}

	@Logger.LogFunction(["$context"])
	async Get(rowsParams: TRowsCopyParams, $context: Partial<TContext>): Promise<DataTable> {
		Assert.Var<T_JsonContentParams>(
			this.Params,
			z_T_JsonContentParams.safeParse(this.Params).success,
			"Params is not defined",
		)

		Assert.Var<VirtualFileSystem>(this.Content, VirtualFileSystem.Is(this.Content), "Content is not defined")

		const json = JsonUtils.TryParse(await ReadableUtils.ToString(this.Content.ReadFile(this.EntityName)), {})

		const $__path = PlaceHolder.EvaluateJsCode<string>(
			($context?.$request?.["data-path"] ?? this.Params.path) as string,
			new Sandbox($context),
		)

		const data = JsonUtils.Get<TJson[]>(json, $__path)

		using _data = new DataTable(this.EntityName, data)
		return _data.Copy(this.EntityName, rowsParams)
	}

	@Logger.LogFunction(true)
	async Set(data: DataTable, $context: Partial<TContext>): Promise<Readable> {
		Assert.Var<T_JsonContentParams>(
			this.Params,
			z_T_JsonContentParams.safeParse(this.Params).success,
			"Params is not defined",
		)

		Assert.Var<VirtualFileSystem>(this.Content, VirtualFileSystem.Is(this.Content), "Content is not defined")

		//TODO when content = "", data has empty json object {}
		const readable = this.Content.ReadFile(this.EntityName)
		const str = await ReadableUtils.ToString(readable)
		const json = JsonUtils.TryParse(str, {})

		const $__path = PlaceHolder.EvaluateJsCode<string>(
			$context?.$request?.["data-path"] ?? this.Params.path,
			new Sandbox($context),
		)

		JsonUtils.Set(json, $__path, await data.Rows())

		const streamOut = Readable.from(JSON.stringify(json))
		this.Content.UploadFile(this.EntityName, streamOut)
		return this.Content.ReadFile(this.EntityName)
	}
}
