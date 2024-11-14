import { DataTable } from "./DataTable"
import { TSchemaRequest } from "./TSchemaRequest"


export type TCacheData = {
    hash: string
    expires: number
    schema: string
    entity?: string
    schemaRequest: TSchemaRequest
    data: DataTable
}