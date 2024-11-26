//
//
//
//
//
import { HttpErrorNotFound } from "../server/HttpErrors"
import { Factory } from "../utils/Factory"
import { absContentProvider } from "./absContentProvider"
import { JsonContent, TJsonContentConfig } from "./content/JsonContent"
import { CsvContent, TCsvContentConfig } from "./content/CsvContent"
import { TXlsContentConfig, XlsContent } from "./content/XlsContent"


//
export enum CONTENT {
    JSON = "json",      // JSON files
    CSV = "csv",        // CSV files
    XLS = "xls"         // XLSX files
}

export type TContentConfig = TJsonContentConfig & TCsvContentConfig & TXlsContentConfig


//
export class ContentProvider {

    static readonly #ContentFactory = new Factory<absContentProvider>()

    static GetProvider(providerName: string): absContentProvider {
        if (ContentProvider.#ContentFactory.Has(providerName))
            return ContentProvider.#ContentFactory.Get(providerName)!
        else
            throw new HttpErrorNotFound(`Content Provider '${providerName}' not found`)
    }

    static RegisterProviders() {
        ContentProvider.#ContentFactory.Register(CONTENT.JSON, new JsonContent())
        ContentProvider.#ContentFactory.Register(CONTENT.CSV, new CsvContent())
        ContentProvider.#ContentFactory.Register(CONTENT.XLS, new XlsContent())
    }
}