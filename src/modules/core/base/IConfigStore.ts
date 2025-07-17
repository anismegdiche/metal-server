import { TConfig } from "../types/TConfig";

/**
 * Interface defining the contract for configuration storage
 */
export interface IConfigStore {
    Configuration: TConfig;
    Init(newConfig: TConfig): void
}
