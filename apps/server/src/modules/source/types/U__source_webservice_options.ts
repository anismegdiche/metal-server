import type { CONTENT } from "../../content/@consts"
import type { U__source_options_content } from "../../content/@types"
import type { WEBSERVICE, ENDPOINT } from "../../webservice/@consts"
import type { TWebServiceEndpoint } from "../../webservice/@types"

//

export type U__source_webservice_options = {
	type: WEBSERVICE
	content: CONTENT
	endpoints: {
		[ENDPOINT.SESSION]?: TWebServiceEndpoint;
		[ENDPOINT.COLLECTION_READ]: TWebServiceEndpoint;
		[ENDPOINT.COLLECTION_CREATE]?: TWebServiceEndpoint;
		[ENDPOINT.COLLECTION_UPDATE]?: TWebServiceEndpoint;
		[ENDPOINT.COLLECTION_DELETE]?: TWebServiceEndpoint;
		[ENDPOINT.COLLECTION_LIST]?: TWebServiceEndpoint;
		[ENDPOINT.ITEM_READ]?: TWebServiceEndpoint;
		[ENDPOINT.ITEM_CREATE]?: TWebServiceEndpoint;
		[ENDPOINT.ITEM_UPDATE]?: TWebServiceEndpoint;
		[ENDPOINT.ITEM_DELETE]?: TWebServiceEndpoint
	}
} & U__source_options_content
