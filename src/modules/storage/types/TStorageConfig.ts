import { TAmazonS3StorageConfig } from "../providers/AmazonS3Storage";
import { TAzureBlobStorageConfig } from "../providers/AzureBlobStorage";
import { TAzureDataLakeStorageConfig } from "../providers/AzureDataLakeStorage";
import { TAzureFileStorageConfig } from "../providers/AzureFileStorage";
import { TFsStorageConfig } from "../providers/FsStorage";
import { TFtpStorageConfig } from "../providers/FtpStorage";


export type TStorageConfig = TFsStorageConfig &
    TFtpStorageConfig &
    TAzureBlobStorageConfig &
    TAzureFileStorageConfig &
    TAzureDataLakeStorageConfig &
    TAmazonS3StorageConfig;
