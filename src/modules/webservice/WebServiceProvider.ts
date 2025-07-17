//
//
//
import { HttpErrorNotFound } from "../errors/HttpErrors"
import { Factory } from "../../utils/Factory"
import { WEBSERVICE } from "./@consts"
import { IWebServiceProvider } from "./base/IWebServiceProvider"
import { RestWebService } from "./providers/RestWebService"
import { SoapWebService } from "./providers/SoapWebService"


//
export class WebServiceProvider {

    static readonly #WebServiceFactory = new Factory<IWebServiceProvider>()

    static GetProvider(providerName: string): IWebServiceProvider {
        if (WebServiceProvider.#WebServiceFactory.Has(providerName))
            return WebServiceProvider.#WebServiceFactory.Get(providerName)!.Clone()
        else
            throw new HttpErrorNotFound(`WebService Provider '${providerName}' not found`)
    }

    static RegisterProviders() {
        WebServiceProvider.#WebServiceFactory.Register(WEBSERVICE.REST, new RestWebService())
        WebServiceProvider.#WebServiceFactory.Register(WEBSERVICE.SOAP, new SoapWebService())
    }
}