import { DATA_ENTITY_TYPE } from "../@consts";

// | TPostgresDataConfig
// | TSqlServerDataConfig
// | TMongoDbDataConfig
//
export type TDataListEntity = {
    name: string;
    type: DATA_ENTITY_TYPE;
    size?: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    meta?: Record<string, any>;
};
