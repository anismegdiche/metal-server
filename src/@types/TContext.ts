//
//
//
//
//
import { TRow } from "../types/DataTable"
import { TJson } from "../types/TJson"


//
export type TContext = {
    $entity?: string,           // requested entity name
    $schema?: string,           // requested schema name
    $options: {
        // from Config
        anonymize?: string | string[]
        // from Request Options
        data?: TJson | TJson[]
        fields?: string
        filter?: TJson
        "filter-expression"?: string
        sort?: string
        cache?: number
    }
    $request?: {
        "data-path"?: string    // requested JSON path, if undefined will return the whole JSON
    },
    $row?: TJson
    $response?: {
        url?: string,
        host?: string,
        body?: TJson
    },
    $plan: {
        name: string,
        schema?: string,
        entity: string,
        currentData: TRow[]
        currentStep?: number
    }
}