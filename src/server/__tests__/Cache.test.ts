// import { Cache } from '../Cache'
// import { Logger } from '../../utils/Logger'
// import { Config } from '../Config'
// import { HttpResponse } from '../HttpResponse'
// import { TSchemaRequest, TSchemaRequestSelect } from '../../types/TSchemaRequest'
// import { TUserTokenInfo } from '../User'
// import { DataTable } from '../../types/DataTable'
// import { HttpErrorNotFound } from '../HttpErrors'
// import { Source } from "../Source"
// import { TSchemaResponse } from "../../types/TSchemaResponse"
// import { TInternalResponse } from "../../types/TInternalResponse"

// // Mock dependencies
// jest.mock('../../utils/Logger')

// // Mock CacheSource
// Cache.CacheSource = {
//     Select: jest.fn() as jest.Mock,
//     Insert: jest.fn() as jest.Mock,
//     Update: jest.fn() as jest.Mock,
//     Delete: jest.fn() as jest.Mock,
//     Disconnect: jest.fn() as jest.Mock,
// } as any

describe('Cache', () => {
//     beforeEach(() => {
//         jest.clearAllMocks()
//     })

//     describe('Connect', () => {
//         it('should call Source.Connect when caching is enabled', async () => {
//             Config.Flags.EnableCache = true
//             Config.Get = jest.fn().mockReturnValue('cacheConnection')
//             const sourceConnectSpy = jest.spyOn(Source, 'Connect')

//             await Cache.Connect()

//             expect(sourceConnectSpy).toHaveBeenCalledWith(null, 'cacheConnection')
//         })

//         it('should not call Source.Connect when caching is disabled', async () => {
//             Config.Flags.EnableCache = false
//             const sourceConnectSpy = jest.spyOn(Source, 'Connect')

//             await Cache.Connect()

//             expect(sourceConnectSpy).not.toHaveBeenCalled()
//         })
//     })

//     describe('Disconnect', () => {
//         it('should call CacheSource.Disconnect when caching is enabled', async () => {
//             Config.Flags.EnableCache = true

//             await Cache.Disconnect()

//             expect(Cache.CacheSource.Disconnect).toHaveBeenCalled()
//         })

//         it('should not call CacheSource.Disconnect when caching is disabled', async () => {
//             Config.Flags.EnableCache = false

//             await Cache.Disconnect()

//             expect(Cache.CacheSource.Disconnect).not.toHaveBeenCalled()
//         })
//     })

//     describe('IsExists', () => {
//         it('should return cache expiration time if cache exists', async () => {
//             Config.Flags.EnableCache = true
//             const mockResponse = {
//                 Body: {
//                     data: { Rows: [{ expires: 12345 }] },
//                 },
//             };
//             (Cache.CacheSource.Select as jest.Mock).mockResolvedValue(mockResponse) // Use mockResolvedValue

//             const result = await Cache.IsExists('hash123')

//             expect(Cache.CacheSource.Select).toHaveBeenCalled()
//             expect(result).toBe(12345)
//         })

//         it('should return 0 if cache does not exist', async () => {
//             Config.Flags.EnableCache = true;
//             (Cache.CacheSource.Select as jest.Mock).mockResolvedValue({ Body: null })

//             const result = await Cache.IsExists('hash123')

//             expect(result).toBe(0)
//         })

//         it('should return 0 if caching is disabled', async () => {
//             Config.Flags.EnableCache = false

//             const result = await Cache.IsExists('hash123')

//             expect(result).toBe(0)
//         })
//     })

//     describe('Set', () => {
//         it('should insert new cache if not present', async () => {
//             Config.Flags.EnableCache = true
//             Cache.IsExists = jest.fn().mockResolvedValue(0)
//             Cache.Hash = jest.fn().mockReturnValue('hash123')
//             Cache.IsArgumentsValid = jest.fn().mockReturnValue(true)

//             const schemaRequest = { cache: 10 } as TSchemaRequest
//             const datatable = new DataTable()
//             datatable.SetMetaData = jest.fn()

//             await Cache.Set(schemaRequest, datatable)

//             expect(Cache.CacheSource.Insert).toHaveBeenCalled()
//         })

//         it('should not insert cache if arguments are invalid', async () => {
//             Config.Flags.EnableCache = true
//             Cache.IsArgumentsValid = jest.fn().mockReturnValue(false)

//             const schemaRequest = {} as TSchemaRequest
//             const datatable = new DataTable()

//             await Cache.Set(schemaRequest, datatable)

//             expect(Cache.CacheSource.Insert).not.toHaveBeenCalled()
//         })
//     })

//     // describe('Get', () => {
//     //     it('should return cached data if valid', async () => {
//     //         Config.Flags.EnableCache = true

//     //         (Cache.CacheSource.Select as jest.Mock).mockResolvedValue(HttpResponse.Ok({
//     //             data: {
//     //                 Rows: [{ data: 'cachedData', expires: Date.now() + 10000 }],
//     //             }
//     //         }))

//     //         Cache.IsArgumentsValid = jest.fn().mockReturnValue(true)

//     //         const schemaRequest = { schema: 'schema1', entity: 'entity1' } as TSchemaRequestSelect

//     //         const response = await Cache.Get(schemaRequest)

//     //         expect(response).toEqual(HttpResponse.Ok(expect.anything()))
//     //     })

//     //     it('should throw HttpErrorNotFound if cache is expired', async () => {
//     //         Config.Flags.EnableCache = true
//     //         const mockResponse = {
//     //             Body: {
//     //                 data: {
//     //                     Rows: [{ data: 'cachedData', expires: Date.now() - 10000 }],
//     //                 },
//     //             },
//     //         }
//     //             (Cache.CacheSource.Select as jest.Mock).mockResolvedValue(mockResponse)
//     //         Cache.IsArgumentsValid = jest.fn().mockReturnValue(true)

//     //         const schemaRequest = { schema: 'schema1', entity: 'entity1' } as TSchemaRequestSelect

//     //         await expect(Cache.Get(schemaRequest)).rejects.toThrow(HttpErrorNotFound)
//     //     })
//     // })

//     // Add tests for other methods like Purge, Clean, Remove as needed.
})
