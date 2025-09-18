//
//
//
import { DockerOptions } from "dockerode"
import { LogLevelDesc } from "loglevel"
import { tags } from "typia"
//
import { TIpPort } from "../../../types/TIpPort"
import { TUrl } from "../../../types/TUrl"
import { TConfigAiEngine } from "../../ai-engine/@types"
import { TRolePermissions } from "../../auth/@types"
import { TAuthentication } from "../../auth/types/TAuthentication"
import { STEP } from "../../plan/@consts"
import { TStepAnonymize, TStepBreak, TStepDebug, TStepDelete, TStepFields, TStepInsert, TStepJoin, TStepListEntities, TStepRemoveDuplicates, TStepRemoveFields, TStepRun, TStepSelect, TStepSort, TStepSync, TStepUpdate } from "../../plan/types/TStep"
import { TConfigSource } from "../../source/types/TConfigSource"
import { TConfigUsers } from "./TConfigUsers"


// roles
export type TConfigRoles = {
    [role: string]: TRolePermissions
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

type Debug = { [STEP.DEBUG]: TStepDebug }
type Select = { [STEP.SELECT]: TStepSelect }
type Update = { [STEP.UPDATE]: TStepUpdate }
type Delete = { [STEP.DELETE]: TStepDelete }
type Insert = { [STEP.INSERT]: TStepInsert }
type Join = { [STEP.JOIN]: TStepJoin }
type Fields = { [STEP.FIELDS]: TStepFields }
type Sort = { [STEP.SORT]: TStepSort }
type Run = { [STEP.RUN]: TStepRun }
type Sync = { [STEP.SYNC]: TStepSync }
type Anonymize = { [STEP.ANONYMIZE]: TStepAnonymize }
type RemoveDuplicates = { [STEP.REMOVE_DUPLICATE]: TStepRemoveDuplicates }
type ListEntities = { [STEP.LIST_ENTITIES]: TStepListEntities }
type RemoveFields = { [STEP.REMOVE_FIELDS]: TStepRemoveFields }
type Break = { [STEP.BREAK]: TStepBreak }

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
    | RemoveFields
    | Break

//

export type TConfig = {
    version: "0.5"
    server?: {
        port?: TIpPort
        verbosity?: LogLevelDesc
        timezone?: string
        cache?: TConfigSource
        authentication: TAuthentication                 // v0.3
        "request-limit"?: string                        // v0.3
        "response-limit"?: string                       // v0.3
        "response-rate"?: {                             // v0.3
            windowMs?: number & tags.Type<"uint32">
            max?: number & tags.Type<"uint32">
            message?: string
        }
        "response-chunk"?: boolean                      // v0.4
        "ai-engines"?: {                                // v0.5
            provider?: "docker"                         // v0.5
            params?: DockerOptions                      // v0.5
            "engines-url"?: TUrl                        // v0.5
        }
    }
    roles?: TConfigRoles
    users?: TConfigUsers
    sources: {
        [source: string]: TConfigSource
    }
    schemas?: {
        [schema: string]: TConfigSchema
    }
    "ai-engines"?: {                                    // v0.5, constructed virtually
        [aiEngine: string]: TConfigAiEngine
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