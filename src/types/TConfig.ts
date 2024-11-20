//
//
//
//
//
import { tags } from "typia"
//
import DATA_PROVIDER from "../server/Source"
import { AI_ENGINE } from "../server/AiEngine"
import { TStepAnonymize, TStepDebug, TStepDelete, TStepFields, TStepInsert, TStepJoin, TStepListEntities, TStepRemoveDuplicates, TStepRun, TStepSelect, TStepSort, TStepSync, TStepUpdate } from "./TStep"
import { STEP } from "../server/Step"
import { TJson } from "./TJson"
import { TAuthentication } from "../providers/AuthProvider"
import { TRolePermissions } from "../server/Roles"
import { LogLevelDesc } from "loglevel"


// roles
export type TConfigRoles = {
    [role: string]: TRolePermissions
}

// users.*
export type TConfigUser = {
    password: string | number
    secret?: string
    roles?: string[]
}

// users
export type TConfigUsers = {
    [user: string]: TConfigUser
}

// sources.*.options
export type TConfigSourceOptions = {
    [key: string]: string | number | TJson | boolean
}

// sources.*
export type TConfigSource = {
    provider: DATA_PROVIDER
    host?: string
    port?: number & tags.Minimum<1> & tags.Maximum<65_535>
    user?: string
    password?: string
    database?: string
    options?: TConfigSourceOptions
}

// schemas.*.entities
export type TConfigSchemaEntity = {
    source: string
    entity: string
}

// schemas.*
export type TConfigSchema = ({
    source: string
    entities?: {
        [entity: string]: TConfigSchemaEntity
    }
} | {
    source?: string
    entities: {
        [entity: string]: TConfigSchemaEntity
    }
}) & {
    anonymize?: string                                  // v0.3     fields to anonymize
    roles?: string[]                                    // v0.3     roles that can access this schema
}


// plans..*
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
        verbosity?: LogLevelDesc
        timezone?: string
        authentication: TAuthentication                 // v0.3
        "request-limit"?: string                        // v0.3
        "response-limit"?: string                       // v0.3
        "response-rate"?: {                             // v0.3
            windowMs?: number
            max?: number
            message?: string
        }
        cache?: TConfigSource
    }
    roles?: TConfigRoles
    users?: TConfigUsers
    sources: {
        [source: string]: TConfigSource
    }
    schemas?: {
        [schema: string]: TConfigSchema
    }
    "ai-engines"?: {
        [aiEngine: string]: {
            engine: AI_ENGINE
            model: string
            options?: TJson
        }
    }
    plans?: {
        [plan: string]: {
            [entity: string]: Array<StepCommand>
        }
    }
    schedules?: {
        [schedule: string]: {
            plan: string
            entity: string
            cron: string & tags.Pattern<"(@(annually|yearly|monthly|weekly|daily|hourly|start))|(@every (\\d+(ns|us|µs|ms|s|m|h))+)|((((\\d+,)+\\d+|([\\d\\*]+(\\/|-)\\d+)|\\d+|\\*) ?){5,7})">
        }
    }
}