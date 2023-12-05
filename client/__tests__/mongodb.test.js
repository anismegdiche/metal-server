/* eslint-disable no-plusplus */
/* eslint-disable object-curly-spacing */
/* eslint-disable max-lines-per-function */

const { describe, it, expect, beforeAll } = require("@jest/globals");

const MetalClient = require("../metal_client");

function removeId(data) {
    if (data?.rows !== undefined) {
        for (let i = 0; i < data.rows.length; i++) {
            delete data.rows[i]._id;
        }
    }
    return data;
}

describe('MongoDb', () => {
    let _metalClient;
    const schema = 'mflix';
    const entity = 'users';

    beforeAll(async () => {
        _metalClient = new MetalClient({
            RestApiUrl: "http://localhost:3000"
        });
        await _metalClient.UserLogin("admin", "123456");
    });

    describe('DataInsert', () => {
        it(`should insert one item into the database`, async () => {
            const response = await _metalClient.DataInsert(schema, entity, {
                data: {
                    name: 'John Doe',
                    email: 'j.doe@nowhere.com',
                    country: 'France'
                }
            });

            const expectedResponse = {
                entity: 'users',
                schema: 'mflix',
                transaction: 'insert',
                result: 'Created',
                status: 201
            };

            expect(response.data).toStrictEqual(expectedResponse);
        });

        it(`should insert multiple items into the database`, async () => {
            const response = await _metalClient.DataInsert(schema, entity, {
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
                entity: 'users',
                schema: 'mflix',
                transaction: 'insert',
                result: 'Created',
                status: 201
            };

            expect(response.data).toStrictEqual(expectedResponse);
        });
    });

    describe('DataSelect', () => {
        it(`should select items from the database`, async () => {
            const response = await _metalClient.DataSelect(schema, entity, {
                "filter-expression": "name ~ '*o*' & email ~ '*wh*co'",
                fields: 'name, email',
                sort: 'name asc,email desc'
            });

            const expectedResponse = {
                entity: 'users',
                schema: 'mflix',
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
        });
    });

    describe('DataUpdate', () => {
        it(`should update items in the database`, async () => {
            const response = await _metalClient.DataUpdate(schema, entity, {
                "filter-expression": "email ~ '*wh*co'",
                data: {
                    email: "nomail"
                }
            });
            expect(response.data).toStrictEqual({
                entity: "users",
                schema: "mflix",
                transaction: "update",
                result: "OK",
                status: 200
            });
        });
    });

    describe('DataDelete', () => {
        it(`should delete items from the database`, async () => {
            const response = await _metalClient.DataDelete(schema, entity, {
                "filter-expression": "email ~ '*wh*co'"
            });
            expect(response.status).toEqual(204);
            // expect(response.data).toStrictEqual({
            //     entity: "users",
            //     schema: "mflix",
            //     transaction: "delete",
            //     result: "success",
            //     status: 200
            // });
        });

    });
});