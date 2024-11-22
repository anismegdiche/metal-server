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

    static readonly #AuthFactory = new Factory<absContentProvider>()

    static GetProvider(providerName: string): absContentProvider {
        if (ContentProvider.#AuthFactory.Has(providerName))
            return ContentProvider.#AuthFactory.Get(providerName)!
        else
            throw new HttpErrorNotFound(`Content Provider '${providerName}' not found`)
    }

    static RegisterProviders() {
        ContentProvider.#AuthFactory.Register(CONTENT.JSON, new JsonContent())
        ContentProvider.#AuthFactory.Register(CONTENT.CSV, new CsvContent())
        ContentProvider.#AuthFactory.Register(CONTENT.XLS, new XlsContent())
    }
}