/* eslint-disable @typescript-eslint/no-var-requires */

const { describe, it, expect, beforeAll } = require("@jest/globals");
const MetalClient = require("../metal_client");

describe("SqlServer", () => {
    let metalClient = {};
    const schemaName = "hr";
    const entityName = "dbo.countries";

    beforeAll(async () => {
        metalClient = new MetalClient({
            RestApiUrl: "http://localhost:3000"
        });
        await metalClient.UserLogin("admin", "123456");
    });

    describe("DataInsert", () => {
        it("should insert one item into the database", async () => {
            const response = await metalClient.DataInsert(schemaName, entityName, {
                data: {
                    country_id: "XX",
                    country_name: "Nowhere Land",
                    "region_id": 1
                }
            });
            expect(response.data).toStrictEqual({
                entityName,
                schemaName,
                transaction: "insert",
                result: "Created",
                status: 201
            });
        });

        it("should insert multiple items into the database", async () => {
            const response = await metalClient.DataInsert(schemaName, entityName, {
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
            });
            expect(response.data).toStrictEqual({
                entityName,
                schemaName,
                transaction: "insert",
                result: "Created",
                status: 201
            });
        });
    });

    describe("DataSelect", () => {
        it("should select items from the database", async () => {
            const response = await metalClient.DataSelect(schemaName, entityName, {
                "filterExpression": "country_id ~ 'X*'",
                fields: "country_id, country_name",
                sort: "country_id asc,country_name desc"
            });
            expect(response.data).toStrictEqual({
                entityName,
                schemaName,
                transaction: "select",
                result: "OK",
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
            });
        });
    });

    describe("DataUpdate", () => {
        it("should update items in the database", async () => {
            const response = await metalClient.DataUpdate(schemaName, entityName, {
                "filterExpression": "country_id ~ 'X*'",
                data: {
                    country_name: "XXXXX"
                }
            });
            expect(response.data).toStrictEqual({
                entityName,
                schemaName,
                result: "OK",
                status: 200,
                transaction: "update"
            });
        });
    });

    describe("DataDelete", () => {
        it("should delete items from the database", async () => {
            const response = await metalClient.DataDelete(schemaName, entityName, {
                "filterExpression": "country_id ~ 'X*'"
            });
            expect(response.status).toStrictEqual(204);
        });
    });
});