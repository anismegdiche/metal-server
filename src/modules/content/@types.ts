//
//
//
import type { TCsvContentConfig } from './types/TCsvContentConfig';
import type { TJsonContentConfig } from './types/TJsonContentConfig';
import type { TXlsContentConfig } from './types/TXlsContentConfig';
import type { TXmlContentConfig } from './types/TXmlContentConfig';

//
export type TContentConfig =
    TJsonContentConfig |
    TCsvContentConfig |
    TXlsContentConfig |
    TXmlContentConfig
