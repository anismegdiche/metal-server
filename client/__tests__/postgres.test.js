/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable object-curly-spacing */
/* eslint-disable max-lines-per-function */

const { describe, it, expect, beforeAll } = require("@jest/globals");
const MetalClient = require("../metal_client");

describe("Postgres", () => {
    let metalClient = {};
    const schemaName = "northwind";
    const entityName = "customers";

    beforeAll(async () => {
        metalClient = new MetalClient({
            RestApiUrl: "http://localhost:3000"
        });
        await metalClient.UserLogin("admin", "123456");
    });

    describe("DataInsert", () => {
        it("inserts one item into the database", async () => {
            const response = await metalClient.DataInsert(schemaName, entityName, {
                data: {
                    customer_id: "DLLD",
                    contact_name: "John Doe",
                    company_name: "Doe LLD"
                }
            });
            expect(response.data).toStrictEqual({
                schemaName,
                entityName,
                transaction: "insert",
                result: "Created",
                status: 201
            });
        });

        it("inserts many items into the database", async () => {
            const response = await metalClient.DataInsert(schemaName, entityName, {
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
            });
            expect(response.data).toStrictEqual({
                schemaName,
                entityName,
                transaction: "insert",
                result: "Created",
                status: 201
            });
        });
    });

    describe("DataSelect", () => {
        it("selects data from the database", async () => {
            const response = await metalClient.DataSelect(schemaName, entityName, {
                "filterExpression": "customer_id ~ '*LLD'",
                fields: "contact_name, company_name",
                sort: "contact_name asc,company_name desc"
            });
            expect(response.data).toStrictEqual({
                schemaName,
                entityName,
                status: 200,
                transaction: "select",
                metadata: {},
                fields: {
                    company_name: "string",
                    contact_name: "string"
                },
                result: "OK",
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
            });
        });
    });

    describe("DataUpdate", () => {
        it("updates data in the database", async () => {
            const response = await metalClient.DataUpdate(schemaName, entityName, {
                "filterExpression": "customer_id ~ '*LLD'",
                data: {
                    contact_name: "XXXXX"
                }
            });
            expect(response.data).toStrictEqual({
                schemaName,
                entityName,
                result: "OK",
                status: 200,
                transaction: "update"
            });
        });
    });

    describe("DataDelete", () => {
        it("deletes data from the database", async () => {
            const response = await metalClient.DataDelete(schemaName, entityName, {
                "filterExpression": "customer_id ~ '*LLD'"
            });
            expect(response.status).toStrictEqual(204);
        });
    });
});