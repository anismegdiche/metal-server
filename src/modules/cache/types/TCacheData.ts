import { DataTable } from "../../../types/DataTable"
import { TSchemaRequest } from "../../schema/types/TSchemaRequest"


export type TCacheData = {
    hash: string
    expires: number
    schema: string
    entity?: string
    schemaRequest: TSchemaRequest
    data: DataTable
}