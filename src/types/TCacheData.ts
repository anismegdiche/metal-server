import { DataTable } from "./DataTable"
import { TSchemaRequest } from "./TSchemaRequest"


export type TCacheData = {
    schema: string,
    entity: string,
    hash: string,
    expires: number,
    request: TSchemaRequest,
    datatable: DataTable
}