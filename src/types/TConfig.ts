//
//
//
//
//
import { tags } from "typia"
//
import { VERBOSITY } from "../utils/Logger"
import DATA_PROVIDER from "../server/Source"
import { AI_ENGINE } from "../server/AiEngine"
import { TStepAnonymize, TStepDebug, TStepDelete, TStepFields, TStepInsert, TStepJoin, TStepListEntities, TStepRemoveDuplicates, TStepRun, TStepSelect, TStepSort, TStepSync, TStepUpdate } from "./TStep"
import { STEP } from "../server/Step"
import { TJson } from "./TJson"


// sources.*
export type TConfigSource = {
    provider: DATA_PROVIDER
    host?: string
    port?: number & tags.Minimum<1> & tags.Maximum<65_535>
    user?: string
    password?: string
    database?: string
    options?: {
        [key: string]: string | number | TJson | boolean
    }
}

// schemas.*.entities
export type TConfigSchemaEntity = {
    source: string
    entity: string
}

// schemas.*
export type TConfigSchema = {
    source: string
    entities?: {
        [entity: string]: TConfigSchemaEntity
    }
    anonymize?: string
} | {
    source?: string
    entities: {
        [entity: string]: TConfigSchemaEntity
    }
    anonymize?: string
}


// step commands friendly renaming

export type Debug = { [STEP.DEBUG]: TStepDebug }
export type Select = { [STEP.SELECT]: TStepSelect }
export type Update = { [STEP.UPDATE]: TStepUpdate }
export type Delete = { [STEP.DELETE]: TStepDelete }
export type Insert = { [STEP.INSERT]: TStepInsert }
export type Join = { [STEP.JOIN]: TStepJoin }
export type Fields = { [STEP.FIELDS]: TStepFields }
export type Sort = { [STEP.SORT]: TStepSort }
export type Run = { [STEP.RUN]: TStepRun }
export type Sync = { [STEP.SYNC]: TStepSync }
export type Anonymize = { [STEP.ANONYMIZE]: TStepAnonymize }
export type RemoveDuplicates = { [STEP.REMOVE_DUPLICATE]: TStepRemoveDuplicates }
export type ListEntities = { [STEP.LIST_ENTITIES]: TStepListEntities }

export type StepCommand =
    | Debug
    | Select
    | Update
    | Delete
    | Insert
    | Join
    | Fields
    | Sort
    | Run
    | Sync
    | Anonymize
    | RemoveDuplicates
    | ListEntities

//

export type TConfig = {
    version: "0.1" | "0.2" | "0.3"
    server?: {
        port?: number & tags.Minimum<1> & tags.Maximum<65_535>
        verbosity?: VERBOSITY
        timezone?: string
        authentication?: null
        "request-limit"?: string                    // v0.3
        "response-limit"?: string                   // v0.3
        "response-rate"?: {                         // v0.3
            windowMs?: number
            max?: number
            message?: string
        }
        cache?: TConfigSource
    }
    users?: {
        [userName: string]: string | number
    }
    sources: {
        [source: string]: TConfigSource
    }
    schemas?: {
        [schema: string]: TConfigSchema
    }
    "ai-engines"?: {
        [aiEngineName: string]: {
            engine: AI_ENGINE
            model: string
            options?: JSON
        }
    }
    plans?: {
        [planName: string]: {
            [entity: string]: Array<StepCommand>
        }
    }
    schedules?: {
        [scheduleName: string]: {
            planName: string
            entity: string
            cron: string & tags.Pattern<"(@(annually|yearly|monthly|weekly|daily|hourly|start))|(@every (\\d+(ns|us|µs|ms|s|m|h))+)|((((\\d+,)+\\d+|([\\d\\*]+(\\/|-)\\d+)|\\d+|\\*) ?){5,7})">
        }
    }
}