
import { random } from "typia"
import { ConfigStore } from "../ConfigStore"
import { TConfig, TConfigRoles } from "../types/TConfig"
import { TConfigUsers } from "../types/TConfigUsers"

describe('ConfigStore', () => {

    const config = random<TConfig>()
    config.roles = {
        ...random<TConfigRoles>(),
        ...random<TConfigRoles>(),
        ...random<TConfigRoles>()
    }

    config.users = {
        ...random<TConfigUsers>(),
        ...random<TConfigUsers>(),
        ...random<TConfigUsers>()
    }
    
    const configStore = new ConfigStore()

    beforeAll(() => {
        //
    })

    describe('Init', () => {
        it('should init the configuration', async () => {
            expect(() => configStore.Init(config)).not.toThrow()
        })
    })
})