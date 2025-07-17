import { CosmosDbHelper } from "../providers/CosmosDbHelper";


// mock related classes
jest.mock('../FilesData', () => ({
    FilesData: {}
}))
jest.mock('../MemoryData', () => ({
    MemoryData: {}
}))
jest.mock('../WebServiceData', () => ({
    WebServiceData: {}
}))
jest.mock('../MetalData', () => ({
    MetalData: {}
}))
jest.mock('../MongoDbData', () => ({
    MongoDbData: {}
}))
jest.mock('../MySqlData', () => ({
    MySqlData: {}
}))
jest.mock('../../plan/Step', () => ({
    Step: {}
}))
jest.mock('../PlanData', () => ({
    PlanData: {}
}))
jest.mock('../PostgresData', () => ({
    PostgresData: {}
}))
jest.mock('../SqlServerData', () => ({
    SqlServerData: {}
}))
jest.mock('../CosmosDbData', () => ({
    CosmosDbData: {}
}))
jest.mock('../FolderData', () => ({
    FolderData: {}
}))

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
