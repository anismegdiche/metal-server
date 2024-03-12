# Details

Date : 2024-03-11 11:35:15

Directory c:\\Users\\Administrator\\OneDrive\\Projets\\Metl\\metal-server\\src

Total : 77 files,  7956 codes, 720 comments, 1318 blanks, all 9994 lines

[Summary](results.md) / Details / [Diff Summary](diff.md) / [Diff Details](diff-details.md)

## Files
| filename | language | code | comment | blank | total |
| :--- | :--- | ---: | ---: | ---: | ---: |
| [src/ai-engine/NlpJs.ts](/src/ai-engine/NlpJs.ts) | TypeScript | 64 | 7 | 13 | 84 |
| [src/ai-engine/TensorFlowJs.ts](/src/ai-engine/TensorFlowJs.ts) | TypeScript | 76 | 8 | 18 | 102 |
| [src/ai-engine/TesseractJs.ts](/src/ai-engine/TesseractJs.ts) | TypeScript | 30 | 8 | 5 | 43 |
| [src/ai-engine/__tests__/NlpJs.test.ts](/src/ai-engine/__tests__/NlpJs.test.ts) | TypeScript | 81 | 7 | 18 | 106 |
| [src/ai-engine/__tests__/TensorFlowJs.test.ts](/src/ai-engine/__tests__/TensorFlowJs.test.ts) | TypeScript | 40 | 1 | 8 | 49 |
| [src/ai-engine/__tests__/TesseractJs.test.ts](/src/ai-engine/__tests__/TesseractJs.test.ts) | TypeScript | 22 | 0 | 9 | 31 |
| [src/index.ts](/src/index.ts) | TypeScript | 5 | 5 | 1 | 11 |
| [src/lib/Const.ts](/src/lib/Const.ts) | TypeScript | 236 | 7 | 15 | 258 |
| [src/lib/Convert.ts](/src/lib/Convert.ts) | TypeScript | 91 | 11 | 16 | 118 |
| [src/lib/Helper.ts](/src/lib/Helper.ts) | TypeScript | 47 | 7 | 9 | 63 |
| [src/lib/Logger.ts](/src/lib/Logger.ts) | TypeScript | 78 | 6 | 17 | 101 |
| [src/lib/SqlQueryHelper.ts](/src/lib/SqlQueryHelper.ts) | TypeScript | 159 | 8 | 27 | 194 |
| [src/lib/StringHelper.ts](/src/lib/StringHelper.ts) | TypeScript | 13 | 5 | 2 | 20 |
| [src/lib/TypeHelper.ts](/src/lib/TypeHelper.ts) | TypeScript | 33 | 5 | 5 | 43 |
| [src/lib/__tests__/Convert.test.ts](/src/lib/__tests__/Convert.test.ts) | TypeScript | 223 | 28 | 32 | 283 |
| [src/lib/__tests__/SqlQueryHelper.test.ts](/src/lib/__tests__/SqlQueryHelper.test.ts) | TypeScript | 90 | 16 | 13 | 119 |
| [src/providers/content/CommonContent.ts](/src/providers/content/CommonContent.ts) | TypeScript | 19 | 10 | 6 | 35 |
| [src/providers/content/CsvContent.ts](/src/providers/content/CsvContent.ts) | TypeScript | 43 | 6 | 9 | 58 |
| [src/providers/content/JsonContent.ts](/src/providers/content/JsonContent.ts) | TypeScript | 42 | 9 | 9 | 60 |
| [src/providers/content/__tests__/CsvContent.test.ts](/src/providers/content/__tests__/CsvContent.test.ts) | TypeScript | 115 | 0 | 23 | 138 |
| [src/providers/content/__tests__/JsonContent.test.ts](/src/providers/content/__tests__/JsonContent.test.ts) | TypeScript | 106 | 0 | 24 | 130 |
| [src/providers/data/CommonDataProvider.ts](/src/providers/data/CommonDataProvider.ts) | TypeScript | 116 | 15 | 23 | 154 |
| [src/providers/data/CommonSqlDataProvider.ts](/src/providers/data/CommonSqlDataProvider.ts) | TypeScript | 49 | 5 | 11 | 65 |
| [src/providers/data/FilesDataProvider.ts](/src/providers/data/FilesDataProvider.ts) | TypeScript | 258 | 10 | 48 | 316 |
| [src/providers/data/MemoryDataProvider.ts](/src/providers/data/MemoryDataProvider.ts) | TypeScript | 171 | 8 | 38 | 217 |
| [src/providers/data/MetalDataProvider.ts](/src/providers/data/MetalDataProvider.ts) | TypeScript | 241 | 7 | 47 | 295 |
| [src/providers/data/MongoDbDataProvider.ts](/src/providers/data/MongoDbDataProvider.ts) | TypeScript | 251 | 11 | 46 | 308 |
| [src/providers/data/PlanDataProvider.ts](/src/providers/data/PlanDataProvider.ts) | TypeScript | 113 | 8 | 18 | 139 |
| [src/providers/data/PostgresDataProvider.ts](/src/providers/data/PostgresDataProvider.ts) | TypeScript | 174 | 5 | 37 | 216 |
| [src/providers/data/SqlServerDataProvider.ts](/src/providers/data/SqlServerDataProvider.ts) | TypeScript | 176 | 5 | 33 | 214 |
| [src/providers/storage/AzureBlobStorage.ts](/src/providers/storage/AzureBlobStorage.ts) | TypeScript | 65 | 6 | 18 | 89 |
| [src/providers/storage/CommonStorage.ts](/src/providers/storage/CommonStorage.ts) | TypeScript | 43 | 18 | 14 | 75 |
| [src/providers/storage/FsStorage.ts](/src/providers/storage/FsStorage.ts) | TypeScript | 35 | 6 | 8 | 49 |
| [src/providers/storage/__tests__/FsStorage.test.ts](/src/providers/storage/__tests__/FsStorage.test.ts) | TypeScript | 53 | 1 | 20 | 74 |
| [src/response/CacheResponse.ts](/src/response/CacheResponse.ts) | TypeScript | 72 | 5 | 12 | 89 |
| [src/response/PlanResponse.ts](/src/response/PlanResponse.ts) | TypeScript | 15 | 5 | 5 | 25 |
| [src/response/ScheduleResponse.ts](/src/response/ScheduleResponse.ts) | TypeScript | 24 | 6 | 2 | 32 |
| [src/response/SchemaResponse.ts](/src/response/SchemaResponse.ts) | TypeScript | 162 | 7 | 12 | 181 |
| [src/response/ServerResponse.ts](/src/response/ServerResponse.ts) | TypeScript | 68 | 5 | 12 | 85 |
| [src/response/UserResponse.ts](/src/response/UserResponse.ts) | TypeScript | 99 | 7 | 14 | 120 |
| [src/routes/CacheRouter.ts](/src/routes/CacheRouter.ts) | TypeScript | 26 | 6 | 8 | 40 |
| [src/routes/PlanRouter.ts](/src/routes/PlanRouter.ts) | TypeScript | 19 | 6 | 3 | 28 |
| [src/routes/ScheduleRouter.ts](/src/routes/ScheduleRouter.ts) | TypeScript | 24 | 6 | 4 | 34 |
| [src/routes/SchemaRouter.ts](/src/routes/SchemaRouter.ts) | TypeScript | 37 | 7 | 3 | 47 |
| [src/routes/ServerRouter.ts](/src/routes/ServerRouter.ts) | TypeScript | 15 | 5 | 3 | 23 |
| [src/routes/UserRouter.ts](/src/routes/UserRouter.ts) | TypeScript | 24 | 5 | 4 | 33 |
| [src/server/AiEngine.ts](/src/server/AiEngine.ts) | TypeScript | 182 | 17 | 19 | 218 |
| [src/server/Cache.ts](/src/server/Cache.ts) | TypeScript | 167 | 10 | 29 | 206 |
| [src/server/Config.ts](/src/server/Config.ts) | TypeScript | 225 | 15 | 24 | 264 |
| [src/server/HttpErrors.ts](/src/server/HttpErrors.ts) | TypeScript | 27 | 5 | 6 | 38 |
| [src/server/InternalError.ts](/src/server/InternalError.ts) | TypeScript | 21 | 5 | 4 | 30 |
| [src/server/Plan.ts](/src/server/Plan.ts) | TypeScript | 117 | 12 | 24 | 153 |
| [src/server/Sandbox.ts](/src/server/Sandbox.ts) | TypeScript | 49 | 14 | 9 | 72 |
| [src/server/Schedule.ts](/src/server/Schedule.ts) | TypeScript | 90 | 5 | 12 | 107 |
| [src/server/Schema.ts](/src/server/Schema.ts) | TypeScript | 161 | 12 | 33 | 206 |
| [src/server/Server.ts](/src/server/Server.ts) | TypeScript | 98 | 15 | 19 | 132 |
| [src/server/Source.ts](/src/server/Source.ts) | TypeScript | 71 | 17 | 8 | 96 |
| [src/server/Step.ts](/src/server/Step.ts) | TypeScript | 339 | 21 | 86 | 446 |
| [src/server/User.ts](/src/server/User.ts) | TypeScript | 86 | 8 | 18 | 112 |
| [src/server/__tests__/Config.test.ts](/src/server/__tests__/Config.test.ts) | TypeScript | 18 | 2 | 4 | 24 |
| [src/server/__tests__/Plan.test.ts](/src/server/__tests__/Plan.test.ts) | TypeScript | 432 | 61 | 53 | 546 |
| [src/server/__tests__/Sandbox.test.ts](/src/server/__tests__/Sandbox.test.ts) | TypeScript | 115 | 23 | 22 | 160 |
| [src/server/__tests__/User.test.ts](/src/server/__tests__/User.test.ts) | TypeScript | 93 | 1 | 13 | 107 |
| [src/types/DataBase.ts](/src/types/DataBase.ts) | TypeScript | 45 | 6 | 12 | 63 |
| [src/types/DataTable.ts](/src/types/DataTable.ts) | TypeScript | 252 | 58 | 67 | 377 |
| [src/types/IAiEngine.ts](/src/types/IAiEngine.ts) | TypeScript | 10 | 1 | 2 | 13 |
| [src/types/IDataProvider.ts](/src/types/IDataProvider.ts) | TypeScript | 26 | 1 | 4 | 31 |
| [src/types/TCacheData.ts](/src/types/TCacheData.ts) | TypeScript | 8 | 0 | 2 | 10 |
| [src/types/TInternalResponse.ts](/src/types/TInternalResponse.ts) | TypeScript | 6 | 0 | 2 | 8 |
| [src/types/TJson.ts](/src/types/TJson.ts) | TypeScript | 1 | 5 | 1 | 7 |
| [src/types/TOptions.ts](/src/types/TOptions.ts) | TypeScript | 7 | 0 | 2 | 9 |
| [src/types/TSchedule.ts](/src/types/TSchedule.ts) | TypeScript | 5 | 5 | 1 | 11 |
| [src/types/TSchemaRequest.ts](/src/types/TSchemaRequest.ts) | TypeScript | 12 | 7 | 1 | 20 |
| [src/types/TSchemaResponse.ts](/src/types/TSchemaResponse.ts) | TypeScript | 47 | 6 | 9 | 62 |
| [src/types/TSourceParams.ts](/src/types/TSourceParams.ts) | TypeScript | 11 | 0 | 1 | 12 |
| [src/types/__tests__/DataTable.test.ts](/src/types/__tests__/DataTable.test.ts) | TypeScript | 1,245 | 56 | 100 | 1,401 |
| [src/types/__tests__/TJson.test.ts](/src/types/__tests__/TJson.test.ts) | TypeScript | 47 | 3 | 9 | 59 |

[Summary](results.md) / Details / [Diff Summary](diff.md) / [Diff Details](diff-details.md)