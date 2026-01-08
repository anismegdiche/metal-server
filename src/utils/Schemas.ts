//
//
//
import { z } from "zod";
//
import { z_TJson } from "../types/TJson";


// TEndpoint
export const z_TEndpoint = z.object({
    Method: z.string(),
    Url: z.string(),
    Data: z.union([
        z_TJson,
        z.string()
    ]),
    SessionHeaders: z.record(z.string(), z.string()).optional(),
    DataPath: z.string().optional(),
});

// CONTENT
export const z_CONTENTS = z.enum(["json", "csv", "xls", "xml"]);

// TContentConfig (simplified for now)
export const z_TContentConfig = z.record(z.string(), z.unknown());

// TStorageFilesDataOptionsContent
export const z_TStorageFilesDataOptionsContent = z.record(z.string(), z.object({
    "content-type": z_CONTENTS,
}).and(z_TContentConfig));

// TJsonContentConfig
export const z_TJsonContentConfig = z.object({
    "json-path": z.string().optional(),
});

// TJsonContentParams
export const z_TJsonContentParams = z.object({
    path: z.string().optional(),
});

// TXlsContentConfig
export const z_TXlsContentConfig = z.object({
    "xls-sheet": z.string().optional(),
    "xls-starting-cell": z.string().optional(),
    "xls-default": z.union([z.number(), z.string(), z.null()]).optional(),
    "xls-parse-dates": z.boolean().optional(),
    "xls-date-format": z.string().optional(),
});

// TXlsContentParams
export const z_TXlsContentParams = z.object({
    sheet: z.string().optional(),
    startingCell: z.string().optional(),
    default: z.union([z.number(), z.string(), z.null()]).optional(),
    parseDates: z.boolean().optional(),
    dateFormat: z.string().optional(),
});

// TCsvContentConfig
export const z_TCsvContentConfig = z.object({
    "csv-delimiter": z.string().optional(),
    "csv-newline": z.string().optional(),
    "csv-header": z.boolean().optional(),
    "csv-quote": z.string().optional(),
    "csv-skip-empty": z.union([z.boolean(), z.literal("greedy")]).optional(),
});

// TCsvContentParams
export const z_TCsvContentParams = z.object({
    delimiter: z.string().optional(),
    newline: z.string().optional(),
    header: z.boolean().optional(),
    quoteChar: z.string().optional(),
    skipEmptyLines: z.union([z.boolean(), z.literal("greedy")]).optional(),
});

// TXmlContentConfig
export const z_TXmlContentConfig = z.object({
    "xml-path": z.string().optional(),
    "xml-ignore-attributes": z.boolean().optional(),
    "xml-attribute-prefix": z.string().optional(),
    "xml-remove-ns-prefix": z.boolean().optional(),
});


