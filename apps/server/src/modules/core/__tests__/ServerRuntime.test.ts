import { beforeEach, describe, expect, it, vi } from "vitest"
import { AiDocker } from "../../ai-engine/AiDocker"
import { AiEngine } from "../../ai-engine/AiEngine"
import { Roles } from "../../auth/Roles"
import { Cache } from "../../cache/Cache"
import { PlansManager } from "../../plan/PlansManager"
import { Schedule } from "../../plan/Schedule"
import { DataProvider } from "../../source/DataProvider"
import { Source } from "../../source/Source"
import { SERVER } from "../@consts"
import { ConfigManager } from "../ConfigManager"
import { ServerInitializer } from "../ServerInitializer"
import { ServerRuntime } from "../ServerRuntime"
import { ServerShutdown } from "../ServerShutdown"

vi.mock("../../auth/Roles")
vi.mock("../ServerShutdown")
vi.mock("../../plan/Schedule")
vi.mock("../../cache/Cache")
vi.mock("../../source/Source")
vi.mock("../../plan/PlansManager")
vi.mock("../../ai-engine/AiEngine")
vi.mock("../../source/DataProvider")
vi.mock("../../ai-engine/AiDocker")
vi.mock("../../schema/Schema", () => ({
	Schema: {
		Init: vi.fn(),
	},
}))
vi.mock("../../auth/AuthProvider", () => ({
	AuthProvider: {
		SetCurrent: vi.fn(),
		Provider: {
			Init: vi.fn(),
		},
	},
}))
vi.mock("../../../utils/Convert", () => ({
	Convert: {
		HumainSizeToBytes: vi.fn().mockReturnValue(1024),
	},
}))
vi.mock("../ConfigManager", () => ({
	ConfigManager: {
		Init: vi.fn(),
		Load: vi.fn().mockResolvedValue({}),
		Has: vi.fn().mockReturnValue(true),
		Get: vi.fn().mockReturnValue({}),
		Set: vi.fn(),
		ConfigFilePath: "mock-config-path",
	},
}))
vi.mock("../ConfigStore")

describe("ServerRuntime", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	describe("GetInfo", () => {
		it("should return server name and version", async () => {
			const res = await ServerRuntime.GetInfo()
			expect(res.Body).toEqual({
				server: SERVER.NAME,
				version: SERVER.VERSION,
			})
		})
	})

	describe("Reload", () => {
		it("should check permission and reload all components", async () => {
			const userToken = { user: "admin" }
			vi.spyOn(ServerInitializer, "InitAll")
			await ServerRuntime.Reload(userToken as any)

			expect(ServerInitializer.InitAll).toHaveBeenCalledWith(false)
			expect(Roles.CheckPermission).toHaveBeenCalled()
			expect(AiDocker.StopScaler).toHaveBeenCalled()
			expect(Schedule.StopAll).toHaveBeenCalled()
			expect(Cache.Disconnect).toHaveBeenCalled()
			expect(Source.DisconnectAll).toHaveBeenCalled()
			expect(PlansManager.Clear).toHaveBeenCalled()
			expect(AiEngine.Clear).toHaveBeenCalled()
			expect(DataProvider.Clear).toHaveBeenCalled()
			expect(ConfigManager.Init).toHaveBeenCalled()
			expect(Source.Init).toHaveBeenCalled()
			expect(Cache.Init).toHaveBeenCalled()
			expect(AiEngine.Init).toHaveBeenCalled()
			expect(PlansManager.Init).toHaveBeenCalled()
			expect(Schedule.Init).toHaveBeenCalledWith(false)
		})
	})

	describe("ReloadPlans", () => {
		it("should check permission and call PlansManager.Reload", async () => {
			const userToken = { user: "admin" }
			await ServerRuntime.ReloadPlans(userToken as any)

			expect(Roles.CheckPermission).toHaveBeenCalled()
			expect(PlansManager.Reload).toHaveBeenCalled()
		})
	})

	describe("Stop", () => {
		it("should check permission and call shutdown", async () => {
			await ServerRuntime.Stop({ user: "admin" } as any)
			expect(Roles.CheckPermission).toHaveBeenCalled()
			expect(ServerShutdown.Shutdown).toHaveBeenCalledWith("MANUAL_STOP")
		})
	})
})
