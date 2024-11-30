// import { Cache } from '../Cache'
// import { Config } from '../Config'
// import { HttpErrorNotFound } from '../HttpErrors'
// import { DataTable } from '../../types/DataTable'
// import { absDataProvider } from "../../providers/absDataProvider"
// import { DATA_PROVIDER } from "../../providers/DataProvider"
// import { TSchemaRequest } from "../../types/TSchemaRequest"
// import { Source } from "../Source"

// // jest.mock('../Config')
// jest.mock('../Source')

// describe('Cache', () => {
//     // eslint-disable-next-line init-declarations, @typescript-eslint/no-explicit-any
//     let mockCacheSource: any

//     let sourceMock = Source as jest.MockedClass<typeof Source>

//     beforeAll(() => {
//         mockCacheSource = {
//             Select: jest.fn(),
//             Insert: jest.fn(),
//             Update: jest.fn(),
//             Delete: jest.fn(),
//             Disconnect: jest.fn(),
//             ProviderName: "mock" as DATA_PROVIDER,
//             SourceName: undefined,
//             Params: undefined,
//             Connection: undefined,
//             EscapeEntity: jest.fn(),
//             EscapeField: jest.fn(),
//             Init: jest.fn(),
//             Connect: jest.fn(),
//             ListEntities: jest.fn(),
//             AddEntity: jest.fn()
//         }
//         Cache.CacheSource = <absDataProvider>mockCacheSource
//     })

//     beforeEach(() => {
//         jest.clearAllMocks()
//         Config.Flags.EnableCache = true
//     })

//     describe('Connect', () => {
//         it('should connect if caching is enabled', async () => {
//             Config.Flags.EnableCache = true
//             await Cache.Connect()
//             expect(sourceMock.Connect).toHaveBeenCalledTimes(1)
//         })

//         it('should skip connection if caching is disabled', async () => {
//             Config.Flags.EnableCache = false
//             await Cache.Connect()
//             expect(sourceMock.Connect).toHaveBeenCalledTimes(0)
//         })
//     })

//     describe('Disconnect', () => {
//         it('should disconnect if caching is enabled', async () => {
//             await Cache.Disconnect()
//             expect(mockCacheSource.Disconnect).toHaveBeenCalled()
//         })

//         it('should skip disconnection if caching is disabled', async () => {
//             Config.Flags.EnableCache = false
//             await Cache.Disconnect()
//             expect(mockCacheSource.Disconnect).not.toHaveBeenCalled()
//         })
//     })

//     describe('IsExists', () => {
//         it('should return expiration time if cache exists', async () => {
//             const mockResponse = {
//                 Body: { data: { Rows: [{ expires: 12345 }] } }
//             }
//             mockCacheSource.Select.mockResolvedValue(mockResponse)

//             const result = await Cache.IsExists('some-hash')
//             expect(mockCacheSource.Select).toHaveBeenCalledWith(expect.objectContaining({ filter: { hash: 'some-hash' } }))
//             expect(result).toBe(12345)
//         })

//         it('should return 0 if cache does not exist', async () => {
//             mockCacheSource.Select.mockResolvedValue({ Body: null })

//             const result = await Cache.IsExists('non-existent-hash')
//             expect(result).toBe(0)
//         })

//         it('should return 0 on error', async () => {
//             mockCacheSource.Select.mockRejectedValue(new Error('Unexpected error'))

//             const result = await Cache.IsExists('error-hash')
//             expect(result).toBe(0)
//         })
//     })

//     describe('IsCacheValid', () => {
//         it('should return true for valid expiration', () => {
//             const validExpires = Date.now() + 1000
//             expect(Cache.IsCacheValid(validExpires)).toBe(true)
//         })

//         it('should return false for expired cache', () => {
//             const expired = Date.now() - 1000
//             expect(Cache.IsCacheValid(expired)).toBe(false)
//         })
//     })

//     describe('Set', () => {
//         it('should insert new cache if it does not exist', async () => {
//             jest.spyOn(Cache, 'IsExists').mockResolvedValue(0)
//             jest.spyOn(Cache, 'Hash').mockReturnValue('mock-hash')
//             const mockDataTable = new DataTable()

//             await Cache.Set({ schema: 'test',
// entity: 'test',
// cache: 10 }, mockDataTable)

//             expect(mockCacheSource.Insert).toHaveBeenCalledWith(
//                 expect.objectContaining({
//                     data: expect.arrayContaining([expect.objectContaining({ hash: 'mock-hash' })])
//                 })
//             )
//         })

//         it('should update cache if expired', async () => {
//             jest.spyOn(Cache, 'IsExists').mockResolvedValue(Date.now() - 1000)
//             jest.spyOn(Cache, 'Hash').mockReturnValue('mock-hash')
//             const mockDataTable = new DataTable()
//             jest.spyOn(Cache, 'Update').mockResolvedValue()

//             await Cache.Set({ schema: 'test',
// entity: 'test',
// cache: 10 }, mockDataTable)

//             expect(Cache.Update).toHaveBeenCalledWith(
//                 'mock-hash',
//                 expect.any(Number),
//                 mockDataTable
//             )
//         })
//     })

//     describe('Get', () => {
//         it('should return cache if found', async () => {
//             jest.spyOn(Cache, 'Hash').mockReturnValue('mock-hash')
//             const mockResponse = { Body: { data: { Rows: [{}] } } }
//             mockCacheSource.Select.mockResolvedValue(mockResponse)

//             const result = await Cache.Get(<TSchemaRequest>{ schema: 'test' })
//             expect(result).toBe(mockResponse)
//         })

//         it('should throw not found error if cache is missing', async () => {
//             jest.spyOn(Cache, 'Hash').mockReturnValue('mock-hash')
//             mockCacheSource.Select.mockResolvedValue({ Body: { data: { Rows: [] } } })

//             await expect(Cache.Get(<TSchemaRequest>{ schema: 'test' })).rejects.toThrow(HttpErrorNotFound)
//         })
//     })

//     describe('Purge', () => {
//         it('should delete all cache', async () => {
//             await Cache.Purge()
//             expect(mockCacheSource.Delete).toHaveBeenCalledWith(expect.any(Object))
//         })
//     })
// })
