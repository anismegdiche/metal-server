//
// biome-ignore-all lint/suspicious/noNonNullAssertedOptionalChain: test assertions
// biome-ignore-all lint/style/noNonNullAssertion: test assertions
import { DataBase } from "../../../types/DataBase"
import { DataTable } from "../../../types/DataTable"
import { Cache } from "../../cache/Cache"
import { HTTP_STATUS_CODE } from "../../core/@consts"
import type { U__sources_source } from "../../core/types/U__sources"
import {
	HttpErrorInternalServerError,
	HttpErrorNotFound,
	HttpErrorNotImplemented
} from "../../errors/HttpErrors"
import type {
	TSchemaRequestSelect
} from "../../schema/types/TSchemaRequest"
import { DATA_PROVIDER } from "../@consts"
import { FakeData } from "../providers/FakeData"

describe("FakeData", () => {
	const baseConfig: U__sources_source = {
		provider: DATA_PROVIDER.FAKE_DATA,
		options: {
			seed: 42,
			entities: {
				customers: {
					locale: "en",
					rows: 10,
					fields: {
						id: "string.uuid()",
						firstName: "person.firstName()",
						lastName: "person.lastName()",
						email: "internet.email()",
						age: "number.int({ min: 18, max: 80 })",
						active: "datatype.boolean()",
					},
				},
			},
		},
	}

	it("should initialize with valid source and config", async () => {
		const fakeData = new FakeData()
		await fakeData.Init("test-source", baseConfig)

		expect(fakeData.SourceName).toBe("test-source")
		expect(fakeData.ProviderName).toBe(DATA_PROVIDER.FAKE_DATA)
	})

	it("should create DataBase and generate fake entities on Connect", async () => {
		const fakeData = new FakeData()
		await fakeData.Init("test-source", baseConfig)
		await fakeData.Connect()

		expect(fakeData.Connection).toBeInstanceOf(DataBase)
		expect(fakeData.Connection?.Tables.customers).toBeDefined()
		expect(await fakeData.Connection?.Tables.customers?.Count()).toBe(10)
	})

	it("should generate correct field values", async () => {
		const fakeData = new FakeData()
		await fakeData.Init("test-source", baseConfig)
		await fakeData.Connect()

		const rows = await fakeData.Connection?.Tables.customers?.Rows()
		expect(rows).toBeDefined()
		expect(rows?.length).toBe(10)

		const row = rows![0]!
		expect(typeof row.id).toBe("string")
		expect(typeof row.firstName).toBe("string")
		expect(typeof row.lastName).toBe("string")
		expect(typeof row.email).toBe("string")
		expect(typeof row.age).toBe("number")
		expect(row.age).toBeGreaterThanOrEqual(18)
		expect(row.age).toBeLessThanOrEqual(80)
		expect(typeof row.active).toBe("boolean")
	})

	it("should produce deterministic results with the same seed", async () => {
		const fakeData1 = new FakeData()
		await fakeData1.Init("test-source", baseConfig)
		await fakeData1.Connect()
		const rows1 = await fakeData1.Connection?.Tables.customers?.Rows()

		const fakeData2 = new FakeData()
		await fakeData2.Init("test-source", baseConfig)
		await fakeData2.Connect()
		const rows2 = await fakeData2.Connection?.Tables.customers?.Rows()

		expect(rows1).toEqual(rows2)
	})

	it("should produce different results with different seeds", async () => {
		const config1: U__sources_source = {
			provider: DATA_PROVIDER.FAKE_DATA,
			options: { seed: 1, entities: { t: { rows: 5, fields: { name: "person.firstName()" } } } },
		}
		const config2: U__sources_source = {
			provider: DATA_PROVIDER.FAKE_DATA,
			options: { seed: 2, entities: { t: { rows: 5, fields: { name: "person.firstName()" } } } },
		}

		const fd1 = new FakeData()
		await fd1.Init("s", config1)
		await fd1.Connect()
		const rows1 = await fd1.Connection?.Tables.t?.Rows()

		const fd2 = new FakeData()
		await fd2.Init("s", config2)
		await fd2.Connect()
		const rows2 = await fd2.Connection?.Tables.t?.Rows()

		expect(rows1).not.toEqual(rows2)
	})

	it("should handle call expression syntax", async () => {
		const config: U__sources_source = {
			provider: DATA_PROVIDER.FAKE_DATA,
			options: {
				entities: {
					t: {
						rows: 5,
						fields: {
							age: "number.int({ min: 10, max: 20 })",
							title: "person.firstName('male')",
						},
					},
				},
			},
		}
		const fakeData = new FakeData()
		await fakeData.Init("test", config)
		await fakeData.Connect()

		const rows = await fakeData.Connection?.Tables.t?.Rows()
		expect(rows?.length).toBe(5)
		for (const row of rows!) {
			expect(row.age).toBeGreaterThanOrEqual(10)
			expect(row.age).toBeLessThanOrEqual(20)
			expect(typeof row.title).toBe("string")
		}
	})

	it("should create empty entity when fields is omitted", async () => {
		const config: U__sources_source = {
			provider: DATA_PROVIDER.FAKE_DATA,
			options: {
				entities: {
					empty: { rows: 5 },
				},
			},
		}
		const fakeData = new FakeData()
		await fakeData.Init("test", config)
		await fakeData.Connect()

		expect(fakeData.Connection?.Tables.empty).toBeDefined()
	})

	it("should return 0 rows when rows is 0", async () => {
		const config: U__sources_source = {
			provider: DATA_PROVIDER.FAKE_DATA,
			options: {
				entities: {
					zero: { rows: 0, fields: { name: "person.firstName" } },
				},
			},
		}
		const fakeData = new FakeData()
		await fakeData.Init("test", config)
		await fakeData.Connect()

		expect(await fakeData.Connection?.Tables.zero?.Count()).toBe(0)
	})

	it("should select data through the normal schema API", async () => {
		const fakeData = new FakeData()
		await fakeData.Init("test-source", baseConfig)
		await fakeData.Connect()

		const response = await fakeData.Select({
			schema: "test-schema",
			entity: "customers",
		})

		expect(response.StatusCode).toBe(HTTP_STATUS_CODE.OK)
		expect(response.Body?.schema).toBe("test-schema")
		expect(response.Body?.entity).toBe("customers")
		const rows = await response.Body?.data.Rows()
		expect(rows?.length).toBe(10)
	})

	it("should support select with limit", async () => {
		const fakeData = new FakeData()
		await fakeData.Init("test-source", baseConfig)
		await fakeData.Connect()

		const response = await fakeData.Select({
			schema: "test-schema",
			entity: "customers",
			limit: 3,
		})

		const rows = await response.Body?.data.Rows()
		expect(rows?.length).toBe(3)
	})

	it("should list entities", async () => {
		const fakeData = new FakeData()
		await fakeData.Init("test-source", baseConfig)
		await fakeData.Connect()

		const response = await fakeData.ListEntities({ schema: "test-schema" })
		expect(response.StatusCode).toBe(HTTP_STATUS_CODE.OK)
		const rows = await response.Body?.data.Rows()
		expect(rows?.length).toBe(1)
		expect(rows![0]!.name).toBe("customers")
	})

	it("should support insert, update, delete through MemoryData", async () => {
		const fakeData = new FakeData()
		await fakeData.Init("test-source", baseConfig)
		await fakeData.Connect()

		// Insert
		const dt = new DataTable("customers", [
			{ id: "new-1", firstName: "Test", lastName: "User", email: "test@test.com", age: 25, active: true },
		])
		Cache.Remove = vi.fn(async () => {})
		const insertResp = await fakeData.Insert({
			schema: "test-schema",
			entity: "customers",
			data: dt,
		})
		expect(insertResp.StatusCode).toBe(HTTP_STATUS_CODE.CREATED)
		expect(await fakeData.Connection?.Tables.customers?.Count()).toBe(11)

		// Delete
		vi.spyOn(Cache, "Remove").mockImplementation(async () => {})
		vi.spyOn(fakeData.Connection?.Tables.customers!, "FreeSql").mockResolvedValue(new DataTable("customers"))
		const deleteResp = await fakeData.Delete({
			schema: "test-schema",
			entity: "customers",
			filter: { id: "new-1" },
		})
		expect(deleteResp.StatusCode).toBe(HTTP_STATUS_CODE.NO_CONTENT)
	})

	it("should autocreate entity on select when autocreate is true", async () => {
		const config: U__sources_source = {
			provider: DATA_PROVIDER.FAKE_DATA,
			options: {
				autocreate: true,
				entities: {
					existing: { rows: 1, fields: { id: "string.uuid" } },
				},
			},
		}
		const fakeData = new FakeData()
		await fakeData.Init("test", config)
		await fakeData.Connect()

		// Select on non-existent entity should auto-create
		const response = await fakeData.Select({
			schema: "test-schema",
			entity: "newEntity",
		})
		expect(response.StatusCode).toBe(HTTP_STATUS_CODE.OK)
	})

	it("should throw HttpErrorNotFound when entity not found and autocreate is false", async () => {
		const config: U__sources_source = {
			provider: DATA_PROVIDER.FAKE_DATA,
			options: {
				autocreate: false,
				entities: {
					only: { rows: 1, fields: { id: "string.uuid" } },
				},
			},
		}
		const fakeData = new FakeData()
		await fakeData.Init("test", config)
		await fakeData.Connect()

		await expect(
			fakeData.Select({
				schema: "test-schema",
				entity: "nonexistent",
			}),
		).rejects.toThrow(HttpErrorNotFound)
	})

	it("should throw HttpErrorNotImplemented for AddEntity", async () => {
		const fakeData = new FakeData()
		await fakeData.Init("test-source", baseConfig)
		await fakeData.Connect()

		await expect(
			fakeData.AddEntity({
				schema: "test-schema",
				entity: "test",
			}),
		).rejects.toThrow(HttpErrorNotImplemented)
	})

	it("should throw HttpErrorInternalServerError when not connected", async () => {
		const fakeData = new FakeData()
		await fakeData.Init("test-source", baseConfig)

		const schemaRequest: TSchemaRequestSelect = { schema: "test-schema", entity: "customers" }
		await expect(fakeData.Select(schemaRequest)).rejects.toThrow(HttpErrorInternalServerError)
	})

	it("should throw HttpErrorNotFound when listing entities and none exist", async () => {
		const fakeData = new FakeData()
		await fakeData.Init("test-source", {
			provider: DATA_PROVIDER.FAKE_DATA,
			options: { entities: {} },
		})
		await fakeData.Connect()

		await expect(fakeData.ListEntities({ schema: "test-schema" })).rejects.toThrow(HttpErrorNotFound)
	})

	// --- Malicious injection tests ---

	it("should block require() injection", async () => {
		const config: U__sources_source = {
			provider: DATA_PROVIDER.FAKE_DATA,
			options: {
				entities: {
					t: {
						rows: 1,
						fields: {
							name: "require('child_process').execSync('whoami')",
						},
					},
				},
			},
		}
		const fakeData = new FakeData()
		await fakeData.Init("test", config)
		await fakeData.Connect()

		const rows = await fakeData.Connection?.Tables.t?.Rows()
		expect(rows![0]!.name).toBeUndefined()
	})

	it("should block eval() injection", async () => {
		const config: U__sources_source = {
			provider: DATA_PROVIDER.FAKE_DATA,
			options: {
				entities: {
					t: {
						rows: 1,
						fields: {
							name: "eval('process.exit()')",
						},
					},
				},
			},
		}
		const fakeData = new FakeData()
		await fakeData.Init("test", config)
		await fakeData.Connect()

		const rows = await fakeData.Connection?.Tables.t?.Rows()
		expect(rows![0]!.name).toBeUndefined()
	})

	it("should block process access injection", async () => {
		const config: U__sources_source = {
			provider: DATA_PROVIDER.FAKE_DATA,
			options: {
				entities: {
					t: {
						rows: 1,
						fields: {
							name: "process.env",
						},
					},
				},
			},
		}
		const fakeData = new FakeData()
		await fakeData.Init("test", config)
		await fakeData.Connect()

		const rows = await fakeData.Connection?.Tables.t?.Rows()
		expect(rows![0]!.name).toBeUndefined()
	})

	it("should block fetch injection", async () => {
		const config: U__sources_source = {
			provider: DATA_PROVIDER.FAKE_DATA,
			options: {
				entities: {
					t: {
						rows: 1,
						fields: {
							name: "fetch('https://evil.com')",
						},
					},
				},
			},
		}
		const fakeData = new FakeData()
		await fakeData.Init("test", config)
		await fakeData.Connect()

		const rows = await fakeData.Connection?.Tables.t?.Rows()
		expect(rows![0]!.name).toBeUndefined()
	})

	it("should block prototype pollution injection", async () => {
		const config: U__sources_source = {
			provider: DATA_PROVIDER.FAKE_DATA,
			options: {
				entities: {
					t: {
						rows: 1,
						fields: {
							name: "Object.prototype.polluted = true",
						},
					},
				},
			},
		}
		const fakeData = new FakeData()
		await fakeData.Init("test", config)
		await fakeData.Connect()

		const rows = await fakeData.Connection?.Tables.t?.Rows()
		expect(rows![0]!.name).toBeUndefined()
	})

	it("should block SQL injection via faker expression", async () => {
		const config: U__sources_source = {
			provider: DATA_PROVIDER.FAKE_DATA,
			options: {
				entities: {
					t: {
						rows: 1,
						fields: {
							name: "sql`DROP TABLE users`",
						},
					},
				},
			},
		}
		const fakeData = new FakeData()
		await fakeData.Init("test", config)
		await fakeData.Connect()

		const rows = await fakeData.Connection?.Tables.t?.Rows()
		expect(rows![0]!.name).toBeUndefined()
	})

	it("should block import/export injection", async () => {
		const config: U__sources_source = {
			provider: DATA_PROVIDER.FAKE_DATA,
			options: {
				entities: {
					t: {
						rows: 1,
						fields: {
							name: "import('fs')",
						},
					},
				},
			},
		}
		const fakeData = new FakeData()
		await fakeData.Init("test", config)
		await fakeData.Connect()

		const rows = await fakeData.Connection?.Tables.t?.Rows()
		expect(rows![0]!.name).toBeUndefined()
	})

	it("should block setTimeout/setInterval injection", async () => {
		const config: U__sources_source = {
			provider: DATA_PROVIDER.FAKE_DATA,
			options: {
				entities: {
					t: {
						rows: 1,
						fields: {
							name: "setTimeout(() => {}, 0)",
						},
					},
				},
			},
		}
		const fakeData = new FakeData()
		await fakeData.Init("test", config)
		await fakeData.Connect()

		const rows = await fakeData.Connection?.Tables.t?.Rows()
		expect(rows![0]!.name).toBeUndefined()
	})

	it("should block function declaration injection", async () => {
		const config: U__sources_source = {
			provider: DATA_PROVIDER.FAKE_DATA,
			options: {
				entities: {
					t: {
						rows: 1,
						fields: {
							name: "function evil() { return 'pwned' }",
						},
					},
				},
			},
		}
		const fakeData = new FakeData()
		await fakeData.Init("test", config)
		await fakeData.Connect()

		const rows = await fakeData.Connection?.Tables.t?.Rows()
		expect(rows![0]!.name).toBeUndefined()
	})

	it("should block fork/spawn injection", async () => {
		const config: U__sources_source = {
			provider: DATA_PROVIDER.FAKE_DATA,
			options: {
				entities: {
					t: {
						rows: 1,
						fields: {
							name: "spawn('ls')",
						},
					},
				},
			},
		}
		const fakeData = new FakeData()
		await fakeData.Init("test", config)
		await fakeData.Connect()

		const rows = await fakeData.Connection?.Tables.t?.Rows()
		expect(rows![0]!.name).toBeUndefined()
	})
})
