//
//
//
import { isEmpty, isObject, isString, merge, omitBy } from "lodash-es"
//
import { type DataTable, dataTable_fieldIsSystem } from "../../../types/DataTable"
import type { TJson } from "../../../types/TJson"
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


//
export async function Run(stepParams: U__plans_plan__step_Params, $context?: Partial<TContext>): Promise<DataTable> {
	Assert.Var<U__plans_plan_run_Params>(
		stepParams,
		z_U__plans_plan_run_Params.safeParse(stepParams).success,
		`${STEP.RUN}: Wrong argument passed`,
	)

	const DEFAULT = {
		output: null,
	}

	$context = merge($context, {
		$row: undefined,
		$result: undefined,
	})

	const {
		data: planData
	} = $context?.$plan as NonNullable<Record<string, unknown>>
	Assert.Var<DataTable>(planData, "Data is not initialized")

	const _step = merge(DEFAULT, stepParams) as U__plans_plan_run_Params

	const { ai, task, input, output } = _step
	const aiTask = `${ai}-${task}`
	const aiEngine = AiEngine.AiEnginesInstance.get(aiTask)

	Assert.Var<IAiEngine>(aiEngine, aiEngine !== undefined, `${STEP.RUN}: AI Engine ${aiTask} not found`)

	const rowPromises: Promise<void>[] = []

	for (const _row of await planData.Rows({ includeIndex: true })) {
		rowPromises.push(
			(async () => {
				Assert.Var<string>(_row.__idx__, `${STEP.RUN}: data index is not defined`)
				Assert.Condition(_row?.content, `${STEP.RUN}: content is not defined`)

				const __idx__: TUuidv7 = _row.__idx__
				const __row = omitBy(_row, dataTable_fieldIsSystem) as TJson

				$context.$row = __row

				const $__data =
					RX_JS_CODE.exec(input) === null ? $context.$row[input] : PlaceHolder.EvaluateJsCode(input, new Sandbox($context))

				Assert.Condition($__data !== undefined, `${STEP.RUN}: Input ${input} is not defined`)

				const __result = <Record<string, any>>await aiEngine.Run({
					data: $__data,
					...(stepParams as U__plans_plan_run_Params),
				} as TAiArguments)

				if (isEmpty(__result)) return

				$context.$result = __result

				switch (true) {
					case isString(output):
						__row[output] = __result
						break

					case isObject(output):
						for (const [___outField, ___inField] of Object.entries(output)) {
							const $__value =
								RX_JS_CODE.exec(<string>___inField) === null
									? __result[___inField as string]
									: PlaceHolder.EvaluateJsCode(<string>___inField, new Sandbox($context))
							__row[___outField] = $__value
						}
						break
					default:
						__row[aiTask] = JsonUtils.SafeCopy(__result)
						break
				}
				await planData.RowUpdateByIndex(__idx__, __row)
			})(),
		)
	}

	await Promise.all(rowPromises)
	return planData.FieldsSet()
}
