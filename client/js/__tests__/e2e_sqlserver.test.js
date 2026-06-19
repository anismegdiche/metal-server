/* eslint-disable @typescript-eslint/no-require-imports */

const { describe, it, expect, beforeAll } = require("@vitest/expect")
const MetalClient = require("../metal_client")

describe("SqlServer", () => {
    let metalClient = {}
    const schema = "hr"
    const entity = "dbo.countries"

    beforeAll(async () => {
        metalClient = new MetalClient({
            RestApiUrl: "http://127.0.0.1:3000"
        })
        await metalClient.UserLogin("myapiuser", "myStr@ngpa$$w0rd")
    })

    describe("DataInsert", () => {
        it("should insert one item into the database", async () => {
            const response = await metalClient.DataInsert(schema, entity, {
                data: {
                    country_id: "XX",
                    country_name: "Nowhere Land",
                    "region_id": 1
                }
            })
            expect(response).toStrictEqual({
                status: 201,
                data: ""
            })
        })

        it("should insert multiple items into the database", async () => {
            const response = await metalClient.DataInsert(schema, entity, {
                data: [
                    {
                        country_id: "XY",
                        country_name: "Nowhere Land North",
                        "region_id": 1
                    },
                    {
                        country_id: "XZ",
                        country_name: "Nowhere Land South",
                        "region_id": 1
                    }
                ]
            })
            expect(response).toStrictEqual({
                status: 201,
                data: ""
            })
        })
    })

    describe("DataSelect", () => {
        it("should select items from the database", async () => {
            const response = await metalClient.DataSelect(schema, entity, {
                "filter-expression": "country_id LIKE 'X%'",
                fields: "country_id, country_name",
                sort: "country_id asc,country_name desc"
            })
            expect(response.data).toStrictEqual({
                entity,
                schema,
                metadata: {},
                status: 200,
                fields: {
                    country_id: "string",
                    country_name: "string"
                },
                rows: [
                    {
                        country_id: "XX",
                        country_name: "Nowhere Land"
                    },
                    {
                        country_id: "XY",
                        country_name: "Nowhere Land North"
                    },
                    {
                        country_id: "XZ",
                        country_name: "Nowhere Land South"
                    }
                ]
            })
        })
    })

    describe("DataUpdate", () => {
        it("should update items in the database", async () => {
            const response = await metalClient.DataUpdate(schema, entity, {
                "filter-expression": "country_id LIKE 'X%'",
                data: {
                    country_name: "XXXXX"
                }
            })
            expect(response).toStrictEqual({
                status: 204,
                data: ""
            })
        })
    })

    describe("DataDelete", () => {
        it("should delete items from the database", async () => {
            const response = await metalClient.DataDelete(schema, entity, {
                "filter-expression": "country_id LIKE 'X%'"
            })
            expect(response).toStrictEqual({
                status: 204,
                data: ""
            })
        })
    })
})