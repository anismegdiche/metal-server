//
/** biome-ignore-all lint/complexity/noStaticOnlyClass: <explanation> */
//
//
import type { DataTable } from "../../types/DataTable"
//
import { Logger } from "../../utils/Logger"
import type { TContext } from "../sandbox/types/TContext"
import { STEP } from "./@consts"
import type { TStep } from "./types/TStep"

//
export type TFunctionStep = (step: TStep, $context?: Partial<TContext>) => Promise<DataTable | undefined>

//
export class Step {
	@Logger.LogFunction()
	static readonly ExecuteCaseMap: Record<string, TFunctionStep> = {
		[STEP.DEBUG]: async (step, $context) => (await import('./steps/Debug')).Debug(step, $context),
		[STEP.SELECT]: async (step, $context) => (await import('./steps/Select')).Select(step, $context),
		[STEP.UPDATE]: async (step, $context) => (await import('./steps/Update')).Update(step, $context),
		[STEP.DELETE]: async (step, $context) => (await import('./steps/Delete')).Delete(step, $context),
		[STEP.INSERT]: async (step, $context) => (await import('./steps/Insert')).Insert(step, $context),
		[STEP.JOIN]: async (step, $context) => (await import('./steps/Join')).Join(step, $context),
		[STEP.FIELDS]: async (step, $context) => (await import('./steps/Pick')).Pick(step, $context),
		[STEP.SORT]: async (step, $context) => (await import('./steps/Sort')).Sort(step, $context),
		[STEP.RUN]: async (step, $context) => (await import('./steps/Run')).Run(step, $context),
		[STEP.SYNC]: async (step, $context) => (await import('./steps/Sync')).Sync(step, $context),
		[STEP.ANONYMIZE]: async (step, $context) => (await import('./steps/Anonymize')).Anonymize(step, $context),
		[STEP.REMOVE_DUPLICATE]: async (step, $context) => (await import('./steps/RemoveDuplicates')).RemoveDuplicates(step, $context),
		[STEP.LIST_ENTITIES]: async (step, $context) => (await import('./steps/ListEntities')).ListEntities(step, $context),
		[STEP.BREAK]: async (step, $context) => (await import('./steps/Break')).Break(step, $context),
		[STEP.PICK]: async (step, $context) => (await import('./steps/Pick')).Pick(step, $context),
		[STEP.OMIT]: async (step, $context) => (await import('./steps/Omit')).Omit(step, $context),
		[STEP.MAP]: async (step, $context) => (await import('./steps/MapRows')).MapRows(step, $context),
		[STEP.SET_VAR]: async (step, $context) => (await import('./steps/SetVar')).SetVar(step, $context),
	}
}
