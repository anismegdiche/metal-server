//
//
//
import { JOIN_TYPE, REMOVE_DUPLICATES_METHOD, REMOVE_DUPLICATES_STRATEGY, TOrderBy } from "../../../types/DataTable"
import { TJson } from "../../../types/TJson"
import { TStepRunAiParams } from "../../ai-engine/@types"
import { TSchemaRequestDelete, TSchemaRequestInsert, TSchemaRequestListEntities, TSchemaRequestSelect, TSchemaRequestUpdate } from "../../schema/types/TSchemaRequest"


export type TStepDebug = string | null

export type TStepSelect = Omit<TSchemaRequestSelect, 'schema' | 'entity' | 'source'> & {
    schema?: string
    entity?: string
}

export type TStepUpdate = Omit<TSchemaRequestUpdate, 'schema' | 'entity' | 'source'> & {
    schema?: string
    entity?: string
}

export type TStepDelete = Omit<TSchemaRequestDelete, 'schema' | 'entity' | 'source'> & {
    schema?: string
    entity?: string
}


export type TStepInsert = Omit<TSchemaRequestInsert, 'schema' | 'entity' | 'source'> & {
    schema?: string
    entity?: string
}

export type TStepJoin = {
    type: JOIN_TYPE
    schema?: string
    entity: string
    "left-field": string
    "right-field": string
}

export type TStepFields = string //NOSONAR

export type TStepSort = TOrderBy

export type TStepRun = {
    ai: string                          // ai engine name
    input: string                       // input field name
    output: string | TJson | null       // output
} & TStepRunAiParams

export type TStepSync = {
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

export type TStepAnonymize = string

export type TStepRemoveDuplicates = {
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

export type TStepListEntities = Omit<TSchemaRequestListEntities, 'schema' | 'entity' | 'source'> & {
    schema?: string
}