//
//
//
import type { DataTable } from "../../../types/DataTable";
import type { U_config_plans_plan_entity_step_Params } from "./U_config_plans_plan_entity_step";


//
export type TStep = {
    currentSchemaName: string;
    currentPlanName: string;
    currentDataTable: DataTable;
    stepArgs: U_config_plans_plan_entity_step_Params;
};
