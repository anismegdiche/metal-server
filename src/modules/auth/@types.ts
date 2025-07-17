//
//
//
import { tags } from "typia"


//
export type TUserToken = string | undefined

export type TUserTokenInfo = {
    user: string
    roles?: string[]
}

export type TUserCredentials = {
    username: string
    password: string
}

export type TRolePermissions = null |
    (string &
        tags.MinLength<1> &
        tags.MaxLength<6> &
        tags.Pattern<`^(?!.*(.).*\1)[crudla]{1,6}$`>)

