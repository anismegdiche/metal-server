
import typia from "typia"
import { TConfig } from "../../types/TConfig"
import { Config } from '../Config'

describe('Config', () => {

    beforeAll(async () => {
        Config.Configuration = typia.random<TConfig>()
    })

    describe('Validate', () => {
        it('should check the configuration', async () => {
            const conf = Config.Configuration
            expect.assertions(1)
            await expect(Config.Validate(conf)).resolves.not.toThrow()
        })
    })
})