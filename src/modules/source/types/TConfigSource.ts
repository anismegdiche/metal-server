//
//
//
import type { TIpPort } from "../../../types/TIpPort";
import { DATA_PROVIDER } from "../@consts";
import type { TConfigSourceOptions } from "./TConfigSourceOptions";


// sources.*
export type TConfigSource = {
    provider: DATA_PROVIDER;
    host?: string;
    port?: TIpPort;
    user?: string;
    password?: string | number;
    database?: string;
    options?: TConfigSourceOptions;
};
