# 1.0.0 (2025-04-15)


### Bug Fixes

* add additional Node.js versions to the CI matrix ([012c10e](https://github.com/anismegdiche/metal-server/commit/012c10e6ebf49648d75390e2aba9d90238d356d0))
* add check for 'ai-engines' configuration before initialization ([230c024](https://github.com/anismegdiche/metal-server/commit/230c024f619435b7ab720b9eaeca73e6660becdc))
* add check for 'plans' configuration before initializing Plans ([c1c95ec](https://github.com/anismegdiche/metal-server/commit/c1c95ec14781a74588bc043770c6ca0df889c5fa))
* add GITHUB_TOKEN to metl-docs checkout step for authentication ([d632706](https://github.com/anismegdiche/metal-server/commit/d63270641844a8f0ce810b0f87202d7c5d99a8ca))
* adjust file path expectation for macOS in SmbStorage tests ([18b8570](https://github.com/anismegdiche/metal-server/commit/18b857009bb32ec5da4b36ed6612df92950c882b))
* await initialization of source provider in Source class ([023f9fe](https://github.com/anismegdiche/metal-server/commit/023f9fe9d98361830010f97a773db79e3f4731bd))
* Cache schema request interception in options.data ([ad3e3d7](https://github.com/anismegdiche/metal-server/commit/ad3e3d758438aaac9d1c1a2c53fccd2843d5631f))
* cast tensor type for MobileNet classification ([d89b034](https://github.com/anismegdiche/metal-server/commit/d89b03464d60c0cf0f446150cdab466f5b08ffe1))
* config samples, update schema references from 'sch-etl1' to 'etl1' and change cache provider to memory ([2cbeeeb](https://github.com/anismegdiche/metal-server/commit/2cbeeeb3492a864a4f744f921bd67a47975d5272))
* correct job name references in CI workflow ([161cf77](https://github.com/anismegdiche/metal-server/commit/161cf7726e52657d67682af2cc0004c68a5d6eb7))
* enhance GetFilePath method to handle share path formatting correctly ([5decc23](https://github.com/anismegdiche/metal-server/commit/5decc23c735d315d72bb7f4c70911bee2b346976))
* enhance HttpErrorSwitch to handle undefined status and improve error logging ([a548f6a](https://github.com/anismegdiche/metal-server/commit/a548f6a21286674d1759c47a55e02398422e96c0))
* ensure session headers are only processed if evaluated successfully in SoapWebService ([95bd57e](https://github.com/anismegdiche/metal-server/commit/95bd57eaaf093eb0c89602d64327e6f5ceb016a7))
* handle potential null in pattern matching and improve regex mock implementation ([9fdc6f1](https://github.com/anismegdiche/metal-server/commit/9fdc6f1ffaa1c15f750d12e5d3a025cdf65bb2f5))
* handle potential null value for wsResp in SoapWebService ([ee5afe9](https://github.com/anismegdiche/metal-server/commit/ee5afe9d7b33111f9fc246d05f4e496a92e107e2))
* improve Disconnect method to handle undefined connection and log disconnection ([7c70b1f](https://github.com/anismegdiche/metal-server/commit/7c70b1f8595b9b9bfd670529dc2c2fa88ee32821))
* improve error message for missing XML data path and test fixing ([04fac4f](https://github.com/anismegdiche/metal-server/commit/04fac4ff29c4de9cc80320e04d139da79ff690f6))
* increase timeout for TensorFlowJs tests to ensure stability ([e3f5ee4](https://github.com/anismegdiche/metal-server/commit/e3f5ee4f6eb80cc8fbb7eb89c963a50fd7539fe1))
* missing Logger.LogFunction ([0feee74](https://github.com/anismegdiche/metal-server/commit/0feee7497de28d3cd1384a23150cd50a9ccecea9))
* Mutex and Semaphore classes usage ([c42f65b](https://github.com/anismegdiche/metal-server/commit/c42f65beab9c003f08dba0f3c948d3583fa59a96))
* refactor sorting implementation to use object notation for sort parameters across multiple files ([fdf2a2d](https://github.com/anismegdiche/metal-server/commit/fdf2a2d7b0a61e3995846d9e1d00bbfbf962abec))
* remove Node.js 22.14.0 from CI matrix ([f5eecc8](https://github.com/anismegdiche/metal-server/commit/f5eecc8fef4d3e9385456161688fbcacdb7ca73e))
* remove outdated Node.js version from CI matrix ([7fe5f5b](https://github.com/anismegdiche/metal-server/commit/7fe5f5bd20c9259d895e05b6146bcb97a07b2a5f))
* rename newUUID to newUuid for consistency ([4c335df](https://github.com/anismegdiche/metal-server/commit/4c335dfaf0e377b8a92f13b7b7390f432a37b4a0))
* SQLhelper Tokenizer ([54636fc](https://github.com/anismegdiche/metal-server/commit/54636fc09ad101872c252a0c4a609219da157fbd))
* SqlQueryHelper Tokenize ([69a6c44](https://github.com/anismegdiche/metal-server/commit/69a6c4422d9082aed1694ae97b15f89a1ff76982))
* update changelog generation date to reflect 0.4 commits ([3d9b8ec](https://github.com/anismegdiche/metal-server/commit/3d9b8ece3cf581ab1ea32704f815696d7e2ce81c))
* update error message in PlaceHolder class for clarity ([9690e63](https://github.com/anismegdiche/metal-server/commit/9690e63db167713ecd2414c35a866ba919d93f52))
* update expected DataTable name in tests and correct authentication initialization ([e4c9414](https://github.com/anismegdiche/metal-server/commit/e4c94141bda403cc98a942950596e1c8801e689c))
* update Plan class to use entity-specific locks and improve initialization logic ([bb81e61](https://github.com/anismegdiche/metal-server/commit/bb81e61d43bd5dfc441c7aba39b209c1ad4cc7cf))
* update ProviderName initialization to handle optional DATA_PROVIDER ([2a7e277](https://github.com/anismegdiche/metal-server/commit/2a7e2771abbe089b5b8a2f5f58605a2da2c75928))
* update regex for JS code evaluation and add test for multiple evaluations in a string ([4f81c36](https://github.com/anismegdiche/metal-server/commit/4f81c36bc67074d7b61a25f1e7a5e62377690267))
* update role permissions pattern to prevent duplicate characters ([c850455](https://github.com/anismegdiche/metal-server/commit/c85045588a583152822b064b76b494a5b5a0f70d))
* update SqlQueryHelper method calls to use function syntax ([b19c5c6](https://github.com/anismegdiche/metal-server/commit/b19c5c66c208f7bc1d2d0e9c1dc1fdfedbf9332c))
* update sync.yml paths to include trailing slashes ([f45f73c](https://github.com/anismegdiche/metal-server/commit/f45f73c0f15ddfe23d83baf5a7aae786283272cd))
* update test execution method in Docker step to use direct Docker run command ([99ea6b3](https://github.com/anismegdiche/metal-server/commit/99ea6b3445bb46a7189f3c103a36b828d3194340))
* update test execution method in Docker step to use Docker Compose ([45574bc](https://github.com/anismegdiche/metal-server/commit/45574bc0ab8f8df4db51efbedcf81677f20d7883))
* update test scripts to match new test file structure ([9e9ba0b](https://github.com/anismegdiche/metal-server/commit/9e9ba0b47c27aae5fd9609cbfe9c73d36aa7a38d))
* validate sort format in RequestToSchemaRequest and update tests to use object notation ([b1605c4](https://github.com/anismegdiche/metal-server/commit/b1605c4cfd2c8e31e8d288ccc48e7573c393458c))


### Features

* add Azure Data Lake Storage support to StorageProvider ([037911f](https://github.com/anismegdiche/metal-server/commit/037911f368199131cb721e0d290d08c85e6db90d))
* Add Azure File Storage support and update StorageProvider ([e9520aa](https://github.com/anismegdiche/metal-server/commit/e9520aa8c7bb71a83f8edad6c5a25a60ad253bb7))
* Add Azure File Storage support to changelog ([27af7b9](https://github.com/anismegdiche/metal-server/commit/27af7b942b6c60e2eb6d94468343a7c3f798ced4))
* add CI workflow for automated testing and builds ([061125a](https://github.com/anismegdiche/metal-server/commit/061125a0522c470ce382d8eaaed1cbab09b9ebf2))
* add configuration file and .env support; update package versions ([7ed9034](https://github.com/anismegdiche/metal-server/commit/7ed90348b4234a166035947b5f402c266e8314c4))
* Add Cosmos DB data provider support ([3679712](https://github.com/anismegdiche/metal-server/commit/3679712c4b7ef445911b98164724d6a1bef74715))
* add CPU core count retrieval to server class ([009c92e](https://github.com/anismegdiche/metal-server/commit/009c92e5694f28231144597f0cdd3005378aceb1))
* add DecoratorHelper for parameter extraction and updated SynchronizerManager ([1992fc0](https://github.com/anismegdiche/metal-server/commit/1992fc0ddae1af6510f25dea896540622463eb58))
* add default authentication provider configuration ([6103c8c](https://github.com/anismegdiche/metal-server/commit/6103c8ce97605318ba746553e9b08173b0b044f3))
* add default configuration for SqlServerData and merge with sourceConfig ([a9239f1](https://github.com/anismegdiche/metal-server/commit/a9239f1aa26b35369178ebcc67ac182ba3fc7c0e))
* add fields value escape functionality ([a5feecb](https://github.com/anismegdiche/metal-server/commit/a5feecba8a5b545d85f87d6605a06186d41723e7))
* Add FromBuffer method to ReadableHelper for converting Buffer to Readable stream ([f9761e4](https://github.com/anismegdiche/metal-server/commit/f9761e46589fa1b4fdbf5ce826223f70bce2ce90))
* add GitHub Actions workflow to sync documentation from metal-server ([1be4ed9](https://github.com/anismegdiche/metal-server/commit/1be4ed9a76f75f7ee97fb67e8dc935b9b73a5a8f))
* add initialization method for schedules and improve job logging ([2b69c15](https://github.com/anismegdiche/metal-server/commit/2b69c15014c5b080731d42697989180599116259))
* add object-path dependency and enhance JsonHelper methods for improved JSON handling ([6bb35a3](https://github.com/anismegdiche/metal-server/commit/6bb35a30b84ad43b13497de222df87b218e4a709))
* add optional response-chunk property to TConfig type ([0587ddb](https://github.com/anismegdiche/metal-server/commit/0587ddbfdf15ab26d743ffc335942d680d3837a6))
* add PrefixKeys method to JsonHelper for key prefixing in objects ([7aa0043](https://github.com/anismegdiche/metal-server/commit/7aa00431f7bb9830455f430c5d9db3027628b3a0))
* add ReplaceStrings method to JsonHelper for string replacement in JSON objects ([1f18ec9](https://github.com/anismegdiche/metal-server/commit/1f18ec9ffe710551b5b5adb2f124526ce34e0f05))
* add REST API definitions for user login and customer management in Northwind schema ([c392b21](https://github.com/anismegdiche/metal-server/commit/c392b21aacc1e249a3a9c93b6d0f43f32813c5d4))
* add SMB storage provider and related configurations ([8103b41](https://github.com/anismegdiche/metal-server/commit/8103b41cf9b5dc8f0fa0a49a4e8a262b55bc5145))
* add SMB/CIFS storage type to data providers configuration ([87b72fc](https://github.com/anismegdiche/metal-server/commit/87b72fccd0b45db37a5f3b4e31f621addd0fd582))
* add sync configuration for metl-docs ([379b6f7](https://github.com/anismegdiche/metal-server/commit/379b6f74c0732d53f2ea26deb435a1661cc21de0))
* add Synchronizer and SynchronizerManager classes for managing concurrent executions ([e780191](https://github.com/anismegdiche/metal-server/commit/e780191abdf20545d5291994711decc68a3e1ed0))
* add test execution step to CI workflow ([588fa3f](https://github.com/anismegdiche/metal-server/commit/588fa3f370444279573cd206d0e3ad4c5db29c44))
* add ToString method to StringHelper for flexible value conversion ([9693271](https://github.com/anismegdiche/metal-server/commit/96932715f310e7f1f253212974d102ffbb279fac))
* added Lock for Cache ([9912560](https://github.com/anismegdiche/metal-server/commit/99125609c480b050b1d031bdd8a63089a309a76b))
* enhance Config tests with role randomization ([917bb99](https://github.com/anismegdiche/metal-server/commit/917bb99d126844d63da5829cf5b39d97978db274))
* enhance JsonContent and XmlContent to support type-safe path evaluation and add new configuration options ([40e0876](https://github.com/anismegdiche/metal-server/commit/40e08765bb8ca03b047b5240ead2ffb42a4fbc05))
* enhance RestWebService with improved error handling and add ListEntities method ([9383c53](https://github.com/anismegdiche/metal-server/commit/9383c539e251b27ad83d9b22e5c90300102dddb8))
* enhance Sandbox class with improved code validation and utility functions ([8494725](https://github.com/anismegdiche/metal-server/commit/84947257a3c9a4a7d78eeafc87c865e6aca7bf3f))
* enhance Semaphore class with logging for Acquire and Release methods ([e353a8e](https://github.com/anismegdiche/metal-server/commit/e353a8e0bf50df6bf0d245a50b40c4d818a74791))
* enhance SynchronizerManager with parameter filtering in Synchronized decorator ([338f061](https://github.com/anismegdiche/metal-server/commit/338f061b289244e155d82f99ff5069f409306de4))
* enhance Where method to support customizable escape characters ([d18a46d](https://github.com/anismegdiche/metal-server/commit/d18a46d50881084c8f24933b2b03651e8b376743))
* enhance XlsContent tests ([b1207cc](https://github.com/anismegdiche/metal-server/commit/b1207cc587b1637dfb941df8a996c84f31467d83))
* enhance XlsContent to support type-safe parameter evaluation and default configuration ([d389328](https://github.com/anismegdiche/metal-server/commit/d38932810c2ee4e826cd6a82b7d2e07719c99b1d))
* extend TContext type with additional options for data handling and filtering ([c6ba6d8](https://github.com/anismegdiche/metal-server/commit/c6ba6d834208a595df06cffc5262860e787d3e10))
* Implement Amazon S3 storage provider with configuration and CRUD operations ([d4ccac4](https://github.com/anismegdiche/metal-server/commit/d4ccac42bc84e30287a8c4bf5c975dac6b16b7e3))
* implement Queue class for managing asynchronous tasks ([b737ffc](https://github.com/anismegdiche/metal-server/commit/b737ffc106bdf6853cd482158429a35e96b80bac))
* integrate SynchronizerManager for Select method synchronization in data provider classes ([ced5f39](https://github.com/anismegdiche/metal-server/commit/ced5f39603da24d7057019d7bafb6dc427c6452b))
* integrate type-safe parameter evaluation in CsvContent for improved CSV parsing and serialization ([48ace1b](https://github.com/anismegdiche/metal-server/commit/48ace1b7c32921cdb49e86dc76f55ad0101965dd))
* introduce Plans class for plan management and update Config to initialize plans ([1bffc7e](https://github.com/anismegdiche/metal-server/commit/1bffc7ebf11695f94d8257a94bc457d67f597d37))
* simplify GetCache method by removing unnecessary context parameter ([fb13838](https://github.com/anismegdiche/metal-server/commit/fb13838bcb3c4a6bd8782e23a00cea5e9f8b018c))
* Synchronized across data provider classes ([16ef630](https://github.com/anismegdiche/metal-server/commit/16ef630c094515365938145514a5ba478390c79c))
* Update Azure Data Lake Storage integration ([c2c1805](https://github.com/anismegdiche/metal-server/commit/c2c18058dedd19bfb71d13255fa804b2ac5b69d6))
* Update changelog and documentation for Amazon S3 storage support and Azure File Storage ([8ae9c5d](https://github.com/anismegdiche/metal-server/commit/8ae9c5dfb0ca57131f6988d2229a73faaca82942))
* update CI workflow to install typia and compile TypeScript ([159f21c](https://github.com/anismegdiche/metal-server/commit/159f21c0dedb1c8c2cc9a0a5412782bb1acdf0ed))
* update Logger to use colorette for color formatting and add Assert method with error handling ([c6f9874](https://github.com/anismegdiche/metal-server/commit/c6f987487b780f48de951739be0a85f0106fbba4))
* update SynchronizerManager to use parameter filtering in Select methods across data provider classes ([6e42416](https://github.com/anismegdiche/metal-server/commit/6e4241661fdb5e4d495ee93856ee7f45267a411a))

# Metal Changelog

## Version 0.4 - TBD, 2025

### Features

- Data Provider: Added WebServices support (REST, SOAP)
- Extended Javascript Expression engine
- Added Context variables
- Added Field Escape Engine
- File Content: added support for XML files
- Added OpenID Connect Provider for authentication
- Introduced data chunking via response-chunk config
- Storage Provider: added SMB storage support
- Storage Provider: added Azure File Storage support
- Storage Provider: added Amazon S3 storage support
- Storage Provider: added Azure DataLake Gen2 storage support
- Data Provider: added CosmosDB support

### Enhancements

- Refactored Cache feature response, and logic
- Enhanced schema response concurrency
- Refactored DataProvider classes for better abstraction
- Refactored Schema class
- Improved structure and readability
- Aligned code with SOLID principles
- Updated package scripts and CI steps
- Enhanced end-to-end test coverage for providers
- Improved filter/field handling in MongoDb provider
- Enhanced sandbox for better context support and code safety
- Packages optimization
- Enhanced XLSX support

### Bug Fixes

- Fixed server error handler HTTP status code issues
- Fixed various logging functions
- Fixed empty role handling
- Addressed bugs in CsvContent.Params.quoteChar functionality
- Corrected issues with FsStorage
- Corrected config.yml file version 0.3 handling
- Fixed Plan locking and initialization issues
- Corrected evaluation bypass in CacheData
- Fixed data source initialization order and errors
- Corrected role pattern formatting to prevent duplication
- Resolved error in PlaceHolder variable retrieval
- Fixed test failures related to expected output and context usage
- Addressed incorrect cache schema interception
- Resolved mutex/semaphore bugs
- Fixed config sample mismatches
- Fixed sort types mismatch

---

## Version 0.3 - November 14, 2024

### ⚠️ Breaking Changes
- Updated to Node.js v22.10.0 for improved performance and security.
- Parameter `sourceName` changed to `source`
- Parameter `entityName` changed to `entity`
- Parameter `schemaName` changed to `schema`
- Parameter `planName` changed to `plan`
- Parameter `leftField` changed to `left-field`
- Parameter `rightField` changed to `right-field`
- Parameter `filterExpression` changed to `filter-expression`
- Parameter `autoCreate` changed to `autocreate`
- File Provider:
    - Changed `contentType` → `content` (Now supports multiple content type for the same storage, which may cause changes in behavior for existing configuration).
    - Changed `storageType` → `storage`.
    - Changed `fileSystem` storage → `fs`.
    - Changed Parameter `fsFolder` → `fs-folder`.
    - Changed `azureBlob` storage → `az-blob`.
    - Changed Parameter `azureBlobConnectionString` → `az-blob-connection-string`.
    - Changed Parameter `azureBlobContainerName` → `az-blob-container`.
    - Changed Parameter `azureBlobCreateContainerIfNotExists` → `az-blob-autocreate`.
    - Changed Parameter `jsonArrayPath` → `json-array`.
    - Changed Parameter `csvDelimiter` → `csv-delimiter`.
    - Changed Parameter `csvNewline` → `csv-newline`.
    - Changed Parameter `csvHeader` → `csv-header`.
    - Changed Parameter `csvQuoteChar` → `csv-quote`.
    - Changed Parameter `csvSkipEmptyLines` → `csv-skip-empty`.
- Plan sync function parameters have changed:
  - `source` → `from`
  - `destination` → `to`
  - `on` → `id`

### Features
- Response configuration: chunk, rate limit, body limit.
- Plan commands: anonymize, remove-duplicates.
- SwaggerUI.
- Schema: List entities.
- File Provider: FTP.
- File Content: XLSX.
- Role Based Access Control.

### Enhancements
- Updated packages.
- Updated Config file validation.
- Updated Plan sync function usage.
- Enhanced Authentication.
- Enhanced Logging feature.
- Enhanced MongoDb filter expression.
- Enhanced Tessract.js Engine.
- Enhanced File Provider (now supports multiple content types in the same storage).

### Bug Fixes
- Fixed bugs related to Plan commands.
- Fixed bugs related to File Provider.

---
# Metal Changelog

## Version 0.2 - March 01, 2024

### Features
- DataProvider: Azure SQL Database, File, Memory and Metal cross.
- File storage: Local filesystem, Azure Blob
- File Content: JSON, CSV.
- Plan commands: sync.
- JS code in DataProvider options.

### Enhancements
- Improved MS SQL Server DataProvider.
- Updated Logging Feature.
- Updated packages.

### Bug Fixes
- Fixed bugs related to Plan commands.

---
## Version 0.1 - January 12, 2024

### Features
- User authentication
- REST API: user (authentication), schema (CRUD operations), cache (view/purge/clean), plan (start/stop)
- DataProvider: PostgreSQL, MS SQL Server, MongoDB and Plan.
- DataProvider Options: filter, filterExpression, fields, data, sort, cache.
- Plan Feature and commands: select, update, delete, insert, join (left, right, inner, fullOuter, cross), break, fields, sort, run, debug.
- Scheduling Feature with cron syntax
- AI Engine Feature: Tesseract.JS, TensorFlow.JS and NLP.JS
- Configuration Validator
- Console logging
