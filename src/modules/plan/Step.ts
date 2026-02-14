//
//
//
import { DataTable } from "../../types/DataTable"
import type { TContext } from "../sandbox/types/TContext"
import { STEP } from "./@consts"
import type { TStep } from "./types/TStep"
//
import { Anonymize } from "./steps/Anonymize"
import { Break } from "./steps/Break"
import { Debug } from "./steps/Debug"
import { Delete } from "./steps/Delete"
import { Insert } from "./steps/Insert"
import { Join } from "./steps/Join"
import { ListEntities } from "./steps/ListEntities"
import { Map } from "./steps/Map"
import { Omit } from "./steps/Omit"
import { Pick } from "./steps/Pick"
import { RemoveDuplicates } from "./steps/RemoveDuplicates"
import { Run } from "./steps/Run"
import { Select } from "./steps/Select"
import { Sort } from "./steps/Sort"
import { Sync } from "./steps/Sync"
import { Update } from "./steps/Update"
import { Logger } from "../../utils/Logger"


//
export type TFunctionStep = (step: TStep, $context?: Partial<TContext>) => Promise<DataTable | void>;


//
export class Step {

    @Logger.LogFunction()
    static readonly ExecuteCaseMap: Record<string, TFunctionStep> = {
        [STEP.DEBUG]: Debug,
        [STEP.SELECT]: Select,
        [STEP.UPDATE]: Update,
        [STEP.DELETE]: Delete,
        [STEP.INSERT]: Insert,
        [STEP.JOIN]: Join,
        [STEP.FIELDS]: Pick,
        [STEP.SORT]: Sort,
        [STEP.RUN]: Run,
        [STEP.SYNC]: Sync,
        [STEP.ANONYMIZE]: Anonymize,
        [STEP.REMOVE_DUPLICATE]: RemoveDuplicates,
        [STEP.LIST_ENTITIES]: ListEntities,
        [STEP.BREAK]: Break,
        [STEP.PICK]: Pick,
        [STEP.OMIT]: Omit,
        [STEP.MAP]: Map
    }
}
