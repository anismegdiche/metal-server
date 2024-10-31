//
//
//
//
//
import { JOIN_TYPE, REMOVE_DUPLICATES_METHOD, REMOVE_DUPLICATES_STRATEGY, SORT_ORDER } from "./DataTable"
import { TJson } from "./TJson"
import { TSchemaRequestDelete, TSchemaRequestInsert, TSchemaRequestListEntities, TSchemaRequestSelect, TSchemaRequestUpdate } from "./TSchemaRequest"


export type TStepDebug = string | null

export type TStepSelect = Omit<TSchemaRequestSelect, 'schema' | 'entityName' | 'sourceName'> & {
    schema?: string
    entityName?: string
}

export type TStepUpdate = Omit<TSchemaRequestUpdate, 'schema' | 'entityName' | 'sourceName'> & {
    schema?: string
    entityName?: string
}

export type TStepDelete = Omit<TSchemaRequestDelete, 'schema' | 'entityName' | 'sourceName'> & {
    schema?: string
    entityName?: string
}


export type TStepInsert = Omit<TSchemaRequestInsert, 'schema' | 'entityName' | 'sourceName'> & {
    schema?: string
    entityName?: string
}

export type TStepJoin = {
    type: JOIN_TYPE
    schema?: string
    entityName: string
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
        entityName: string
    }
    destination: {
        schema: string
        entityName: string
    }
    on: string
} & {
    // v0.3
    from: {
        schema: string
        entityName: string
    }
    to: {
        schema: string
        entityName: string
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

export type TStepListEntities = Omit<TSchemaRequestListEntities, 'schema' | 'entityName' | 'sourceName'> & {
    schema?: string
}