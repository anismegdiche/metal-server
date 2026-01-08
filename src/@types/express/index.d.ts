//
//
//

import type { TUserTokenInfo } from "../../modules/auth"

export { }

declare global {
    namespace Express {
        export interface Request {
            __METAL_CURRENT_USER?: TUserTokenInfo
        }
    }
}