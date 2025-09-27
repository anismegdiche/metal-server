//
//
//
import { JOIN_TYPE, REMOVE_DUPLICATES_METHOD, REMOVE_DUPLICATES_STRATEGY, TOrderBy } from "../../../types/DataTable"
import { TJson } from "../../../types/TJson"
import { TStepRunAiParams } from "../../ai-engine/@types"
import { TSchemaRequestDelete, TSchemaRequestInsert, TSchemaRequestListEntities, TSchemaRequestSelect, TSchemaRequestUpdate } from "../../schema/types/TSchemaRequest"


export type TStepArgsDebug = string | null

export type TStepArgsSelect = Omit<TSchemaRequestSelect, 'schema' | 'entity' | 'source'> & ({
    schema: string
    entity: string
} | {
    entity: string
} | {
    schema: undefined
    entity: undefined
})

export type TStepArgsUpdate = Omit<TSchemaRequestUpdate, 'schema' | 'entity' | 'source'> & ({
    schema: string
    entity: string
} | {
    schema: undefined
    entity: undefined
})

export type TStepArgsDelete = Omit<TSchemaRequestDelete, 'schema' | 'entity' | 'source'> & ({
    schema: string
    entity: string
} | {
    schema: undefined
    entity: undefined
})


export type TStepArgsInsert = Omit<TSchemaRequestInsert, 'schema' | 'entity' | 'source'> & ({
    schema: string
    entity: string
} | {
    schema: undefined
    entity: undefined
})

export type TStepArgsJoin = {
    type: JOIN_TYPE
    schema?: string
    entity: string
    "left-field": string
    "right-field": string
}

export type TStepArgsFields = string | string[]

export type TStepArgsSort = TOrderBy

export type TStepArgsRun = {
    ai: string                          // ai engine name
    input: string                       // input field name
    output?: string | TJson | null      // output
} & TStepRunAiParams

export type TStepArgsSync = {
    // v0.3
    from: {
        schema: string
        entity: string
    }
    to: {
        schema: string
        entity: string
    }
    id: string
}

export type TStepArgsAnonymize = string[]

export type TStepArgsRemoveDuplicates = {
    keys?: string[]
    method?: REMOVE_DUPLICATES_METHOD
    strategy?: REMOVE_DUPLICATES_STRATEGY.FIRST | REMOVE_DUPLICATES_STRATEGY.LAST
    condition: undefined
} | {
    keys?: string[]
    method?: REMOVE_DUPLICATES_METHOD
    strategy?: REMOVE_DUPLICATES_STRATEGY.LOWEST | REMOVE_DUPLICATES_STRATEGY.HIGHEST | REMOVE_DUPLICATES_STRATEGY.CUSTOM
    condition: string
}

export type TStepArgsListEntities = Omit<TSchemaRequestListEntities, 'schema' | 'entity' | 'source'> & {
    schema?: string
}

export type TStepArgsRemoveFields = string[]

export type TStepArgsBreak = null


//
export type TStepArgs = TStepArgsDebug
    | TStepArgsSelect
    | TStepArgsUpdate
    | TStepArgsDelete
    | TStepArgsInsert
    | TStepArgsJoin
    | TStepArgsFields
    | TStepArgsSort
    | TStepArgsRun
    | TStepArgsSync
    | TStepArgsAnonymize
    | TStepArgsRemoveDuplicates
    | TStepArgsListEntities
    | TStepArgsRemoveFields
    | TStepArgsBreak