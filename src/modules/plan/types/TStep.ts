//
//
//
import { DataTable } from "../../../types/DataTable";
import { TStepArgs } from "./TStepArgs";


//
export type TStep = {
    currentSchemaName: string;
    currentPlanName: string;
    currentDataTable: DataTable;
    stepArgs: TStepArgs;
};
