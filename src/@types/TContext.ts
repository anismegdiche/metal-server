//
//
//
//
//
import { TJson } from "../types/TJson"


//
export type TContext = {
    $entity?: string,           // requested entity name
    $schema?: string,           // requested schema name
    // available for schema request
    $request?: {
        "data-path"?: string    // requested JSON path, if undefined will return the whole JSON
    },
    // available for webservice config (update,delete)
    $item?: TJson
    // available when connected to a webservice
    $response?: {
        url?: string,
        host?: string,
        body?: TJson
    }
}