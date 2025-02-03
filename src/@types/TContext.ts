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
    $request?: {
        "data-path"?: string    // requested JSON path, if undefined will return the whole JSON
    },
    $item?: TJson
    $response?: {
        url?: string,
        host?: string,
        body?: TJson
    }
}