//
//
//

import { Readable } from "node:stream"
import { Logger } from "@metal/logger"
import { parquetReadObjects } from "hyparquet"
import type { BaseParquetReadOptions } from "hyparquet/src/types.js"
import { ByteWriter, parquetWrite } from "hyparquet-writer"
import { merge } from "lodash-es"
import z from "zod"
//
import type { TRow, TRowsCopyParams } from "../../../types/DataTable"
import { DataTable } from "../../../types/DataTable"
import { Assert } from "../../../utils/Assert"
import { VirtualFileSystem } from "../../../utils/VirtualFileSystem"
import type { TContext } from "../../sandbox/types/TContext"
import { absContentProvider } from "../base/absContentProvider"

//
export const z_U__source_options_content_parquet = z.object({
	"parquet-utf8": z.boolean().optional(),
})

//
export type U__source_options_content_parquet = z.infer<typeof z_U__source_options_content_parquet>

//
function createDataFromRows(rows: TRow[]): Record<string, unknown[]> {
	if (rows.length === 0) return {}

	const firstRow = rows[0]

	Assert.Var<TRow>(firstRow, "First row is undefined")

	const columns = Object.keys(firstRow)
	const data: Record<string, unknown[]> = {}

	for (const col of columns) {
		data[col] = rows.map((row) => row?.[col] ?? [])
	}

	return data
}

export async function convertToArrayBuffer(stream: Readable): Promise<ArrayBuffer> {
	const chunks: Buffer[] = []

	for await (const chunk of stream) {
		chunks.push(Buffer.from(chunk))
	}

	const buffer = Buffer.concat(chunks)

	const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)

	return arrayBuffer
}

//
export class ParquetContent extends absContentProvider {
	Params: Partial<BaseParquetReadOptions> | undefined
	DEFAULT: U__source_options_content_parquet = {
		"parquet-utf8": true,
	}

	SetConfig(contentConfig: U__source_options_content_parquet): void {
		super.SetConfig(contentConfig)
		this.Config = merge(this.DEFAULT, this.Config) as U__source_options_content_parquet

		this.Params = {
			utf8: this.Config["parquet-utf8"],
		}
	}

	@Logger.LogFunction()
	InitContent(entity: string, content: Readable): void {
		this.EntityName = entity

		Assert.Var<U__source_options_content_parquet>(
			this.Config,
			z_U__source_options_content_parquet.safeParse(this.Config).success,
			"Config is not defined",
		)

		this.Content.UploadFile(entity, content)
	}

	@Logger.LogFunction(["$context"])
	async Get(rowsParams: TRowsCopyParams, _$context: Partial<TContext>): Promise<DataTable> {
		Assert.Var<VirtualFileSystem>(this.Content, VirtualFileSystem.Is(this.Content), "Content is not defined")

		// convert Readable to ArrayBuffer
		const stream = this.Content.ReadFile(this.EntityName)
		const arrayBuffer = await convertToArrayBuffer(stream)

		//
		const data = await parquetReadObjects({
			file: arrayBuffer,
			...this.Params,
		})

		using dataTable = new DataTable(this.EntityName, data)
		return dataTable.Copy(this.EntityName, rowsParams)
	}

	@Logger.LogFunction(true)
	async Set(data: DataTable, _$context: Partial<TContext>): Promise<Readable> {
		Assert.Var<VirtualFileSystem>(this.Content, VirtualFileSystem.Is(this.Content), "Content is not defined")

		const rows = await data.Rows()
		Assert.Condition(rows.length > 0, "No data to set")

		const _data = createDataFromRows(rows)

		const columnData = Object.keys(_data).map((name) => ({
			name,
			data: _data[name] ?? [],
			// type: Parquet type
		}))

		const writer = new ByteWriter()

		parquetWrite({
			writer,
			columnData,
		})

		const arrayBuffer = writer.getBuffer()
		const buffer = Buffer.from(arrayBuffer)

		const streamOut = Readable.from(buffer)
		this.Content.UploadFile(this.EntityName, streamOut)

		return this.Content.ReadFile(this.EntityName)
	}
}
