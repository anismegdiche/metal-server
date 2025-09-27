import { CosmosDbHelper } from "../providers/CosmosDbHelper";


// mock related classes
jest.mock('../providers/StorageData', () => ({ StorageData: {} }))
jest.mock('../providers/MemoryData', () => ({ MemoryData: {} }))
jest.mock('../providers/WebServiceData', () => ({ WebServiceData: {} }))
jest.mock('../providers/MetalData', () => ({ MetalData: {} }))
jest.mock('../providers/MongoDbData', () => ({ MongoDbData: {} }))
jest.mock('../providers/MySqlData', () => ({ MySqlData: {} }))
jest.mock('../../plan/Step', () => ({ Step: {} }))
jest.mock('../providers/PlanData', () => ({ PlanData: {} }))
jest.mock('../providers/PostgresData', () => ({ PostgresData: {} }))
jest.mock('../providers/SqlServerData', () => ({ SqlServerData: {} }))
jest.mock('../providers/CosmosDbData', () => ({ CosmosDbData: {} }))

describe('CosmoDbHelper', () => {
    describe('ParseSqlQuery', () => {
        it('should throw error for empty SQL query', () => {
            const sqlQuery = undefined;
            expect(() => CosmosDbHelper.ParseSqlQuery(sqlQuery)).toThrow(/Empty SQL Query/);
        });

        it('should add c. prefix to variables without it', () => {
            const sqlQuery = "SELECT name , category FROM c WHERE name = 'test'";
            const expected = "SELECT c.name , c.category FROM c WHERE c.name = 'test'";
            expect(CosmosDbHelper.ParseSqlQuery(sqlQuery)).toBe(expected);
        });

        it('should preserve variables that already have c. prefix', () => {
            const sqlQuery = "SELECT c.name , c.category FROM c WHERE c.name = 'test'";
            const expected = "SELECT c.name , c.category FROM c WHERE c.name = 'test'";
            expect(CosmosDbHelper.ParseSqlQuery(sqlQuery)).toBe(expected);
        });

        it('should handle multiple variables in a single token', () => {
            const sqlQuery = "SELECT name , category FROM c WHERE name = 'test'";
            const expected = "SELECT c.name , c.category FROM c WHERE c.name = 'test'";
            expect(CosmosDbHelper.ParseSqlQuery(sqlQuery)).toBe(expected);
        });

        it('should preserve SQL commands and strings', () => {
            const sqlQuery = "SELECT name FROM c WHERE name LIKE 'Mountain%'";
            const expected = "SELECT c.name FROM c WHERE c.name LIKE 'Mountain%'";
            expect(CosmosDbHelper.ParseSqlQuery(sqlQuery)).toBe(expected);
        });
    });

    // it('test', () => {
    //     const query = "SELECT name,category FROM c WHERE name = 'test,A'"
    //     const expected = [
    //         "SELECT",
    //         "name",
    //         ",",
    //         "category",
    //         "FROM",
    //         "c",
    //         "WHERE",
    //         "name",
    //         "=",
    //         "'test,A'",
    //     ]

    //     const tokens = _.chain(query.match(/(?:'[^']*'|[^,\s]+|,)/g))
    //         .map(_.trim)
    //         .compact()
    //         .value()

    //     expect(tokens).toEqual(expected)
    // })
});
