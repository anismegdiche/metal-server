import { DataTable } from "../../../types/DataTable";
import { TContext } from "../../sandbox/types/TContext";
import { TStepArguments } from "./TStepArguments";


export type TFunctionStep = (stepArguments: TStepArguments, $context?: Partial<TContext>) => Promise<DataTable>;
