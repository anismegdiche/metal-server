import type { U_config } from "../types/U_config";

/**
 * Interface defining the contract for configuration storage
 */
export interface IConfigStore {
    Configuration: U_config;
    Init(newConfig: U_config): void
}
