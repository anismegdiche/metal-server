//
//
//
import typia from "typia"
//
import { TUserCredentials } from "../modules/auth/@types"
import { TSchemaRequest, TSchemaRequestSelect, TSchemaRequestUpdate, TSchemaRequestInsert, TSchemaRequestDelete } from "../modules/schema/types/TSchemaRequest"
import { TSchemaResponse } from "../modules/schema/types/TSchemaResponse"
import { TEndpoint } from "../modules/webservice/@types"


//
export class Validator {
    // Pre-compiled validators for better performance    

    static readonly SchemaRequest = typia.createIs<TSchemaRequest>();
    static readonly SchemaRequestSelect = typia.createIs<TSchemaRequestSelect>();
    static readonly SchemaRequestUpdate = typia.createIs<TSchemaRequestUpdate>();
    static readonly SchemaRequestInsert = typia.createIs<TSchemaRequestInsert>();
    static readonly SchemaRequestDelete = typia.createIs<TSchemaRequestDelete>();

    static readonly SchemaResponse = typia.createIs<TSchemaResponse>();

    static readonly TUserCredentials = typia.createIs<TUserCredentials>();

    static readonly TEndpoint = typia.createIs<TEndpoint>();
}