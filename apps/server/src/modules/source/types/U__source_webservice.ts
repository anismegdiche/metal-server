import type { TUrl } from "../../../types/TUrl"
import type { DATA_PROVIDER } from "../@consts"
import type { U__source_webservice_options } from "./U__source_webservice_options"


export type U__source_webservice = {
	provider: DATA_PROVIDER.WEBSERVICE
	host: TUrl
	options: U__source_webservice_options
}
