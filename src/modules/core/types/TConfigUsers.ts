
//
//
//

// users.*
export type TConfigUser = {
    password: string | number
    secret?: string
    roles?: string[]
}

// users
export type TConfigUsers = {
    [user: string]: TConfigUser;
};

