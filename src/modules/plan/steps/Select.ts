//
//
//
import { merge } from "lodash-es"
import z from "zod"
//
import { DataTable } from "../../../types/DataTable"
import { Assert } from "../../../utils/Assert"
import { JsonUtils } from "../../../utils/JsonUtils"
import { Logger } from "../../../utils/Logger"
import { PlaceHolder } from "../../../utils/PlaceHolder"
import { HttpErrorNotFound } from "../../errors/HttpErrors"
import { Sandbox } from "../../sandbox/Sandbox"
import type { TContext } from "../../sandbox/types/TContext"
import { Schema } from "../../schema/Schema"
import type { TSchemaRequestSelect } from '../../schema/types/TSchemaRequest'
import { z_TSchemaRequestSelect } from "../../schema/types/TSchemaRequest"
import type { TOptionalParameter } from "../../source/@types"
import { STEP } from "../@consts"
import { Plans } from "../Plans"
import type { TStep } from "../types/TStep"
import type { TSchemaResponse } from "../../schema/types/TSchemaResponse"
import { DATAPROVIDER } from "../consts/DATAPROVIDER"


//
export const z_U_config_plans_plan_entity_select_Params = z.union([
    z_TSchemaRequestSelect,
    z_TSchemaRequestSelect.omit({ schema: true, source: true }),
    z_TSchemaRequestSelect.omit({ schema: true, entity: true, source: true })
]);


//
export type U_config_plans_plan_entity_select_Params = z.infer<typeof z_U_config_plans_plan_entity_select_Params>


//
export async function Select(step: TStep, $context?: Partial<TContext>): Promise<DataTable> {

    Assert.Var<U_config_plans_plan_entity_select_Params>(step.stepArgs,
        z_U_config_plans_plan_entity_select_Params.safeParse(step.stepArgs).success,
        `${STEP.SELECT}: Wrong argument passed ${JsonUtils.Stringify(step.stepArgs)}`)

    const { stepArgs } = step

    const $__schemaRequest = PlaceHolder.EvaluateJsCode<TSchemaRequestSelect>(stepArgs, new Sandbox($context)) as TSchemaRequestSelect

    $context = merge(
        $context,
        DATAPROVIDER.GetContext($__schemaRequest)
    )

    const $__step: TStep = {
        ...step,
        stepArgs: $__schemaRequest
    }

    return ($__schemaRequest.schema !== undefined && $__schemaRequest.entity !== undefined)
        ? await _selectSchema($__step)
        : await _selectPlan($__step, $context)
}

async function _selectSchema(step: TStep): Promise<DataTable> {

    const { currentSchemaName, stepArgs } = step
    const schemaRequest = stepArgs as TSchemaRequestSelect
    const { schema, entity } = schemaRequest

    // only schema --> error
    Assert.Var<string>(entity, `${STEP.SELECT}: entity is required`)
    Assert.Var<string>(schema, `${STEP.SELECT}: schema is required`)

    // data from schema
    const _intResp = await Schema.Select(<TSchemaRequestSelect>{
        ...schemaRequest,
        schema: schema ?? currentSchemaName
    })

    const _schemaResponse = _intResp?.Body

    Assert.Var<TSchemaResponse>(
        _schemaResponse,
        Schema.IsSchemaResponse(_schemaResponse) == true,
        `${STEP.SELECT}: Schema '${schema}' and entity '${entity}' are not valid`)

    const _data = _schemaResponse?.data

    Assert.Var<DataTable>(
        _data,
        DataTable.Is(_data) == true,
        `${STEP.SELECT}: Schema '${schema}' and entity '${entity}' are not valid`)

    return _data
}

async function _selectPlan(step: TStep, $context?: Partial<TContext>): Promise<DataTable> {

    const { currentSchemaName, currentDataTable, stepArgs } = step
    const schemaRequest = stepArgs as TSchemaRequestSelect
    const { entity } = schemaRequest

    const _options: TOptionalParameter = DATAPROVIDER.Options.Parse(schemaRequest, $context)

    if (entity) {
        // data from current plan entity
        const data = await Plans.get(step.currentPlanName)?.ProcessSchemaRequest(<TSchemaRequestSelect>{
            ...schemaRequest,
            schema: currentSchemaName,
            entity: entity
        })

        if (!data)
            throw new HttpErrorNotFound(`${Logger.Out} ${STEP.SELECT}: Entity ${entity} not found in plan ${step.currentPlanName}`)

        const sqlQueryHelper = DATAPROVIDER.GenerateSqlSelect(<TSchemaRequestSelect>{
            entity: data.Name
        },
            _options
        )

        const sqlQuery = DATAPROVIDER.GetSqlQuery(sqlQueryHelper, _options)
        return data.FreeSql({ sqlQuery, queryParams: sqlQueryHelper.QueryParams })
    } else {
        // data from current datatable
        const sqlQueryHelper = DATAPROVIDER.GenerateSqlSelect(<TSchemaRequestSelect>{
            entity: currentDataTable.Name
        },
            _options
        )

        const sqlQuery = DATAPROVIDER.GetSqlQuery(sqlQueryHelper, _options)
        return currentDataTable.FreeSql({ sqlQuery, queryParams: sqlQueryHelper.QueryParams })
    }
}

export async function _select(schema: string, entity: string): Promise<DataTable | undefined> {
    const intResp = await Schema.Select({
        schema,
        entity
    })

    if (intResp.Body && Schema.IsSchemaResponse(intResp.Body) && (await intResp.Body.data.Count()) > 0)
        return intResp.Body.data

    return undefined
}
