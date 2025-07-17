//
//
//

import { CONTENT } from "../content/@consts";


//
export enum WEBSERVICE {
    REST = "rest",
    SOAP = "soap"
}

export enum ENDPOINT {
    // login
    SESSION = "session",
    // crud
    COLLECTION_READ = "collection-read",
    COLLECTION_CREATE = "collection-create",
    COLLECTION_UPDATE = "collection-update",
    COLLECTION_DELETE = "collection-delete",
    // dal
    COLLECTION_LIST = "collection-list",
    // crud
    ITEM_READ = "item-read",
    ITEM_CREATE = "item-create",
    ITEM_UPDATE = "item-update",
    ITEM_DELETE = "item-delete"
}

export const HEADER: Record<string, Record<string, string>> = {
    [CONTENT.JSON]: { 'Content-Type': 'application/json' },
    [CONTENT.XML]: {}
}