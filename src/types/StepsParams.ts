//
//
//
//
//
import { REMOVE_DUPLICATES_METHOD, REMOVE_DUPLICATES_STRATEGY, TOrder } from "./DataTable"
import { TJson } from "./TJson"


export type TStepRemoveDuplicatesParams = {
    keys?: string[]
    condition?: string
    method?: REMOVE_DUPLICATES_METHOD
    strategy?: REMOVE_DUPLICATES_STRATEGY
}

export type TStepSyncParams = {
    // v0.2
    source: {
        schemaName: string
        entityName: string
    }
    destination: {
        schemaName: string
        entityName: string
    }
    on: string
} & {
    // v0.3
    from: {
        schemaName: string
        entityName: string
    }
    to: {
        schemaName: string
        entityName: string
    }
    id: string
}

export type TStepSortParams = Record<string, TOrder>

export type TStepRunParams = {
    ai: string
    input: string
    output: TJson
}