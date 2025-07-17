//
//
//
import { HttpErrorNotFound } from "../errors/HttpErrors"
import { Factory } from "../../utils/Factory"
import { absContentProvider } from "./base/absContentProvider"
import { JsonContent } from "./providers/JsonContent"
import { CsvContent } from "./providers/CsvContent"
import { XlsContent } from "./providers/XlsContent"
import { XmlContent } from "./providers/XmlContent"
import { CONTENT } from "./@consts"


//
export class ContentProvider {

    static readonly #ContentFactory = new Factory<absContentProvider>()

    static GetProvider(providerName: string): absContentProvider {
        if (ContentProvider.#ContentFactory.Has(providerName))
            return ContentProvider.#ContentFactory.Get(providerName)!.Clone()
        else
            throw new HttpErrorNotFound(`Content Provider '${providerName}' not found`)
    }

    static RegisterProviders() {
        ContentProvider.#ContentFactory.Register(CONTENT.JSON, new JsonContent())
        ContentProvider.#ContentFactory.Register(CONTENT.CSV, new CsvContent())
        ContentProvider.#ContentFactory.Register(CONTENT.XLS, new XlsContent())
        ContentProvider.#ContentFactory.Register(CONTENT.XML, new XmlContent())
    }
}