import { DataTable } from "./DataTable"
import { TSchemaRequest } from "./TSchemaRequest"


export type TCacheData = {
    hash: string
    expires: number
    schema: string
    entityName?: string
    schemaRequest: TSchemaRequest
    data: DataTable
}