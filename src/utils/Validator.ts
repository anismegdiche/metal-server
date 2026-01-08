//
//
//
import { z_TEndpoint } from "./Schemas";
import { z_TUserCredentials, type TUserCredentials } from "../modules/auth/@types";
import type { TEndpoint } from "../modules/webservice/@types";


//
export class Validator {


    static readonly TUserCredentials = (v: unknown): v is TUserCredentials => z_TUserCredentials.safeParse(v).success;

    static readonly TEndpoint = (v: unknown): v is TEndpoint => z_TEndpoint.safeParse(v).success;
}
