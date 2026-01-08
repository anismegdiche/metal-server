
import { ConfigStore } from "../ConfigStore"
import type { U_config } from "../types/U_config"

describe('ConfigStore', () => {

    const config: U_config = {
        version: "0.5",
        roles: {
            admin: "crudla"
        },
        users: {
            admin: {
                password: "password",
                roles: ["admin"]
            }
        },
        sources: {}
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