import { TDemoAuthConfig } from "./TDemoAuthConfig";
import { TLocalAuthConfig } from "./TLocalAuthConfig";
import { TOidcAuthConfig } from "./TOidcAuthConfig";


export type TAuthentication = {
    // Common config
    "default-role"?: string; // default user role

} &
    (TLocalAuthConfig | TDemoAuthConfig | TOidcAuthConfig);
