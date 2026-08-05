//
//
//

import type { Express } from "express"
import compression from "compression"
import zlib from "node:zlib"

//
export class RequestCompression {
	static Use(app: Express): void {
		app.use(
			compression({
				threshold: 1024,
				brotli: {
					params: {
						[zlib.constants.BROTLI_PARAM_QUALITY]: 5,
					},
				},
			}),
		)
	}
}
