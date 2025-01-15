//
//
//
//
//
import { HttpErrorNotFound } from "../server/HttpErrors"
import { Factory } from "../utils/Factory"
import { absWebServiceProvider, TWebServiceEndpointMethod } from "./absWebServiceProvider"
import { RestWebService } from "./webservice/RestWebService"
import { SoapWebService } from "./webservice/SoapWebService"


//
export enum WEBSERVICE {
    REST = "rest",
    SOAP = "soap"
}

export type TConfigWebServiceOptions = {
    endpoints: {
        session?: TWebServiceEndpointMethod
        collection?: {
            read: TWebServiceEndpointMethod
        },
        item?: {
            create?: TWebServiceEndpointMethod
            read?: TWebServiceEndpointMethod
            update?: TWebServiceEndpointMethod
            delete?: TWebServiceEndpointMethod
        }
    }
}


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
        WebServiceProvider.#WebServiceFactory.Register(WEBSERVICE.SOAP, new SoapWebService())
    }
}