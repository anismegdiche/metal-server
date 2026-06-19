/* eslint-disable @typescript-eslint/no-require-imports */


const { describe, it, expect, beforeAll } = require("@vitest/expect")
const MetalClient = require("../metal_client")

describe("Postgres", () => {
    let metalClient = {}
    const schema = "northwind"
    const entity = "customers"

    beforeAll(async () => {
        metalClient = new MetalClient({
            RestApiUrl: "http://127.0.0.1:3000"
        })
        await metalClient.UserLogin("myapiuser", "myStr@ngpa$$w0rd")
    })

    describe("DataInsert", () => {
        it("inserts one item into the database", async () => {
            const response = await metalClient.DataInsert(schema, entity, {
                data: {
                    customer_id: "DLLD",
                    contact_name: "John Doe",
                    company_name: "Doe LLD"
                }
            })
            expect(response).toStrictEqual({
                status: 201,
                data: ""
            })
        })

        it("inserts many items into the database", async () => {
            const response = await metalClient.DataInsert(schema, entity, {
                data: [
                    {
                        customer_id: "PLLD",
                        contact_name: "Jane Poe",
                        company_name: "Poe LLD"
                    },
                    {
                        customer_id: "LLLD",
                        contact_name: "Larry Loe",
                        company_name: "Loe LLD"
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
        it("selects data from the database", async () => {
            const response = await metalClient.DataSelect(schema, entity, {
                "filter-expression": "customer_id LIKE '%LLD'",
                fields: "contact_name, company_name",
                sort: "contact_name asc,company_name desc"
            })
            expect(response.data).toStrictEqual({
                schema,
                entity,
                status: 200,
                metadata: {},
                fields: {
                    company_name: "string",
                    contact_name: "string"
                },
                rows: [
                    {
                        company_name: "Poe LLD",
                        contact_name: "Jane Poe"
                    },
                    {
                        company_name: "Doe LLD",
                        contact_name: "John Doe"
                    },
                    {
                        company_name: "Loe LLD",
                        contact_name: "Larry Loe"
                    }
                ]
            })
        })
    })

    describe("DataUpdate", () => {
        it("updates data in the database", async () => {
            const response = await metalClient.DataUpdate(schema, entity, {
                "filter-expression": "customer_id LIKE '%LLD'",
                data: {
                    contact_name: "XXXXX"
                }
            })
            expect(response).toStrictEqual({
                status: 204,
                data: ""
            })
        })
    })

    describe("DataDelete", () => {
        it("deletes data from the database", async () => {
            const response = await metalClient.DataDelete(schema, entity, {
                "filter-expression": "customer_id LIKE '%LLD'"
            })
            expect(response).toStrictEqual({
                status: 204,
                data: ""
            })
        })
    })
})