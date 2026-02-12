//
//
//
import z from "zod"
import { merge } from "lodash-es"
//
import type { TRow } from "../../../types/DataTable"
import { DataTable } from "../../../types/DataTable"
import { Assert } from "../../../utils/Assert"
import { JsonUtils } from "../../../utils/JsonUtils"
import { PlaceHolder } from "../../../utils/PlaceHolder"
import { Sandbox } from "../../sandbox/Sandbox"
import type { TContext } from "../../sandbox/types/TContext"
import { Schema } from "../../schema/Schema"
import type { TSchemaRequestUpdate } from '../../schema/types/TSchemaRequest'
import type { TOptionalParameter } from "../../source/@types"
import { z_TSchemaRequestUpdate } from "../../schema/types/TSchemaRequest"
import { DATAPROVIDER, STEP } from "../@consts"
import type { TStep } from "../types/TStep"


//
export const z_U_config_plans_plan_entity_update_Params = z.union([
    z_TSchemaRequestUpdate,
    z_TSchemaRequestUpdate.omit({ schema: true, source: true }),
    z_TSchemaRequestUpdate.omit({ schema: true, entity: true, source: true })
]);


//
export type U_config_plans_plan_entity_update_Params = z.infer<typeof z_U_config_plans_plan_entity_update_Params>


//
export async function Update(step: TStep, $context?: Partial<TContext>): Promise<DataTable> {

    Assert.Var<U_config_plans_plan_entity_update_Params>(step.stepArgs,
        z_U_config_plans_plan_entity_update_Params.safeParse(step.stepArgs).success,
        `${STEP.UPDATE}: Wrong argument passed ${JsonUtils.Stringify(step.stepArgs)}`
    )

    const { currentDataTable, stepArgs } = step

    const $__schemaRequest = PlaceHolder.EvaluateJsCode<TSchemaRequestUpdate>(stepArgs, new Sandbox($context)) as TSchemaRequestUpdate

    $context = merge(
        $context,
        DATAPROVIDER.GetContext($__schemaRequest)
    )

    const { schema } = $__schemaRequest

    // case schema
    if (schema) {
        await _updateSchema(step)
        return currentDataTable
    } else {
        return _updatePlan(step)
    }
}

async function _updateSchema(step: TStep, _$context?: Partial<TContext>): Promise<void> {

    const { currentSchemaName, currentDataTable, stepArgs } = step
    const $__schemaRequest = stepArgs as TSchemaRequestUpdate
    const { schema, entity, data } = $__schemaRequest

    // only schema --> error
    Assert.Var<string>(entity, `${STEP.UPDATE}: entity is required`)
    // At least one have data
    Assert.Condition((data as TRow[])?.length > 0 || await currentDataTable.Count() > 0, `${STEP.UPDATE}: No data to insert ${JsonUtils.Stringify(step.stepArgs)}`)

    await Schema.Update(<TSchemaRequestUpdate>{
        ...$__schemaRequest,
        schema: schema ?? currentSchemaName,
        data: (data) ?? await currentDataTable.Rows()
    })
}

async function _updatePlan(step: TStep, $context?: Partial<TContext>): Promise<DataTable> {
    const { currentDataTable, stepArgs } = step
    const $__schemaRequest = stepArgs as TSchemaRequestUpdate
    const { entity, data } = $__schemaRequest

    // entity given --> error
    Assert.Var<string>(entity, !entity, `${STEP.UPDATE}: entity should not be given`)

    // At least one have data
    Assert.Condition((data as TRow[])?.length > 0, `${STEP.UPDATE}: No data to update ${JsonUtils.Stringify(step.stepArgs)}`)

    const _options: TOptionalParameter = DATAPROVIDER.Options.Parse($__schemaRequest, $context)
    const _sqlQueryHelper = await DATAPROVIDER.GenerateSqlUpdate(<TSchemaRequestUpdate>{
        entity: currentDataTable.Name
    },
        _options
    )

    return currentDataTable.FreeSql({ sqlQuery: _sqlQueryHelper.Query(), queryParams: _sqlQueryHelper.QueryParams })
}
