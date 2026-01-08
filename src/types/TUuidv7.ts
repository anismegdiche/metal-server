//
//
//
import z from "zod";


//
export const z_TUuidv7 = z.uuidv7()//.brand<"UUIDv7">();


//
export type TUuidv7 = z.infer<typeof z_TUuidv7>;
