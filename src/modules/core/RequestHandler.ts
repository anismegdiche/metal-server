//
//
//
import * as _ from "lodash-es"
//
import { HttpErrorUnauthorized } from "../errors/HttpErrors"

//
export class RequestHandler {
	static CheckRequest<T>(req: T) {
		if (!_.has(req, "__METAL_CURRENT_USER")) {
			throw new HttpErrorUnauthorized()
		}
	}
}
