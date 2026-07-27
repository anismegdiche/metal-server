import { z } from "zod"
import { CONTENT } from "../../content/@consts"
import { z_U__source_options_content } from "../../content/types/U__source_options_content"
import { ENDPOINT, WEBSERVICE } from "../../webservice/@consts"
import { z_TWebServiceEndpoint } from "../../webservice/@types"

//
export const z_U__source_webservice_options = z
	.object({
		type: z.enum(WEBSERVICE),
		endpoints: z.object({
			[ENDPOINT.SESSION]: z_TWebServiceEndpoint.optional(),
			[ENDPOINT.COLLECTION_READ]: z_TWebServiceEndpoint,
			[ENDPOINT.COLLECTION_CREATE]: z_TWebServiceEndpoint.optional(),
			[ENDPOINT.COLLECTION_UPDATE]: z_TWebServiceEndpoint.optional(),
			[ENDPOINT.COLLECTION_DELETE]: z_TWebServiceEndpoint.optional(),
			[ENDPOINT.COLLECTION_LIST]: z_TWebServiceEndpoint.optional(),
			[ENDPOINT.ITEM_READ]: z_TWebServiceEndpoint.optional(),
			[ENDPOINT.ITEM_CREATE]: z_TWebServiceEndpoint.optional(),
			[ENDPOINT.ITEM_UPDATE]: z_TWebServiceEndpoint.optional(),
			[ENDPOINT.ITEM_DELETE]: z_TWebServiceEndpoint.optional(),
		}),
	})
	.and(z_U__source_options_content)

export type U__source_webservice_options = z.infer<typeof z_U__source_webservice_options>
