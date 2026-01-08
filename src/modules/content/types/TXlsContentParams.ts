import type { TConvertParams } from '../../../utils/TypeUtils';
import type { TXlsContentConfig } from './TXlsContentConfig';


export type TXlsContentParams = {
    [K in keyof TXlsContentConfig as K extends `xls-${infer U}` ? TConvertParams<U> : K]: TXlsContentConfig[K];
};
