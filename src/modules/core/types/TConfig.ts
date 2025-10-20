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
import { TStepArgsAnonymize, TStepArgsBreak, TStepArgsDebug, TStepArgsDelete, TStepArgsFields, TStepArgsInsert, TStepArgsJoin, TStepArgsListEntities, TStepArgsRemoveDuplicates, TStepArgsRemoveFields, TStepArgsRun, TStepArgsSelect, TStepArgsSort, TStepArgsSync, TStepArgsUpdate } from "../../plan/types/TStepArgs"
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

type Debug = { [STEP.DEBUG]: TStepArgsDebug }
type Select = { [STEP.SELECT]: TStepArgsSelect }
type Update = { [STEP.UPDATE]: TStepArgsUpdate }
type Delete = { [STEP.DELETE]: TStepArgsDelete }
type Insert = { [STEP.INSERT]: TStepArgsInsert }
type Join = { [STEP.JOIN]: TStepArgsJoin }
type Fields = { [STEP.FIELDS]: TStepArgsFields }
type Sort = { [STEP.SORT]: TStepArgsSort }
type Run = { [STEP.RUN]: TStepArgsRun }
type Sync = { [STEP.SYNC]: TStepArgsSync }
type Anonymize = { [STEP.ANONYMIZE]: TStepArgsAnonymize }
type RemoveDuplicates = { [STEP.REMOVE_DUPLICATE]: TStepArgsRemoveDuplicates }
type ListEntities = { [STEP.LIST_ENTITIES]: TStepArgsListEntities }
type RemoveFields = { [STEP.REMOVE_FIELDS]: TStepArgsRemoveFields }
type Break = { [STEP.BREAK]: TStepArgsBreak }

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
            "engines-url"?: TUrl                        // v0.5
            "timeout"?: number & tags.Type<"uint32"> // v0.5
            "min-instance"?: number & tags.Type<"uint32"> & tags.Minimum<1> // v0.5
            "max-instance"?: number & tags.Type<"uint32"> // v0.5
            "cpu-scale-up"?: number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<100>// v0.5
            "cpu-scale-down"?: number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<100>// v0.5
            "scale-interval"?: number & tags.Type<"uint32"> & tags.Minimum<5_000> & tags.Maximum<600_000>// v0.5
            params?: DockerOptions                      // v0.5
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