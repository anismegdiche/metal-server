import { TConfigSource } from "./TConfigSource";
import { IDataProvider } from "../base/IDataProvider";

//
export type TSource = {
    SourceConfig: TConfigSource;
    DataProvider: IDataProvider;
};
