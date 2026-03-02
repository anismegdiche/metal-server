//
//
//
import z from "zod"
import { isEmpty, isObject, isString, merge, omitBy } from "lodash-es"
//
import { DataTable, dataTable_fieldIsSystem } from "../../../types/DataTable"
import type { TJson } from "../../../types/TJson"
import type { TUuidv7 } from "../../../types/TUuidv7"
import { Assert } from "../../../utils/Assert"
import { JsonUtils } from "../../../utils/JsonUtils"
import { PlaceHolder, RX_JS_CODE } from "../../../utils/PlaceHolder"
import type { TContext } from "../../sandbox/types/TContext"
import { Sandbox } from "../../sandbox/Sandbox"
import { AiEngine } from "../../ai-engine/AiEngine"
import type { IAiEngine } from "../../ai-engine/base/IAiEngine"
import type { TAiArguments } from "../../ai-engine/@types"
import { z_U_config_plans_plan_entity_run_ai_Params } from "../../ai-engine/types/U_config_plans_plan_entity_run_ai_Params"
import { z_TJson } from "../../../types/TJson"
import { STEP } from "../@consts"
import type { TStep } from "../types/TStep"


//
export const z_U_config_plans_plan_entity_run_Params = z.object({
    ai: z.string(),
    input: z.string(),
    output: z.union([
        z.string(),
        z_TJson,
        z.null()
    ]).optional(),
}).and(z_U_config_plans_plan_entity_run_ai_Params);


//
export type U_config_plans_plan_entity_run_Params = z.infer<typeof z_U_config_plans_plan_entity_run_Params>


//
export async function Run(step: TStep, $context?: Partial<TContext>): Promise<DataTable> {

    Assert.Var<U_config_plans_plan_entity_run_Params>(step.stepArgs,
        z_U_config_plans_plan_entity_run_Params.safeParse(step.stepArgs).success, `${STEP.RUN}: Wrong argument passed`)

    const DEFAULT = {
        output: null
    }

    $context = merge(
        $context,
        {
            $row: undefined,
            $result: undefined
        }
    )

    const stepArgs = merge(DEFAULT, step.stepArgs) as U_config_plans_plan_entity_run_Params

    const { ai, task, input, output } = stepArgs
    const aiTask = `${ai}-${task}`
    const aiEngine = AiEngine.AiEnginesInstance.get(aiTask)

    Assert.Var<IAiEngine>(aiEngine, aiEngine !== undefined, `${STEP.RUN}: AI Engine ${aiTask} not found`)

    const rowPromises: Promise<void>[] = []

    for (const _row of await step.currentDataTable.Rows({ includeIndex: true })) {
        rowPromises.push((async () => {
            Assert.Var<string>(_row.__idx__, `${STEP.RUN}: data index is not defined`)
            Assert.Condition(_row?.content, `${STEP.RUN}: content is not defined`)

            const __idx__: TUuidv7 = _row.__idx__
            const __row = omitBy(_row, dataTable_fieldIsSystem) as TJson

            $context.$row = __row

            const $__data = RX_JS_CODE.exec(input) === null
                ? $context.$row[input]
                : PlaceHolder.EvaluateJsCode(input, new Sandbox($context))

            Assert.Condition($__data !== undefined, `${STEP.RUN}: Input ${input} is not defined`)

            const __result = <Record<string, any>>(
                await aiEngine.Run({
                    data: $__data,
                    ...step.stepArgs as U_config_plans_plan_entity_run_Params
                } as TAiArguments)
            )

            if (isEmpty(__result))
                return

            $context.$result = __result

            switch (true) {
                case isString(output):
                    __row[output] = __result
                    break

                case isObject(output):
                    for (const [___outField, ___inField] of Object.entries(output)) {
                        const $__value = RX_JS_CODE.exec(<string>___inField) === null
                            ? __result[___inField as string]
                            : PlaceHolder.EvaluateJsCode(<string>___inField, new Sandbox($context))
                        __row[___outField] = $__value
                    }
                    break

                case output === undefined || output === null:
                default:
                    __row[aiTask] = JsonUtils.SafeCopy(__result)
                    break
            }
            await step.currentDataTable.RowUpdateByIndex(__idx__, __row)
        })())
    }

    await Promise.all(rowPromises)
    return step.currentDataTable.FieldsSet()
}
