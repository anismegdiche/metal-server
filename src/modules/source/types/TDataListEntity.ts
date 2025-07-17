import { DATA_ENTITY } from "../@consts";

// | TPostgresDataConfig
// | TSqlServerDataConfig
// | TMongoDbDataConfig
//
export type TDataListEntity = {
    name: string;
    type: DATA_ENTITY;
    size?: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    meta?: Record<string, any>;
};
