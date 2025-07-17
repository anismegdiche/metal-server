
import typia from "typia"
import { ConfigStore } from "../ConfigStore"
import { ConfigManager } from "../ConfigManager"
import { TConfig, TConfigRoles } from "../types/TConfig"

const configStore = new ConfigStore()

describe('Config', () => {

    beforeAll(async () => {
        configStore.Configuration = typia.random<TConfig>()
        configStore.Configuration.roles = {
            ...typia.random<TConfigRoles>(),
            ...typia.random<TConfigRoles>(),
            ...typia.random<TConfigRoles>()
        }
    })

    describe('Validate', () => {
        it('should check the configuration', async () => {
            const conf = configStore.Configuration
            expect.assertions(1)
            await expect(ConfigManager.Validate(conf)).resolves.not.toThrow()
        }, 300_000)
    })
})