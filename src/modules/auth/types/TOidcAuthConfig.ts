import { AUTH_PROVIDER } from "../@consts";


export type TOidcAuthConfig = {
    provider: AUTH_PROVIDER.OIDC;
    issuer: string;
    "client-id": string;
    "client-secret": string;
    scope?: string;
    "roles-path"?: string;
};
