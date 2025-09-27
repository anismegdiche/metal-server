
import { MongoDbData } from '../providers/MongoDbData'
import { TSchemaRequestListEntities } from '../../schema/types/TSchemaRequest'
import { HttpErrorNotFound } from '../../errors/HttpErrors'
import { TConfigSource } from "../types/TConfigSource"
import { DATA_PROVIDER } from "../@consts"

// Mock the mongodb module
const mockCollection = {
    insertMany: jest.fn().mockResolvedValue({ insertedCount: 1 }),
    aggregate: jest.fn().mockReturnThis(),
    find: jest.fn().mockReturnThis(),
    toArray: jest.fn().mockResolvedValue([{ id: 1, name: 'test' }]),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 1 }),
    countDocuments: jest.fn().mockResolvedValue(1),
    listCollections: jest.fn().mockReturnThis()
};

const mockDb = {
    command: jest.fn().mockResolvedValue({}),
    collection: jest.fn().mockReturnValue(mockCollection),
    listCollections: jest.fn().mockReturnThis()
};

const mockMongoClient = {
    connect: jest.fn().mockResolvedValue(undefined),
    db: jest.fn().mockReturnValue(mockDb),
    close: jest.fn().mockResolvedValue(undefined)
};

// Mock the mongodb module
jest.mock('mongodb', () => ({
    MongoClient: jest.fn().mockImplementation(() => mockMongoClient)
}));

// Mock the Cache module
jest.mock('../../cache/Cache')

// Mock the Logger
jest.mock('../../../utils/Logger', () => ({
    Logger: {
        LogFunction: () => () => { },
        Debug: jest.fn(),
        Warn: jest.fn(),
        Error: jest.fn()
    }
}))

describe('MongoDbData', () => {
    let provider: MongoDbData

    const providerConfig: TConfigSource = {
        provider: DATA_PROVIDER.MONGODB,
        host: 'mongodb://localhost:27017/',
        database: 'test-db',
        options: {}
    }

    beforeEach(async () => {
        // Reset all mocks before each test
        jest.clearAllMocks()

        // Setup default mock implementations
        mockCollection.toArray.mockResolvedValue([{ dummy: 'data' }]);
        mockDb.listCollections.mockReturnValue({
            toArray: jest.fn().mockResolvedValue([{ name: 'test-collection' }])
        });

        // Create a new provider instance with test configuration
        provider = new MongoDbData()
        await provider.Init('test-source', providerConfig)
        // Connect after initialization
        await provider.Connect()
    })

    describe('Init and Connection', () => {
        it('should successfully initialize and connect', async () => {
            // The connection is established in the beforeEach hook
            expect(provider.Connection).toBeDefined();
            expect(mockMongoClient.connect).toHaveBeenCalled();
            expect(mockDb.command).toHaveBeenCalledWith({ ping: 1 });
        })

        it('should handle disconnect when not connected', async () => {
            provider.Connection = undefined
            await provider.Disconnect()
            expect(mockMongoClient.close).not.toHaveBeenCalled()
        })

        it('should handle disconnect errors gracefully', async () => {
            await provider.Disconnect()
            // Should not throw error
            expect(mockMongoClient.close).toHaveBeenCalled()
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

    describe('ListEntities', () => {
        it('should successfully list entities', async () => {
            const mockListRequest: TSchemaRequestListEntities = {
                schema: 'test-schema'
            };

            const mockCollections = [
                { name: 'table1', type: 'collection' },
                { name: 'table2', type: 'collection' }
            ];

            // Mock the listCollections response
            mockDb.listCollections.mockReturnValue({
                toArray: jest.fn().mockResolvedValue(mockCollections)
            });

            const response = await provider.ListEntities(mockListRequest);

            expect(response.StatusCode).toBe(200);
            expect(response.Body?.data.Rows).toHaveLength(2);
        })

        it('should throw NotFound when no entities exist', async () => {
            const mockListRequest: TSchemaRequestListEntities = {
                schema: 'test-schema'
            };

            // Mock empty collections list
            mockDb.listCollections.mockReturnValue({
                toArray: jest.fn().mockResolvedValue([])
            });

            await expect(provider.ListEntities(mockListRequest))
                .rejects.toThrow(HttpErrorNotFound);
        })
    })
})