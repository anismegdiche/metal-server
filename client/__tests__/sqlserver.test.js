/* eslint-disable object-curly-spacing */
/* eslint-disable max-lines-per-function */

const { describe, it, expect, beforeAll } = require("@jest/globals");

const MetalClient = require("../metal_client");

describe("SqlServer", () => {
    let _metalClient;
    const schema = "hr";
    const entity = "dbo.countries";

    beforeAll(async () => {
        _metalClient = new MetalClient({
            RestApiUrl: "http://localhost:3000"
        });
        await _metalClient.UserLogin("admin", "123456");
    });

    describe("DataInsert", () => {
        it("should insert one item into the database", async () => {
            const response = await _metalClient.DataInsert(schema, entity, {
                data: {
                    country_id: "XX",
                    country_name: "Nowhere Land",
                    "region_id": 1
                }
            });
            expect(response.data).toStrictEqual({
                entity,
                schema,
                transaction: "insert",
                result: "Created",
                status: 201
            });
        });

        it("should insert multiple items into the database", async () => {
            const response = await _metalClient.DataInsert(schema, entity, {
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
                entity,
                schema,
                transaction: "insert",
                result: "Created",
                status: 201
            });
        });
    });

    describe("DataSelect", () => {
        it("should select items from the database", async () => {
            const response = await _metalClient.DataSelect(schema, entity, {
                "filter-expression": "country_id ~ 'X*'",
                fields: "country_id, country_name",
                sort: "country_id asc,country_name desc"
            });
            expect(response.data).toStrictEqual({
                entity,
                schema,
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
            const response = await _metalClient.DataUpdate(schema, entity, {
                "filter-expression": "country_id ~ 'X*'",
                data: {
                    country_name: "XXXXX"
                }
            });
            expect(response.data).toStrictEqual({
                entity,
                schema,
                result: "OK",
                status: 200,
                transaction: "update"
            });
        });
    });

    describe("DataDelete", () => {
        it("should delete items from the database", async () => {
            const response = await _metalClient.DataDelete(schema, entity, {
                "filter-expression": "country_id ~ 'X*'"
            });
            expect(response.status).toStrictEqual(204);
        });
    });
});