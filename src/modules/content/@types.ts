//
//
//
import { TCsvContentConfig } from './types/TCsvContentConfig';
import { TJsonContentConfig } from './types/TJsonContentConfig';
import { TXlsContentConfig } from './types/TXlsContentConfig';
import { TXmlContentConfig } from './types/TXmlContentConfig';

//
export type TContentConfig =
    TJsonContentConfig |
    TCsvContentConfig |
    TXlsContentConfig |
    TXmlContentConfig
