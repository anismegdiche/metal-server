//
//
//


//
export enum AUTH_PROVIDER {
    DEMO = "demo",          // Demo authentication, not for production
    LOCAL = "local",        // Metal Local authentication
    OIDC = "oidc"           // OpenID Connect authentication
    // SYSTEM = "system",
    // AZURE_AD = "azure-ad"
}

export enum AUTH_PERMISSION {
    ADMIN = 'a',
    CREATE = 'c',
    READ = 'r',
    UPDATE = 'u',
    DELETE = 'd',
    LIST = 'l'
}

