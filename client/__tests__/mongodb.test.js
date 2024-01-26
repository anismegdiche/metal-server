/* eslint-disable @typescript-eslint/no-var-requires */

const { describe, it, expect, beforeAll } = require("@jest/globals");

const MetalClient = require("../metal_client");

function removeId(data) {
    if (data?.rows !== undefined) {
        for (const row of data.rows) {
            delete row._id;
        }
    }
    return data;
}

describe('MongoDb', () => {
    let metalClient = {};
    const schema = 'mflix';
    const entity = 'users';

    beforeAll(async () => {
        metalClient = new MetalClient({
            RestApiUrl: "http://localhost:3000"
        });
        await metalClient.UserLogin("myapiuser", "myStr@ngpa$$w0rd");
    });

    describe('DataInsert', () => {
        it(`should insert one item into the database`, async () => {
            const response = await metalClient.DataInsert(schema, entity, {
                data: {
                    name: 'John Doe',
                    email: 'j.doe@nowhere.com',
                    country: 'France'
                }
            });

            const expectedResponse = {
                entityName: 'users',
                schemaName: 'mflix',
                transaction: 'insert',
                result: 'Created',
                status: 201
            };

            expect(response.data).toStrictEqual(expectedResponse);
        });

        it(`should insert multiple items into the database`, async () => {
            const response = await metalClient.DataInsert(schema, entity, {
                data: [
                    {
                        name: 'Mary Major',
                        email: 'm.major@nowhere.com',
                        country: 'France'
                    },
                    {
                        name: 'Judy Poe',
                        email: 'jp@somewhere.com',
                        country: 'UK'
                    }
                ]
            });

            const expectedResponse = {
                entityName: 'users',
                schemaName: 'mflix',
                transaction: 'insert',
                result: 'Created',
                status: 201
            };

            expect(response.data).toStrictEqual(expectedResponse);
        });
    });

    describe('DataSelect', () => {
        it(`should select items from the database`, async () => {
            const response = await metalClient.DataSelect(schema, entity, {
                "filterExpression": "name LIKE '%o%' AND email LIKE '%wh%co'",
                fields: 'name, email',
                sort: 'name asc,email desc'
            });

            const expectedResponse = {
                entityName: 'users',
                schemaName: 'mflix',
                transaction: 'select',
                metadata: {},
                result: 'OK',
                status: 200,
                fields: {
                    _id: 'object',
                    email: 'string',
                    name: 'string'
                },
                rows: [
                    {
                        name: 'John Doe',
                        email: 'j.doe@nowhere.com'
                    },
                    {
                        name: 'Judy Poe',
                        email: 'jp@somewhere.com'
                    },
                    {
                        name: 'Mary Major',
                        email: 'm.major@nowhere.com'
                    }
                ]
            };

            expect(removeId(response.data)).toStrictEqual(expectedResponse);
        }, 360_000);
    });

    describe('DataUpdate', () => {
        it(`should update items in the database`, async () => {
            const response = await metalClient.DataUpdate(schema, entity, {
                "filterExpression": "email LIKE '%wh%co'",
                data: {
                    email: "nomail"
                }
            });
            expect(response.data).toStrictEqual({
                entityName: "users",
                schemaName: "mflix",
                transaction: "update",
                result: "OK",
                status: 200
            });
        });
    });

    describe('DataDelete', () => {
        it(`should delete items from the database`, async () => {
            const response = await metalClient.DataDelete(schema, entity, {
                "filterExpression": "email LIKE '%wh%co'"
            });
            expect(response.status).toEqual(204);
        });
    });
});