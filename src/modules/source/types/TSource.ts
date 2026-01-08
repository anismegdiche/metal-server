import type { TConfigSource } from "./TConfigSource";
import type { IDataProvider } from "../base/IDataProvider";

//
export type TSource = {
    SourceConfig: TConfigSource;
    DataProvider: IDataProvider;
};
