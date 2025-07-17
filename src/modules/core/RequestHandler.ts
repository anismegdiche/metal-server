//
//
//
import _ from "lodash";
//
import { HttpErrorUnauthorized } from "../errors/HttpErrors";


//
export class RequestHandler {

    static CheckRequest<T>(req: T) {
        if (!_.has(req, '__METAL_CURRENT_USER')) {
            throw new HttpErrorUnauthorized()
        }
    }    
}
