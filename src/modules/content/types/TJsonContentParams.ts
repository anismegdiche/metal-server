import { TConvertParams } from "../../../utils/TypeUtils";
import { TJsonContentConfig } from "./TJsonContentConfig";


export type TJsonContentParams = {
    [K in keyof TJsonContentConfig as K extends `json-${infer U}` ? TConvertParams<U> : K]: TJsonContentConfig[K];
};
