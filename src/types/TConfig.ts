//
//
//
//
//

// schemas.*.entities
export type TConfigSchemaEntity  = {
    sourceName: string
    entityName: string
}

// schemas.*
export type TConfigSchema = {
    sourceName?: string
    entities?: {
        [key: string]: TConfigSchemaEntity
    }
    anonymize?:string
}