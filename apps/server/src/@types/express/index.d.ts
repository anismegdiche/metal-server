//
//
//

import type { TUserTokenInfo } from "../../modules/auth"

declare global {
	namespace Express {
		export interface Request {
			__METAL_CURRENT_USER?: TUserTokenInfo
		}
	}
}
