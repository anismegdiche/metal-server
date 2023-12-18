
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
})