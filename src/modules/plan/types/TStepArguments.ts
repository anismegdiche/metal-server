import { DataTable } from "../../../types/DataTable";
import { TJson } from "../../../types/TJson";
import { TSchemaRequest } from "../../schema/types/TSchemaRequest";

//


export type TStepArguments = {
    currentSchemaName: string;
    currentPlanName: string;
    currentDataTable: DataTable;
    stepParams?: TSchemaRequest | TJson | string;
};
