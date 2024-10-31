//
//
//
//
//
import { JOIN_TYPE, REMOVE_DUPLICATES_METHOD, REMOVE_DUPLICATES_STRATEGY, SORT_ORDER } from "./DataTable"
import { TJson } from "./TJson"
import { TSchemaRequestDelete, TSchemaRequestInsert, TSchemaRequestListEntities, TSchemaRequestSelect, TSchemaRequestUpdate } from "./TSchemaRequest"


export type TStepDebug = string | null

export type TStepSelect = Omit<TSchemaRequestSelect, 'schema' | 'entity' | 'sourceName'> & {
    schema?: string
    entity?: string
}

export type TStepUpdate = Omit<TSchemaRequestUpdate, 'schema' | 'entity' | 'sourceName'> & {
    schema?: string
    entity?: string
}

export type TStepDelete = Omit<TSchemaRequestDelete, 'schema' | 'entity' | 'sourceName'> & {
    schema?: string
    entity?: string
}


export type TStepInsert = Omit<TSchemaRequestInsert, 'schema' | 'entity' | 'sourceName'> & {
    schema?: string
    entity?: string
}

export type TStepJoin = {
    type: JOIN_TYPE
    schema?: string
    entity: string
    leftField: string
    rightField: string
}

export type TStepFields = string

export type TStepSort = {
    [field: string]: SORT_ORDER
}

export type TStepRun = {
    ai: string
    input: string
    output: string | TJson | null
}

export type TStepSync = {
    // v0.2
    source: {
        schema: string
        entity: string
    }
    destination: {
        schema: string
        entity: string
    }
    on: string
} & {
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

export type TStepListEntities = Omit<TSchemaRequestListEntities, 'schema' | 'entity' | 'sourceName'> & {
    schema?: string
}