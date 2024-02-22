import { DataTable } from "./DataTable"
import { TSchemaRequest } from "./TSchemaRequest"


export type TCacheData = {
    hash: string,
    expires: number,
    schemaRequest: TSchemaRequest,
    datatable: DataTable
}