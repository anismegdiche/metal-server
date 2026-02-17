//
//
//
import z from 'zod';
//
import { z_U__source_options_content_csv } from './providers/CsvContent';
import { z_U__source_options_content_json } from './providers/JsonContent';
import { z_U__source_options_content_parquet } from './providers/ParquetContent';
import { z_U__source_options_content_xls } from './providers/XlsContent';
import { z_U__source_options_content_xml } from './providers/XmlContent';


//
export const z_U__source_options_content = z.union([
    z_U__source_options_content_json,
    z_U__source_options_content_csv,
    z_U__source_options_content_parquet,
    z_U__source_options_content_xls,
    z_U__source_options_content_xml
])


//
export type U__source_options_content = z.infer<typeof z_U__source_options_content>