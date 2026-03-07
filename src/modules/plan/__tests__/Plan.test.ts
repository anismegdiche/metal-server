/* eslint-disable @typescript-eslint/no-explicit-any */

import { beforeEach, describe, expect, it, vi } from "vitest"
import { DataTable } from "../../../types/DataTable"
import { Roles } from "../../auth/Roles"
import { ConfigManager } from "../../core/ConfigManager"
import { Plan } from "../Plan"
import { Step } from "../Step"

vi.mock("../../core/ConfigManager")
vi.mock("../../auth/Roles")
vi.mock("../../../utils/Logger", () => ({
	LOGGER_DEFAULT_LEVEL: "info",
	VERBOSITY: { DEBUG: "debug" },
	Logger: {
		LogFunction: () => (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) => descriptor,
		Info: vi.fn(),
		Error: vi.fn(),
		Warn: vi.fn(),
		Debug: vi.fn(),
		In: "",
		Out: "",
	},
}))

vi.mock("../../../types/DataBase", async (importOriginal) => {
	const actual = await importOriginal<any>()
	const DataBase = vi.fn(function (this: any) {
		this.Init = vi.fn().mockResolvedValue(undefined)
		this.Disconnect = vi.fn().mockResolvedValue(undefined)
		this.Tables = {}
		this.SetTable = vi.fn((name, _data) => {
			this.Tables[name] = new DataTable()
		})
	})
	return { ...actual, DataBase }
})

vi.mock("../../../types/DataTable", async (importOriginal) => {
	const actual = await importOriginal<any>()
	const DataTable = vi.fn(function (this: any) {
		this.FreeSql = vi.fn().mockResolvedValue(undefined)
		this.Rename = vi.fn().mockReturnThis()
		this.RowsSet = vi.fn().mockReturnThis()
		this.MetaData = {
			__PLAN_ERRORS__: [],
		}
	})
	return { ...actual, DataTable }
})

vi.mock("../Step", () => ({
	Step: {
		ExecuteCaseMap: {},
		ExecuteOnError: vi.fn((fn, args, ctx) => fn(args, ctx)),
	},
}))

vi.mock("../../../utils/SynchronizerManager", () => ({
	SynchronizerManager: {
		Synchronized: () => (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) => descriptor,
	},
}))

describe("Plan", () => {
	let plan: Plan

	beforeEach(async () => {
		vi.clearAllMocks()
		plan = new Plan("test-plan")
		await plan.Init()
	})

	it("should initialize and load entities", async () => {
		vi.mocked(ConfigManager.Get).mockReturnValue({
			entity1: [{ step1: {} }],
		})

		await plan.Init()

		expect(plan.Entities.has("entity1")).toBe(true)
		expect(plan._dataBase.Init).toHaveBeenCalled()
	})

	it("should fail ProcessSchemaRequest if entity not found", async () => {
		await expect(
			async () => await plan.ProcessSchemaRequest({ schema: "s", source: "s1", entity: "missing" } as any),
		).rejects.toThrow()
	})

	describe("Reload", () => {
		it("should reload plan configuration and re-init", async () => {
			const userToken = { roles: ["admin"] }
			vi.mocked(ConfigManager.Load).mockResolvedValue({
				plans: { "test-plan": { e: [] } },
				schedules: {},
			} as any)
			vi.mocked(ConfigManager.Has).mockReturnValue(true)

			const res = await plan.Reload("test-plan", userToken as any)

			expect(Roles.CheckPermission).toHaveBeenCalled()
			expect(ConfigManager.Set).toHaveBeenCalledWith("plans.test-plan", expect.anything())
			expect(res.Body).toHaveProperty("message", "Plan reloaded")
		})

		it("should throw error if plan not found in config", async () => {
			vi.mocked(ConfigManager.Load).mockResolvedValue({ plans: {} } as any)
			vi.mocked(ConfigManager.Has).mockReturnValue(false)

			await expect(plan.Reload("missing", {} as any)).rejects.toThrow()
		})
	})

	describe("Process", () => {
		it("should execute steps in sequence", async () => {
			const steps = {
				"0": { "mock-cmd": { args: 1 } },
			}
			const mockDataTable = new DataTable()
			plan._dataBase.Tables.e1 = mockDataTable

			const executeMock = vi.fn().mockResolvedValue(mockDataTable)
			Step.ExecuteCaseMap["mock-cmd"] = executeMock

			await plan.Process("s", "p", "e1", steps as any)

			expect(executeMock).toHaveBeenCalled()
		})

		it("should stop execution and throw error when step fails (not break)", async () => {
			const steps = {
				"0": { "mock-cmd": { args: 1 } },
				"1": { "mock-cmd-2": { args: 2 } },
				"2": { "mock-cmd-3": { args: 3 } },
			}
			const mockDataTable = new DataTable()
			plan._dataBase.Tables.e1 = mockDataTable

			const executeMock1 = vi.fn().mockResolvedValue(mockDataTable)
			const executeMock2 = vi.fn().mockRejectedValue(new Error("Test error"))
			const executeMock3 = vi.fn().mockResolvedValue(mockDataTable)

			Step.ExecuteCaseMap["mock-cmd"] = executeMock1
			Step.ExecuteCaseMap["mock-cmd-2"] = executeMock2
			Step.ExecuteCaseMap["mock-cmd-3"] = executeMock3

			await expect(plan.Process("s", "p", "e1", steps as any)).rejects.toThrow()

			expect(executeMock1).toHaveBeenCalled()
			expect(executeMock2).toHaveBeenCalled()
			expect(executeMock3).not.toHaveBeenCalled()
		})

		it("should continue execution when break is encountered", async () => {
			const steps = {
				"0": { "mock-cmd": { args: 1 } },
				"1": { "mock-cmd-2": { args: 2 } },
				"2": { "mock-cmd-3": { args: 3 } },
			}
			const mockDataTable = new DataTable()
			plan._dataBase.Tables.e1 = mockDataTable

			const executeMock1 = vi.fn().mockResolvedValue(mockDataTable)
			const executeMock2 = vi.fn().mockRejectedValue(new Error("__BREAK__"))
			const executeMock3 = vi.fn().mockResolvedValue(mockDataTable)

			Step.ExecuteCaseMap["mock-cmd"] = executeMock1
			Step.ExecuteCaseMap["mock-cmd-2"] = executeMock2
			Step.ExecuteCaseMap["mock-cmd-3"] = executeMock3

			const result = await plan.Process("s", "p", "e1", steps as any)

			expect(executeMock1).toHaveBeenCalled()
			expect(executeMock2).toHaveBeenCalled()
			expect(executeMock3).not.toHaveBeenCalled()
			expect(result).toBe(mockDataTable)
		})
	})
})
