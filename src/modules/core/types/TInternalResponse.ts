import type { HTTP_STATUS_CODE } from "../@consts"

export type TInternalResponse<T> = {
	StatusCode: HTTP_STATUS_CODE
	Body?: T
}
