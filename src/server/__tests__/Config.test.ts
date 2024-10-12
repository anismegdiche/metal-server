
import typia from "typia"
import { TConfig } from "../../types/TConfig"
import { Config } from '../Config'

describe('Config', () => {

    beforeAll(async () => {
        Config.Configuration = typia.random<TConfig>()
    })

    describe('Validate', () => {
        it('should check the configuration', async () => {
            expect.assertions(1)
            await expect(Config.Validate(Config.Configuration)).resolves.not.toThrow()
        })
    })
})