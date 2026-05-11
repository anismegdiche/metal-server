//
//
//
import { isEmpty, isObject, isString, merge } from "lodash-es"
//
import type { DataTable, TRow } from "../../../types/DataTable"
import type { TUuidv7 } from "../../../types/TUuidv7"
import { Assert } from "../../../utils/Assert"
import { JsonUtils } from "../../../utils/JsonUtils"
import { PlaceHolder, RX_JS_CODE } from "../../../utils/PlaceHolder"
import type { TAiArguments } from "../../ai-engine/@types"
import { AiEngine } from "../../ai-engine/AiEngine"
import type { IAiEngine } from "../../ai-engine/base/IAiEngine"
import { Sandbox } from "../../sandbox/Sandbox"
import type { TContext } from "../../sandbox/types/TContext"
import { STEP } from "../@consts"
import { type U__plans_plan_run_Params, z_U__plans_plan_run_Params, } from "../types/U__plans_params"
import type { U__plans_plan__step_Params } from "../types/U__plans_plan__step"
import type { TAny } from "../../../types/TAny"


//
const DEFAULT = {
	output: null,
}


//
export async function Run(stepParams: U__plans_plan__step_Params, $context: Partial<TContext>): Promise<DataTable> {

	const _stepParam = merge(DEFAULT, stepParams)

	Assert.Var<U__plans_plan_run_Params>(
		_stepParam,
		z_U__plans_plan_run_Params.safeParse(_stepParam).success,
		`${STEP.RUN}: Wrong argument passed`,
	)

	$context.$row = undefined
	$context.$result = undefined

	const {
		data: planData
	} = $context?.$plan as NonNullable<Record<string, unknown>>
	Assert.Var<DataTable>(planData, "Data is not initialized")

	const rowPromises: Promise<void>[] = []

	for (const _row of await planData.Rows({ includeIndex: true })) {
		rowPromises.push(
			(async () => {
				Assert.Var<string>(_row.__idx__, `${STEP.RUN}: data index is not defined`)

				const __idx__: TUuidv7 = _row.__idx__
				const __row = await _runRow(_row, _stepParam, $context)
				await planData.RowUpdateByIndex(__idx__, __row)
			})(),
		)
	}

	return Promise.all(rowPromises)
		.then(() => planData.FieldsSet())
}

export async function _runRow(row: TRow, stepParams: U__plans_plan__step_Params, $context: Partial<TContext>): Promise<TRow> {
	Assert.Var<U__plans_plan_run_Params>(
		stepParams,
		z_U__plans_plan_run_Params.safeParse(stepParams).success,
		`${STEP.RUN}: Wrong argument passed`,
	)

	Assert.Var<string>(row.__idx__, `${STEP.RUN}: data index is not defined`)
	Assert.Condition(row?.content, `${STEP.RUN}: content is not defined`)

	// reset $context
	$context.$row = row
	$context.$result = undefined

	const {
		input,
		output
	} = stepParams

	const $__fieldValue = RX_JS_CODE.exec(input) === null
		? $context.$row[input]
		: PlaceHolder.EvaluateJsCode(input, new Sandbox($context))

	const $__stepParams = PlaceHolder.EvaluateJsCode<U__plans_plan_run_Params>(
		merge(DEFAULT, stepParams),
		new Sandbox($context),
	) as U__plans_plan_run_Params

	const {
		ai,
		task,
	} = $__stepParams

	const aiTask = `${ai}-${task}`
	const aiEngine = AiEngine.AiEnginesInstance.get(aiTask)

	Assert.Var<IAiEngine>(aiEngine, aiEngine !== undefined, `${STEP.RUN}: AI Engine ${aiTask} not found`)

	Assert.Condition($__fieldValue !== undefined, `${STEP.RUN}: Input ${input} is not defined`)

	const aiResult = <Record<string, TAny>>await aiEngine.Run({
		data: $__fieldValue,
		...($__stepParams as U__plans_plan_run_Params),
	} as TAiArguments)

	if (isEmpty(aiResult))
		return row

	$context.$result = aiResult

	const $__output = PlaceHolder.EvaluateJsCode(output, new Sandbox($context))

	switch (true) {
		case isString($__output):
			row[$__output] = aiResult
			break

		case isObject($__output) && $__output !== null && $__output !== undefined:
			for (const [_outField, _inField] of Object.entries($__output)) {
				const $__value =
					RX_JS_CODE.exec(<string>_inField) === null
						? aiResult[_inField as string]
						: PlaceHolder.EvaluateJsCode(<string>_inField, new Sandbox($context))
				row[_outField] = $__value
			}
			break
			
		default:
			row[aiTask] = JsonUtils.SafeCopy(aiResult)
			break
	}
	return row
}
