//
//
//
//
//
import { HttpErrorNotFound } from "../server/HttpErrors"
import { Factory } from "../utils/Factory"
import { absWebServiceProvider } from "./absWebServiceProvider"
import { RestWebService, TConfigSourceWebServiceRest } from "./webservice/RestWebService"


//
export enum WEBSERVICE {
    REST = "rest"
}

export type TWebServiceConfig = TConfigSourceWebServiceRest


//
export class WebServiceProvider {

    static readonly #WebServiceFactory = new Factory<absWebServiceProvider>()

    static GetProvider(providerName: string): absWebServiceProvider {
        if (WebServiceProvider.#WebServiceFactory.Has(providerName))
            return WebServiceProvider.#WebServiceFactory.Get(providerName)!.Clone()
        else
            throw new HttpErrorNotFound(`WebService Provider '${providerName}' not found`)
    }

    static RegisterProviders() {
        WebServiceProvider.#WebServiceFactory.Register(WEBSERVICE.REST, new RestWebService())
    }
}