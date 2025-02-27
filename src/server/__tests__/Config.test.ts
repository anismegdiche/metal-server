
import typia from "typia"
import { TConfig, TConfigRoles } from "../../types/TConfig"
import { Config } from '../Config'

describe('Config', () => {

    beforeAll(async () => {
        Config.Configuration = typia.random<TConfig>()
        Config.Configuration.roles = {
            ...typia.random<TConfigRoles>(),
            ...typia.random<TConfigRoles>(),
            ...typia.random<TConfigRoles>()
        }
    })

    describe('Validate', () => {
        it('should check the configuration', async () => {
            const conf = Config.Configuration
            expect.assertions(1)
            await expect(Config.Validate(conf)).resolves.not.toThrow()
        }, 300_000)
    })
})