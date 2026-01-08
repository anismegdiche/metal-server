//
//
//
import type { TJson } from "../../types/TJson"

//
export type TEndpoint = {
    Method: string
    Url: string
    Data: TJson | string
    SessionHeaders?: TJson<string>
    DataPath?: string
}

export type TWebServiceEndpoint = {
    [method: string]: TJson<string> | string | null | undefined
} & {
    data?: TJson
    response?: string
    "session-headers"?: TJson<string>
}

