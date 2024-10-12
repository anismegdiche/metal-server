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
import { TJson } from "./TJson"
import { TStepAnonymize, TStepDebug, TStepDelete, TStepFields, TStepInsert, TStepJoin, TStepRemoveDuplicates, TStepRun, TStepSelect, TStepSort, TStepSync, TStepUpdate } from "./StepsParams"
import { STEP } from "../server/Step"

// Friendly renaming for errors return
type JSON = TJson

// sources.*
export type TConfigSource = {
    provider: DATA_PROVIDER
    host?: string
    port?: number & tags.Minimum<1> & tags.Maximum<65_535>
    user?: string
    password?: string
    database?: string
    options?: {
        [key: string]: string | number | JSON | boolean
    }
}

// schemas.*.entities
export type TConfigSchemaEntity = {
    sourceName: string
    entityName: string
}

// schemas.*
export type TConfigSchema =
    {
        sourceName: string
        entities?: {
            [entityName: string]: TConfigSchemaEntity
        }
        anonymize?: string
    }
    |
    {
        sourceName?: string
        entities: {
            [entityName: string]: TConfigSchemaEntity
        }
        anonymize?: string
    }


// step commands

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
        [sourceName: string]: TConfigSource
    }
    schemas?: {
        [schemaName: string]: TConfigSchema
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
            [entityName: string]: Array<StepCommand>
        }
    }
    schedules?: {
        [scheduleName: string]: {
            planName: string
            entityName: string
            cron: string & tags.Pattern<"(@(annually|yearly|monthly|weekly|daily|hourly|start))|(@every (\\d+(ns|us|µs|ms|s|m|h))+)|((((\\d+,)+\\d+|([\\d\\*]+(\\/|-)\\d+)|\\d+|\\*) ?){5,7})">
        }
    }
}