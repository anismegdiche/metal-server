import { DataTable } from "./DataTable"
import { TSchemaRequest } from "./TSchemaRequest"


export type TCacheData = {
    schemaName: string,
    entityName: string,
    hash: string,
    expires: number,
    schemaRequest: TSchemaRequest,
    datatable: DataTable
}