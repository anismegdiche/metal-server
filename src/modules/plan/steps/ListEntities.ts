//
//
//
import { keys, merge } from "lodash-es"
import z from "zod"
//
import { DataTable } from "../../../types/DataTable"
import { Assert } from "../../../utils/Assert"
import { JsonUtils } from "../../../utils/JsonUtils"
import { Logger } from "../../../utils/Logger"
import { PlaceHolder } from "../../../utils/PlaceHolder"
import { ConfigManager } from "../../core/ConfigManager"
import { HttpErrorNotFound } from "../../errors/HttpErrors"
import { Sandbox } from "../../sandbox/Sandbox"
import type { TContext } from "../../sandbox/types/TContext"
import { Schema } from "../../schema/Schema"
import type { TSchemaRequestListEntities, TSchemaRequestSelect } from '../../schema/types/TSchemaRequest'
import { z_TSchemaRequestListEntities } from "../../schema/types/TSchemaRequest"
import { z_TSchemaResponse } from "../../schema/types/TSchemaResponse"
import { DATA_ENTITY_TYPE } from "../../source/@consts"
import type { TDataListEntity } from "../../source/@types"
import { STEP } from "../@consts"
import { DATAPROVIDER } from "../consts/DATAPROVIDER"
import type { TStep } from "../types/TStep"


//
export const z_U_config_plans_plan_entity_list_entities_Params = z.union([
    z.null(),
    z_TSchemaRequestListEntities
]);


//
export type U_config_plans_plan_entity_list_entities_Params = z.infer<typeof z_U_config_plans_plan_entity_list_entities_Params>


//
export async function ListEntities(step: TStep, $context?: Partial<TContext>): Promise<DataTable> {


    Assert.Var<U_config_plans_plan_entity_list_entities_Params>(step.stepArgs,
        z_U_config_plans_plan_entity_list_entities_Params.safeParse(step.stepArgs).success,
        `${STEP.LIST_ENTITIES}: Wrong argument passed ${JsonUtils.Stringify(step.stepArgs)}`)

    const { stepArgs } = step

    const $__schemaRequest = PlaceHolder.EvaluateJsCode<TSchemaRequestSelect>(stepArgs, new Sandbox($context)) as TSchemaRequestSelect

    $context = merge(
        $context,
        DATAPROVIDER.GetContext($__schemaRequest)
    )

    return ($__schemaRequest?.schema)
        ? await _listEntitiesSchema(step)
        : await _listEntitiesPlan(step, $context)
}

async function _listEntitiesSchema(step: TStep, _$context?: Partial<TContext>): Promise<DataTable> {

    const { currentSchemaName, stepArgs } = step
    const schemaRequest = stepArgs as TSchemaRequestListEntities
    const { schema } = schemaRequest

    // data from schema
    const _intResp = await Schema.ListEntities(<TSchemaRequestListEntities>{
        ...schemaRequest,
        schema: schema ?? currentSchemaName
    })

    const _isSchemaResponse = Schema.IsSchemaResponse(_intResp.Body)

    if (_intResp.Body && _isSchemaResponse)
        return _intResp.Body.data
    else {
        console.error("Validation debug:", {
            hasBody: !!_intResp.Body,
            body: _intResp.Body,
            isSchemaResponse: _intResp.Body ? Schema.IsSchemaResponse(_intResp.Body) : false,
            dataCount: _intResp.Body && Schema.IsSchemaResponse(_intResp.Body) ? await _intResp.Body.data.Count() : "N/A",
            validationError: _intResp.Body ? z_TSchemaResponse.safeParse(_intResp.Body).error : "No body"
        });
        throw new HttpErrorNotFound(`${STEP.LIST_ENTITIES}: Schema '${schema}' is not valid`)
    }
}

async function _listEntitiesPlan(step: TStep, _$context?: Partial<TContext>): Promise<DataTable> {

    const { currentDataTable } = step

    const entitiesList: TDataListEntity[] = keys(ConfigManager.Get(`plans.${step.currentPlanName}`))
        .map((entity: string) => (<TDataListEntity>{
            name: entity,
            type: DATA_ENTITY_TYPE.PLAN_ENTITY
        }))

    Logger.Debug(`${STEP.LIST_ENTITIES}: ${JsonUtils.Stringify(step.stepArgs)}`)
    return new DataTable(currentDataTable.Name, entitiesList)
}
