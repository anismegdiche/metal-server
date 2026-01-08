import type { TConvertParams } from '../../../utils/TypeUtils';
import type { TCsvContentConfig } from './TCsvContentConfig';


export type TCsvContentParams = Omit<Required<{
    [K in keyof TCsvContentConfig as K extends `csv-${infer U}` ? TConvertParams<U> : K]: TCsvContentConfig[K];
}> & {
    // Workaround to align with Csv.ParseConfig
    quoteChar: string;
    skipEmptyLines: boolean | "greedy";
}, 'quote' | 'skipEmpty'
>;
