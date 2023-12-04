import { DataTable } from "./DataTable"
import { TDataRequest } from "./TDataRequest"


export type TCacheData = {
    schema: string,
    entity: string,
    hash: string,
    expires: number,
    request: TDataRequest,
    datatable: DataTable
}