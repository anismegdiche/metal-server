/* eslint-disable @typescript-eslint/no-require-imports */


const { describe, it, expect, beforeAll } = require("@vitest/expect")

const MetalClient = require("../metal_client")

function removeId(data) {
    if (data?.rows !== undefined) {
        for (const row of data.rows) {
            delete row._id
        }
    }
    if (data?.fields !== undefined)
        delete data.fields._id

    return data
}

describe('MongoDb', () => {
    let metalClient = {}
    const schema = 'mflix'
    const entity = 'users'

    beforeAll(async () => {
        metalClient = new MetalClient({
            RestApiUrl: "http://127.0.0.1:3000"
        })
        await metalClient.UserLogin("myapiuser", "myStr@ngpa$$w0rd")
    })

    describe('DataInsert', () => {
        it(`should insert one item into the database`, async () => {
            const response = await metalClient.DataInsert(schema, entity, {
                data: {
                    name: 'John Doe',
                    email: 'j.doe@nowhere.com',
                    country: 'France'
                }
            })

            expect(response.status).toStrictEqual(201)
        })

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
            })

            expect(response.status).toStrictEqual(201)
        })
    })

    describe('DataSelect', () => {
        it(`should return all items from the database`, async () => {
            const response = await metalClient.DataSelect(schema, entity, {})

            expect(response.status).toStrictEqual(200)
            expect(response.data).toBeDefined()
            expect(response.data.rows.length > 0).toEqual(true)
        }, 360_000)

        it(`should select items from the database`, async () => {
            const response = await metalClient.DataSelect(schema, entity, {
                "filter-expression": "name LIKE '%o%' AND email LIKE '%wh%com'",
                fields: 'name, email',
                sort: 'name asc,email desc'
            })

            const expectedResponse = {
                status: 200,
                data: {
                    schema: "mflix",
                    entity: "users",
                    status: 200,
                    metadata: {
                    },
                    fields: {
                        name: "string",
                        email: "string"
                    },
                    rows: [
                        {
                            name: "John Doe",
                            email: "j.doe@nowhere.com"
                        },
                        {
                            name: "Judy Poe",
                            email: "jp@somewhere.com"
                        },
                        {
                            name: "Mary Major",
                            email: "m.major@nowhere.com"
                        }
                    ]
                }
            }

            const responseData = removeId(response.data)

            expect(response.status).toEqual(expectedResponse.status)
            expect(responseData).toEqual(expectedResponse.data)
        }, 360_000)
    })

    describe('DataUpdate', () => {
        it(`should update items in the database`, async () => {
            const response = await metalClient.DataUpdate(schema, entity, {
                "filter-expression": "email LIKE '%wh%com'",
                data: {
                    email: "nomail"
                }
            })
            expect(response.status).toEqual(204)
            expect(response.data).toEqual('')
        })
    })

    describe('DataDelete', () => {
        it(`should delete items from the database`, async () => {
            const response = await metalClient.DataDelete(schema, entity, {
                "filter-expression": "email LIKE '%wh%com'"
            })
            expect(response.status).toEqual(204)
        })
    })
})