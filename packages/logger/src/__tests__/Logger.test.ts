/** biome-ignore-all lint/style/noNonNullAssertion: <explanation> */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("loglevel", () => ({
	default: {
		setLevel: vi.fn(),
		enableAll: vi.fn(),
		trace: vi.fn(),
		debug: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		getLogger: vi.fn(() => ({})),
	},
}))
vi.mock("loglevel-plugin-prefix", () => ({
	default: {
		reg: vi.fn(),
		apply: vi.fn(),
	},
}))
vi.mock("morgan", () => ({
	default: vi.fn(() => "middleware"),
}))
vi.mock("colorette", () => ({
	magenta: (text: string) => text,
	green: (text: string) => text,
	cyan: (text: string) => text,
	yellow: (text: string) => text,
	red: (text: string) => text,
	gray: (text: string) => text,
	whiteBright: (text: string) => text,
	bold: (text: string) => text,
}))
const loadLogger = async () => {
	const LogLevel = await import("loglevel")
	const { Logger } = await import("@metal/logger")
	return { LogLevel: LogLevel.default, Logger }
}

describe("Logger", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.resetModules()
	})

	it("should reset level when LogLevel.setLevel fails", async () => {
		const { LogLevel, Logger } = await loadLogger()
		vi.mocked(LogLevel.setLevel).mockClear()
		vi
			.mocked(LogLevel.setLevel)
			.mockImplementationOnce(() => {
				throw new Error("fail")
			})
			.mockImplementationOnce(() => undefined)

		Logger.SetLevel("info")

		expect(LogLevel.setLevel).toHaveBeenCalledTimes(2)
	})

	it("should wrap sync and async functions with LogFunction", async () => {
		const { LogLevel, Logger } = await loadLogger()

		class Example {
			value = 1

			syncMethod(add: number) {
				return this.value + add
			}

			async asyncMethod(mult: number) {
				return this.value * mult
			}
		}

		const syncDescriptor = Object.getOwnPropertyDescriptor(Example.prototype, "syncMethod")!
		const asyncDescriptor = Object.getOwnPropertyDescriptor(Example.prototype, "asyncMethod")!

		Logger.LogFunction()(Example.prototype, "syncMethod", syncDescriptor)
		Logger.LogFunction()(Example.prototype, "asyncMethod", asyncDescriptor)

		Object.defineProperty(Example.prototype, "syncMethod", syncDescriptor)
		Object.defineProperty(Example.prototype, "asyncMethod", asyncDescriptor)

		const instance = new Example()

		expect(instance.syncMethod(2)).toBe(3)
		await expect(instance.asyncMethod(3)).resolves.toBe(3)

		expect(LogLevel.debug).toHaveBeenCalled()
		expect(LogLevel.error).not.toHaveBeenCalled()
	})
})
