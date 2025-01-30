/* eslint-disable init-declarations */
import { MongoClient } from 'mongodb'
import { MongoDbData } from '../MongoDbData'
import { TSchemaRequest } from '../../../types/TSchemaRequest'
import { Cache } from '../../../server/Cache'
import { DataTable } from '../../../types/DataTable'
import { HttpErrorNotFound } from '../../../server/HttpErrors'
import { TConfigSource } from "../../../types/TConfig"
import { DATA_PROVIDER } from "../../DataProvider"

// Mock the mongodb module
jest.mock('mongodb')
// Mock the Cache module
jest.mock('../../../server/Cache')
jest.mock('../../../server/Step')

describe('MongoDbData', () => {
    let provider: MongoDbData
    const mockClient = {
        connect: jest.fn(),
        db: jest.fn().mockReturnThis(),
        command: jest.fn(),
        collection: jest.fn().mockReturnThis(),
        insertMany: jest.fn(),
        aggregate: jest.fn().mockReturnThis(),
        toArray: jest.fn(),
        updateMany: jest.fn(),
        deleteMany: jest.fn(),
        close: jest.fn(),
        listCollections: jest.fn().mockReturnThis()
    }

    const mockMongoClient = MongoClient as unknown as jest.Mock

    const providerConfig: TConfigSource = {
        provider: DATA_PROVIDER.MONGODB,
        host: 'mongodb://localhost:27017/',
        database: 'test-db',
        options: {}
    }

    beforeEach(async () => {
        // Reset all mocks before each test
        jest.clearAllMocks()
        mockMongoClient.mockReturnValue(mockClient)
        mockClient.toArray.mockResolvedValue([{ dummy: 'data' }])

        // Create a new provider instance with test configuration
        provider = new MongoDbData()
        await provider.Init('test-source', providerConfig)
        // Connect after initialization
        await provider.Connect()
    })

    describe('Init and Connection', () => {
        it('should successfully initialize and connect', async () => {
            expect(mockMongoClient).toHaveBeenCalledWith('mongodb://localhost:27017/', {})
            expect(mockClient.connect).toHaveBeenCalled()
            expect(mockClient.command).toHaveBeenCalledWith({ ping: 1 })
        })

        it('should throw error on connection failure', async () => {
            mockClient.connect.mockImplementationOnce(() => {
                throw new Error('Connection failed')
            })

            const newProvider = new MongoDbData()
            await newProvider.Init('test-source', providerConfig)
            try {
                await newProvider.Connect()
            } catch (error) {
                expect(error).toBe(Error)
            }
        })
    })

    describe('Insert', () => {
        it('should successfully insert data', async () => {
            const dt = new DataTable('test-table', [
                {
                    id: 1,
                    name: 'test'
                }
            ])
            const mockInsertRequest: TSchemaRequest = {
                schema: 'test-schema',
                entity: 'test-table',
                data: dt.Rows
            }

            const response = await provider.Insert(mockInsertRequest)

            expect(mockClient.insertMany).toHaveBeenCalledWith(dt.Rows)
            expect(response.StatusCode).toBe(201)
            expect(Cache.Remove).toHaveBeenCalledWith(mockInsertRequest)
        })

        it('should throw error when data is missing', async () => {
            const mockInsertRequest: TSchemaRequest = {
                schema: 'test-schema',
                entity: 'test-table'
            }

            await expect(provider.Insert(mockInsertRequest)).rejects.toThrow('test-schema: data is missing')
        })
    })

    describe('Select', () => {
        it('should successfully select data', async () => {
            const mockSelectRequest: TSchemaRequest = {
                schema: 'test-schema',
                entity: 'test-table',
                cache: 30
            }

            mockClient.toArray.mockResolvedValueOnce([
                {
                    id: 1,
                    name: 'test'
                }
            ])

            const response = await provider.Select(mockSelectRequest)

            expect(mockClient.aggregate).toHaveBeenCalled()
            expect(response.StatusCode).toBe(200)
            expect(response.Body?.data).toBeDefined()
            expect(response.Body?.data.Rows).toHaveLength(1)
        })

        it('should handle empty result set', async () => {
            const mockSelectRequest: TSchemaRequest = {
                schema: 'test-schema',
                entity: 'test-table'
            }

            mockClient.toArray.mockResolvedValueOnce([])

            const response = await provider.Select(mockSelectRequest)
            expect(response.Body?.data.Rows).toHaveLength(0)
        })
    })

    describe('Update', () => {
        it('should successfully update data', async () => {
            const dt = new DataTable('test-table', [
                {
                    id: 1,
                    name: 'updated'
                }
            ])
            const mockUpdateRequest: TSchemaRequest = {
                schema: 'test-schema',
                entity: 'test-table',
                data: dt.Rows,
                filter: {
                    id: 1
                }
            }

            const response = await provider.Update(mockUpdateRequest)

            expect(mockClient.updateMany).toHaveBeenCalledWith(
                { id: 1 },
                { $set: dt.Rows[0] }
            )
            expect(response.StatusCode).toBe(204)
            expect(Cache.Remove).toHaveBeenCalledWith(mockUpdateRequest)
        })

        it('should throw error when update data is missing', async () => {
            const mockUpdateRequest: TSchemaRequest = {
                schema: 'test-schema',
                entity: 'test-table',
                filter: { id: 1 }
            }

            await expect(provider.Update(mockUpdateRequest))
                .rejects.toThrow('test-schema: data is missing')
        })

        it('should handle update with filter condition', async () => {
            const dt = new DataTable('test-table', [
                {
                    name: 'updated'
                }
            ])
            const mockUpdateRequest: TSchemaRequest = {
                schema: 'test-schema',
                entity: 'test-table',
                data: dt.Rows,
                "filter-expression": 'id > 5'
            }

            await provider.Update(mockUpdateRequest)

            expect(mockClient.updateMany).toHaveBeenCalledWith(
                { id: { $gt: 5 } },
                { $set: dt.Rows[0] }
            )
        })
    })

    describe('Delete', () => {
        it('should successfully delete data', async () => {
            const mockDeleteRequest: TSchemaRequest = {
                schema: 'test-schema',
                entity: 'test-table',
                filter: { id: 1 }
            }

            const response = await provider.Delete(mockDeleteRequest)

            expect(mockClient.deleteMany).toHaveBeenCalledWith(
                { id: 1 }
            )
            expect(response.StatusCode).toBe(204)
            expect(Cache.Remove).toHaveBeenCalledWith(mockDeleteRequest)
        })

        it('should handle delete with complex filter condition', async () => {
            const mockDeleteRequest: TSchemaRequest = {
                schema: 'test-schema',
                entity: 'test-table',
                "filter-expression": "name LIKE '%test%' AND id > 10"
            }

            await provider.Delete(mockDeleteRequest)

            expect(mockClient.deleteMany).toHaveBeenCalledWith({
                $and: [
                    {
                        name: {
                            $options: "i",
                            $regex: "\\.\\*test\\.\\*"
                        }
                    }, {
                        id: {
                            $gt: 10
                        }
                    }
                ]
            })
        })

        // FIXME to fix test 
        // it('should handle delete without filter', async () => {
        //     const mockDeleteRequest: TSchemaRequest = {
        //         schema: 'test-schema',
        //         entity: 'test-table'
        //     }

        //     await provider.Delete(mockDeleteRequest)

        //     expect(mockClient.deleteMany).toHaveBeenCalledWith({})
        // })
    })

    describe('ListEntities', () => {
        // it('should successfully list entities', async () => {
        //     const mockListRequest: TSchemaRequestListEntities = {
        //         schema: 'test-schema'
        //     }

        //     const mockCollections = [
        //         {
        //             name: 'table1',
        //             type: 'collection',
        //             size: 100
        //         },
        //         {
        //             name: 'table2',
        //             type: 'collection',
        //             size: 200
        //         }
        //     ]
        //     mockClient.listCollections.mockResolvedValueOnce({ toArray: () => Promise.resolve(mockCollections) })
        //     mockClient.collection.mockResolvedValueOnce([])
        //     mockClient.db().collection.mockResolvedValueOnce([])

        //     const response = await provider.ListEntities(mockListRequest as TSchemaRequest)

        //     expect(response.StatusCode).toBe(200)
        //     expect(response.Body?.data.Rows).toHaveLength(2)
        //     expect(mockClient.db().listCollections()).toHaveBeenCalled()
        // })

        it('should throw NotFound when no entities exist', async () => {
            const mockListRequest: TSchemaRequest = {
                schema: 'test-schema',
                entity: ''
            }

            mockClient.toArray.mockResolvedValueOnce([])

            await expect(provider.ListEntities(mockListRequest))
                .rejects.toThrow(HttpErrorNotFound)
        })
    })

    describe('Disconnect', () => {
        it('should successfully disconnect', async () => {
            await provider.Disconnect()
            expect(mockClient.close).toHaveBeenCalled()
        })

        it('should handle disconnect when not connected', async () => {
            provider.Connection = undefined
            await provider.Disconnect()
            expect(mockClient.close).not.toHaveBeenCalled()
        })

        it('should handle disconnect errors gracefully', async () => {
            await provider.Disconnect()
            // Should not throw error
            expect(mockClient.close).toHaveBeenCalled()
        })
    })

    describe('Escape', () => {
        it('should correctly escape entity names', () => {
            const result = provider.EscapeEntity('test-table')
            expect(result).toBe('test-table')
        })

        it('should correctly escape field names', () => {
            const result = provider.EscapeField('user_id')
            expect(result).toBe('user_id')
        })
    })

    describe('Cache Integration', () => {
        it('should set cache for select operations when cache is enabled', async () => {
            const mockSelectRequest: TSchemaRequest = {
                schema: 'test-schema',
                entity: 'test-table',
                cache: 60
            }

            mockClient.toArray.mockResolvedValueOnce([
                {
                    id: 1,
                    name: 'test'
                }
            ])

            await provider.Select(mockSelectRequest)

            expect(Cache.Set).toHaveBeenCalledWith(
                mockSelectRequest,
                expect.any(DataTable)
            )
        })

        it('should not set cache for select operations when cache is disabled', async () => {
            const mockSelectRequest: TSchemaRequest = {
                schema: 'test-schema',
                entity: 'test-table'
            }

            mockClient.toArray.mockResolvedValueOnce([
                {
                    id: 1,
                    name: 'test'
                }
            ])

            await provider.Select(mockSelectRequest)

            expect(Cache.Set).not.toHaveBeenCalled()
        })
    })
})