//
//
//
import { STORAGE } from "../../storage/@consts";
import { TStorageConfig } from "../../storage/types/TStorageConfig";
import { TFilesDataOptionsContent } from "./TFilesDataOptionsContent";


export type TFilesDataOptions = {
    // Common
    storage?: STORAGE;
    content?: TFilesDataOptionsContent;
    autocreate?: boolean;
} &
    TStorageConfig;
