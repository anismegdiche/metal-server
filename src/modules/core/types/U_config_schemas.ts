//
//
//
import z from "zod"
//


//
export const z_U_config_schemas_schema_entities_entity = z.object({
    source: z.string(),
    entity: z.string(),
});

export const z_U_config_schemas_schema = z.union([
    z.object({
        source: z.string(),
        entities: z.record(
            z.string(),
            z_U_config_schemas_schema_entities_entity
        ).optional(),
    }),
    z.object({
        source: z.string().optional(),
        entities: z.record(
            z.string(),
            z_U_config_schemas_schema_entities_entity
        ),
    })
]).and(z.object({
    anonymize: z.string().optional(),
    roles: z.array(z.string()).optional(),
}));


export const z_U_config_schemas = z.record(
    z.string(),
    z_U_config_schemas_schema
);


//
export type U_config_schemas_schema_entities_entity = z.infer<typeof z_U_config_schemas_schema_entities_entity>
export type U_config_schemas_schema = z.infer<typeof z_U_config_schemas_schema>
export type U_config_schemas = z.infer<typeof z_U_config_schemas>

