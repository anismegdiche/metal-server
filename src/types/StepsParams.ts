//
//
//
//
//
import { JOIN_TYPE } from "../server/Step"
import { REMOVE_DUPLICATES_METHOD, REMOVE_DUPLICATES_STRATEGY, SORT_ORDER } from "./DataTable"
import { TJson } from "./TJson"
import { TSchemaRequestDelete, TSchemaRequestInsert, TSchemaRequestListEntities, TSchemaRequestSelect, TSchemaRequestUpdate } from "./TSchemaRequest"


export type TStepDebug = string | null

export type TStepSelect = Omit<TSchemaRequestSelect, 'schemaName' | 'entityName' | 'sourceName'> & {
    schemaName?: string
    entityName?: string
}

export type TStepUpdate = Omit<TSchemaRequestUpdate, 'schemaName' | 'entityName' | 'sourceName'> & {
    schemaName?: string
    entityName?: string
}

export type TStepDelete = Omit<TSchemaRequestDelete, 'schemaName' | 'entityName' | 'sourceName'> & {
    schemaName?: string
    entityName?: string
}


export type TStepInsert = Omit<TSchemaRequestInsert, 'schemaName' | 'entityName' | 'sourceName'> & {
    schemaName?: string
    entityName?: string
}

export type TStepJoin = {
    type: JOIN_TYPE
    schemaName?: string
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

export type TStepAnonymize = string

export type TStepRemoveDuplicates = {
    keys?: string[]
    condition?: string
    method?: REMOVE_DUPLICATES_METHOD
    strategy?: REMOVE_DUPLICATES_STRATEGY
}

export type TStepListEntities = Omit<TSchemaRequestListEntities, 'schemaName' | 'entityName' | 'sourceName'> & {
    schemaName?: string
}