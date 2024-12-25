//
//
//
//
//
import { TJson } from "../types/TJson"


//
export type TContext = {
    // available for any schema request
    $request: {
        entity: string,
        schema: string
    },
    // available for webservice config (update,delete)
    $item: TJson
    // available when connected to a webservice
    $response: {
        url?: string,
        host?: string,
        body?: TJson
    }
}