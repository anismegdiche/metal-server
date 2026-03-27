//
/** biome-ignore-all lint/complexity/noStaticOnlyClass: <explanation> */
//
//
import { uuidv7 } from "uuidv7"

//
export class Utils {
	static async Wait(
		condition: () => Promise<boolean> | boolean,
		sleepTime: number = 5_000,
		timeout: number = 60_000,
	): Promise<boolean> {
		const controller = new AbortController()

		// Set up timeout
		const timeoutId = setTimeout(() => controller.abort(), timeout)

		return new Promise<boolean>((resolve) => {
			const check = async () => {
				if (controller.signal.aborted) {
					clearTimeout(timeoutId)
					resolve(false)
					return
				}

				try {
					const result = await condition()
					if (result) {
						clearTimeout(timeoutId)
						resolve(true)
						return
					}

					if (!controller.signal.aborted) {
						setTimeout(check, sleepTime)
					}
				} catch {
					clearTimeout(timeoutId)
					resolve(false)
				}
			}

			check()
		})
	}

	static async Sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms))
	}

	static Uuid(safe: boolean = false): string {
		return safe
			? uuidv7().replaceAll("-", "")
			: uuidv7()
	}
}
