//
//
//

import { TUserTokenInfo } from "../../server/User"

export { }

declare global {
    namespace Express {
        export interface Request {
            __METAL_CURRENT_USER?: TUserTokenInfo
        }
    }
}