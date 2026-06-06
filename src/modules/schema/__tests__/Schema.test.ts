import { beforeEach, describe, expect, it, vi } from "vitest"
import { DataTable } from "../../../types/DataTable"
import { Roles } from "../../auth/Roles"
import { HTTP_STATUS_CODE } from "../../core/@consts"
import { ConfigManager } from "../../core/ConfigManager"
import { HttpErrorBadRequest, HttpErrorNotFound } from "../../errors/HttpErrors"
import { SourceRegistry } from "../../source/SourceRegistry"
import type { TSource } from "../../source/types/TSource"
import { Schema } from "../Schema"
import type { TSchemaRequestSelect } from "../types/TSchemaRequest"

vi.mock("../../core/ConfigManager")
vi.mock("../../auth/Roles")

describe("Schema", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		Schema.fnCacheGet = vi.fn().mockResolvedValue(undefined)
		SourceRegistry.Sources.clear()
	})

	describe("Init", () => {
		it("should initialize schemas successfully", () => {
			const mockSchemas = {
				"test-schema": {
					source: "test-source",
					roles: ["admin"],
				},
			}
			vi.mocked(ConfigManager.Has).mockReturnValue(true)
			vi.mocked(ConfigManager.Get).mockReturnValue(mockSchemas)

			Schema.Init(vi.fn())

			expect(ConfigManager.Get).toHaveBeenCalledWith("schemas")
			expect(Schema.fnCacheGet).toBeDefined()
		})

		it("should throw if schemas section not found", () => {
			vi.mocked(ConfigManager.Has).mockReturnValue(false)

			expect(() => Schema.Init(vi.fn())).toThrow(HttpErrorNotFound)
		})
	})

	describe("_buildSchemaRoutes", () => {
		it("should build routes for schema with source only", () => {
			const mockSchemas = {
				"schema-with-source": {
					source: "db1",
				},
			}
			vi.mocked(ConfigManager.Has).mockReturnValue(true)
			vi.mocked(ConfigManager.Get).mockReturnValue(mockSchemas)

			Schema.Init(vi.fn())

			const routes = Schema._schemaRoutes.get("schema-with-source")
			expect(routes?.has("*")).toBe(true)
			expect(routes?.get("*")).toEqual({
				sourceName: "db1",
				sourceEntityName: undefined,
			})
		})

		it("should build routes for schema with entities", () => {
			const mockSchemas = {
				"schema-with-entities": {
					entities: {
						entity1: {
							source: "db1",
							entity: "table1",
						},
						entity2: {
							source: "db2",
							entity: "table2",
						},
					},
				},
			}
			vi.mocked(ConfigManager.Has).mockReturnValue(true)
			vi.mocked(ConfigManager.Get).mockReturnValue(mockSchemas)

			Schema.Init(vi.fn())

			const routes = Schema._schemaRoutes.get("schema-with-entities")
			expect(routes?.has("entity1")).toBe(true)
			expect(routes?.has("entity2")).toBe(true)
			expect(routes?.get("entity1")).toEqual({
				sourceName: "db1",
				sourceEntityName: "table1",
			})
			expect(routes?.get("entity2")).toEqual({
				sourceName: "db2",
				sourceEntityName: "table2",
			})
		})

		it("should build routes for schema with both source and entities", () => {
			const mockSchemas = {
				"mixed-schema": {
					source: "default-db",
					entities: {
						"special-entity": {
							source: "special-db",
							entity: "special-table",
						},
					},
				},
			}
			vi.mocked(ConfigManager.Has).mockReturnValue(true)
			vi.mocked(ConfigManager.Get).mockReturnValue(mockSchemas)

			Schema.Init(vi.fn())

			const routes = Schema._schemaRoutes.get("mixed-schema")
			expect(routes?.has("*")).toBe(true)
			expect(routes?.has("special-entity")).toBe(true)
			expect(routes?.get("*")).toEqual({
				sourceName: "default-db",
				sourceEntityName: undefined,
			})
			expect(routes?.get("special-entity")).toEqual({
				sourceName: "special-db",
				sourceEntityName: "special-table",
			})
		})
	})

	describe("_buildSchemaRoles", () => {
		it("should build roles for schemas", () => {
			const mockSchemas = {
				"schema-with-roles": {
					source: "db1",
					roles: ["admin", "user"],
				},
				"schema-without-roles": {
					source: "db2",
				},
			}
			vi.mocked(ConfigManager.Has).mockReturnValue(true)
			vi.mocked(ConfigManager.Get).mockReturnValue(mockSchemas)

			Schema.Init(vi.fn())

			expect(Schema._schemaRoles.get("schema-with-roles")).toEqual(["admin", "user"])
			expect(Schema._schemaRoles.get("schema-without-roles")).toBeUndefined()
		})
	})

	describe("IsSchemaResponse", () => {
		it("should return true for valid schema response", () => {
			const validResponse = {
				schema: "test",
				status: HTTP_STATUS_CODE.OK,
				metadata: {},
				data: new DataTable(),
			}
			expect(Schema.IsSchemaResponse(validResponse)).toBe(true)
		})

		it("should return true for valid schema response with entity", () => {
			const validResponse = {
				schema: "test",
				entity: "myentity",
				status: HTTP_STATUS_CODE.OK,
				metadata: {},
				data: new DataTable(),
			}
			expect(Schema.IsSchemaResponse(validResponse)).toBe(true)
		})

		it("should return false for invalid schema response", () => {
			const invalidResponse = {
				schema: "test",
				status: 400,
				data: null,
			}
			expect(Schema.IsSchemaResponse(invalidResponse)).toBe(false)
		})
	})

	describe("Select", () => {
		it("should call data provider select if no cache", async () => {
			const mockSchemas = {
				"test-schema": {
					source: "db1",
					entities: {
						"test-entity": {
							source: "db1",
							entity: "table1",
						},
					},
					roles: ["admin"],
				},
			}
			vi.mocked(ConfigManager.Has).mockReturnValue(true)
			vi.mocked(ConfigManager.Get).mockImplementation((key: string) => {
				if (key === "schemas") return mockSchemas
				if (key === "sources.db1") return {}
				return undefined
			})

			const mockDataTable = new DataTable()
			const mockDataProvider = {
				Select: vi.fn().mockResolvedValue({
					Body: {
						schema: "test-schema",
						entity: "test-entity",
						status: HTTP_STATUS_CODE.OK,
						metadata: {},
						rows: [],
						data: mockDataTable,
					},
				}),
			}
			SourceRegistry.Sources.set("db1", {
				DataProvider: mockDataProvider,
				SourceConfig: { provider: "mongodb" as any },
			} as unknown as TSource)

			Schema.Init(vi.fn())
			Schema.fnCacheGet = vi.fn().mockResolvedValue(undefined)
			const result = await Schema.Select(<TSchemaRequestSelect>{ schema: "test-schema", entity: "test-entity" })

			expect(mockDataProvider.Select).toHaveBeenCalled()
			expect(Roles.CheckPermission).toHaveBeenCalled()
			expect(result.Body?.schema).toBe("test-schema")
		})

		it("should return cached data if available", async () => {
			const cachedResponse = {
				schema: "test-schema",
				entity: "test-entity",
				status: HTTP_STATUS_CODE.OK,
				metadata: {},
				rows: [{ id: 1, name: "cached" }],
			}
			Schema.fnCacheGet = vi.fn().mockResolvedValue({ Body: cachedResponse })

			const result = await Schema.Select({ schema: "test-schema", entity: "test-entity" } as {
				schema: string
				entity: string
			})

			expect(Schema.fnCacheGet).toHaveBeenCalled()
			expect(result.Body).toEqual(cachedResponse)
		})

		it("should throw if schema not found", async () => {
			const mockSchemas = {}
			vi.mocked(ConfigManager.Has).mockReturnValue(true)
			vi.mocked(ConfigManager.Get).mockReturnValue(mockSchemas)

			Schema.Init(vi.fn())
			Schema.fnCacheGet = vi.fn().mockResolvedValue(undefined)

			await expect(
				Schema.Select({ schema: "nonexistent", entity: "test" } as { schema: string; entity: string }),
			).rejects.toThrow()
		})
	})

	describe("ListEntities", () => {
		it("should list entities for schema with wildcard source", async () => {
			const mockSchemas = {
				"test-schema": {
					source: "db1",
					roles: ["admin"],
				},
			}
			vi.mocked(ConfigManager.Has).mockReturnValue(true)
			vi.mocked(ConfigManager.Get).mockReturnValue(mockSchemas)

			const mockDataProvider = {
				ListEntities: vi.fn().mockResolvedValue({
					Body: {
						schema: "test-schema",
						status: HTTP_STATUS_CODE.OK,
						metadata: {},
						rows: [],
						data: new DataTable(),
					},
				}),
				ProviderName: "db1",
				Config: {},
				Init: vi.fn(),
				Options: {},
			}
			SourceRegistry.Sources.set("db1", {
				DataProvider: mockDataProvider,
				SourceConfig: { provider: "mongodb" as any },
			} as any)

			Schema.Init(vi.fn())
			Schema.fnCacheGet = vi.fn().mockResolvedValue(undefined)

			const result = await Schema.ListEntities({ schema: "test-schema" } as any)

			expect(mockDataProvider.ListEntities).toHaveBeenCalled()
			expect(Roles.CheckPermission).toHaveBeenCalled()
			expect(result.Body?.schema).toBe("test-schema")
			expect(result.Body?.status).toBe(HTTP_STATUS_CODE.OK)
		})

		it("should list entities for schema with specific entities", async () => {
			const mockSchemas = {
				"test-schema": {
					entities: {
						entity1: {
							source: "db1",
							entity: "table1",
						},
						entity2: {
							source: "db2",
							entity: "table2",
						},
					},
					roles: ["admin"],
				},
			}
			vi.mocked(ConfigManager.Has).mockReturnValue(true)
			vi.mocked(ConfigManager.Get).mockReturnValue(mockSchemas)

			const mockDataProvider1 = {
				ListEntities: vi.fn().mockResolvedValue({
					Body: {
						schema: "test-schema",
						status: HTTP_STATUS_CODE.OK,
						metadata: {},
						rows: [],
						data: new DataTable(),
					},
				}),
				ProviderName: "db1",
				Config: {},
				Init: vi.fn(),
				Options: {},
			}
			const mockDataProvider2 = {
				ListEntities: vi.fn().mockResolvedValue({
					Body: {
						schema: "test-schema",
						status: HTTP_STATUS_CODE.OK,
						metadata: {},
						rows: [],
						data: new DataTable(),
					},
				}),
				ProviderName: "db2",
				Config: {},
				Init: vi.fn(),
				Options: {},
			}
			SourceRegistry.Sources.set("db1", {
				DataProvider: mockDataProvider1,
				SourceConfig: { provider: "mongodb" as any },
			} as any)
			SourceRegistry.Sources.set("db2", {
				DataProvider: mockDataProvider2,
				SourceConfig: { provider: "mongodb" as any },
			} as any)

			Schema.Init(vi.fn())
			Schema.fnCacheGet = vi.fn().mockResolvedValue(undefined)
			const result = await Schema.ListEntities({ schema: "test-schema" } as any)

			expect(Roles.CheckPermission).toHaveBeenCalled()
			expect(result.Body?.schema).toBe("test-schema")
			expect(result.Body?.status).toBe(HTTP_STATUS_CODE.OK)
			expect(result.Body?.data instanceof DataTable).toBe(true)
		})

		it("should throw if schema not found", async () => {
			const mockSchemas = {}
			vi.mocked(ConfigManager.Has).mockReturnValue(true)
			vi.mocked(ConfigManager.Get).mockReturnValue(mockSchemas)

			Schema.Init(vi.fn())
			Schema.fnCacheGet = vi.fn().mockResolvedValue(undefined)

			await expect(Schema.ListEntities({ schema: "nonexistent" } as { schema: string })).rejects.toThrow(HttpErrorNotFound)
		})

		it("should throw if invalid request", async () => {
			vi.mocked(ConfigManager.Has).mockReturnValue(true)
			vi.mocked(ConfigManager.Get).mockReturnValue({})

			Schema.Init(vi.fn())
			Schema.fnCacheGet = vi.fn().mockResolvedValue(undefined)

			await expect(Schema.ListEntities({} as { schema: string })).rejects.toThrow(HttpErrorBadRequest)
		})
	})

	describe("Insert", () => {
		it("should call data provider insert", async () => {
			const mockSchemas = {
				"test-schema": {
					entities: {
						"test-entity": {
							source: "db1",
							entity: "table1",
						},
					},
					roles: ["admin"],
				},
			}
			vi.mocked(ConfigManager.Has).mockReturnValue(true)
			vi.mocked(ConfigManager.Get).mockReturnValue(mockSchemas)

			const mockDataProvider = {
				Insert: vi.fn().mockResolvedValue({ Body: undefined }),
				ProviderName: "db1",
				Config: {},
				Init: vi.fn(),
				Options: {},
			}
			SourceRegistry.Sources.set("db1", {
				DataProvider: mockDataProvider,
				SourceConfig: { provider: "mongodb" as any },
			} as any)

			Schema.Init(vi.fn())
			Schema.fnCacheGet = vi.fn().mockResolvedValue(undefined)
			await Schema.Insert({
				schema: "test-schema",
				entity: "test-entity",
				data: { name: "test" },
			} as { schema: string; entity: string; data: Record<string, unknown> })

			expect(mockDataProvider.Insert).toHaveBeenCalledWith({
				schema: "test-schema",
				entity: "table1",
				source: "db1",
				data: { name: "test" },
			})
			expect(Roles.CheckPermission).toHaveBeenCalled()
		})
	})

	describe("Update", () => {
		it("should call data provider update", async () => {
			const mockSchemas = {
				"test-schema": {
					entities: {
						"test-entity": {
							source: "db1",
							entity: "table1",
						},
					},
					roles: ["admin"],
				},
			}
			vi.mocked(ConfigManager.Has).mockReturnValue(true)
			vi.mocked(ConfigManager.Get).mockReturnValue(mockSchemas)

			const mockDataProvider = {
				Update: vi.fn().mockResolvedValue({ Body: undefined }),
				ProviderName: "db1",
				Config: {},
				Init: vi.fn(),
				Options: {},
			}
			SourceRegistry.Sources.set("db1", {
				DataProvider: mockDataProvider,
				SourceConfig: { provider: "mongodb" as any },
			} as any)

			Schema.Init(vi.fn())
			Schema.fnCacheGet = vi.fn().mockResolvedValue(undefined)
			await Schema.Update({
				schema: "test-schema",
				entity: "test-entity",
				data: { name: "updated" },
				filter: { id: 1 },
			} as { schema: string; entity: string; data: Record<string, unknown>; filter: Record<string, unknown> })

			expect(mockDataProvider.Update).toHaveBeenCalledWith({
				schema: "test-schema",
				entity: "table1",
				source: "db1",
				data: { name: "updated" },
				filter: { id: 1 },
			})
			expect(Roles.CheckPermission).toHaveBeenCalled()
		})
	})

	describe("Delete", () => {
		it("should call data provider delete", async () => {
			const mockSchemas = {
				"test-schema": {
					entities: {
						"test-entity": {
							source: "db1",
							entity: "table1",
						},
					},
					roles: ["admin"],
				},
			}
			vi.mocked(ConfigManager.Has).mockReturnValue(true)
			vi.mocked(ConfigManager.Get).mockReturnValue(mockSchemas)

			const mockDataProvider = {
				Delete: vi.fn().mockResolvedValue({ Body: undefined }),
				ProviderName: "db1",
				Config: {},
				Init: vi.fn(),
				Options: {},
			}
			SourceRegistry.Sources.set("db1", {
				DataProvider: mockDataProvider,
				SourceConfig: { provider: "mongodb" as any },
			} as any)

			Schema.Init(vi.fn())
			Schema.fnCacheGet = vi.fn().mockResolvedValue(undefined)
			await Schema.Delete({
				schema: "test-schema",
				entity: "test-entity",
				filter: { id: 1 },
			} as { schema: string; entity: string; filter: Record<string, unknown> })

			expect(mockDataProvider.Delete).toHaveBeenCalledWith({
				schema: "test-schema",
				entity: "test-entity",
				source: "db1",
				sourceEntity: "table1",
				filter: { id: 1 },
			})
			expect(Roles.CheckPermission).toHaveBeenCalled()
		})
	})
})
