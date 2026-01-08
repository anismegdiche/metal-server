//
//
//
import type { IConfigStore } from './base/IConfigStore'
import type { U_config } from "./types/U_config"


//
export class ConfigStore implements IConfigStore {
    Configuration: U_config = <U_config>{}

    Init(newConfig: U_config) {
        this.Configuration = newConfig
    }
}