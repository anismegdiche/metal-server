import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { AiDocker } from "../../ai-engine/AiDocker"
import { Cache } from "../../cache/Cache"
import { Schedule } from "../../plan/Schedule"
import { Source } from "../../source/Source"
import { ServerShutdown } from "../ServerShutdown"

vi.mock("../../plan/Schedule")
vi.mock("../../ai-engine/AiDocker")
vi.mock("../../source/Source")
vi.mock("../../cache/Cache")

describe("ServerShutdown", () => {
	let exitSpy: any

	beforeEach(() => {
		vi.clearAllMocks()
		exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
			return undefined as never
		})
		;(ServerShutdown as any).isShuttingDown = false
		vi.useFakeTimers()
	})

	afterEach(() => {
		vi.restoreAllMocks()
		vi.useRealTimers()
	})

	describe("Register", () => {
		it("should register http server", () => {
			const mockServer = {} as any
			ServerShutdown.RegisterHttpServer(mockServer)
			expect((ServerShutdown as any).httpServer).toBe(mockServer)
		})
	})

	describe("Shutdown", () => {
		it("should perform shutdown sequence and exit 0 on success", async () => {
			const closeMock = vi.fn((cb) => cb())
			const mockServer = { close: closeMock } as any
			ServerShutdown.RegisterHttpServer(mockServer)

			vi.mocked(AiDocker.CleanStack).mockResolvedValue(undefined)
			vi.mocked(Source.DisconnectAll).mockResolvedValue(undefined)
			vi.mocked(Cache.Disconnect).mockResolvedValue(undefined)

			await ServerShutdown.Shutdown("SIGTERM")

			expect(closeMock).toHaveBeenCalled()
			expect(Schedule.StopAll).toHaveBeenCalled()
			expect(AiDocker.StopScaler).toHaveBeenCalled()
			expect(AiDocker.CleanStack).toHaveBeenCalled()
			expect(Source.DisconnectAll).toHaveBeenCalled()
			expect(Cache.Disconnect).toHaveBeenCalled()
			expect(exitSpy).toHaveBeenCalledWith(0)
		})

		it("should exit 1 on error during shutdown", async () => {
			vi.mocked(Schedule.StopAll).mockImplementation(() => {
				throw new Error("fail")
			})

			await ServerShutdown.Shutdown("SIGTERM")

			expect(exitSpy).toHaveBeenCalledWith(1)
		})
	})
})
