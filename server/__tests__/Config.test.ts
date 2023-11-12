
import { Config } from '../Config'

describe('Config', () => {
    beforeAll(async () => {
        // Initialize the configuration before running tests
        //await Config.Init()
    })

    describe('Load', () => {
        it('should load the configuration from file', async () => {
            Config.Load()
            expect.assertions(1)
            expect(Config.Configuration).toBeDefined()
        })
    })

    describe('Check', () => {
        it('should check the configuration', async () => {
            expect.assertions(1)
            await expect(Config.Check()).resolves.not.toThrow()
        })
    })

    describe('CheckRoot', () => {
        it('should check the root configuration', async () => {
            expect.assertions(1)
            await expect(Config.CheckRoot()).resolves.not.toThrow()
        })
    })

    describe('CheckSources', () => {
        it('should check the sources configuration', async () => {
            expect.assertions(1)
            await expect(Config.CheckSources()).resolves.not.toThrow()
        })
    })

    describe('CheckSchemas', () => {
        it('should check the schemas configuration', async () => {
            expect.assertions(1)
            await expect(Config.CheckSchemas()).resolves.not.toThrow()
        })
    })

    // describe('ConnectToCache', () => {
    //     it('should connect to the cache', async () => {
    //         expect.assertions(1)
    //         await expect(Config.ConnectToCache()).resolves.not.toThrow()
    //     })
    // })

    // describe('ConnectToSources', () => {
    //     it('should connect to the sources', async () => {
    //         expect.assertions(1)
    //         await expect(Config.ConnectToSources()).resolves.not.toThrow()
    //     })
    // })
})