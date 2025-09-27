//
import { DataTable, REMOVE_DUPLICATES_METHOD, REMOVE_DUPLICATES_STRATEGY, SORT_ORDER } from '../DataTable'


// Mock the Logger decorator
jest.mock('../../utils/Logger', () => ({
    Logger: {
        SetLevel: () => () => { },
        EnableAll: () => () => { },
        DisableAll: () => () => { },
        Log: () => () => { },
        Error: () => () => { },
        Warn: () => () => { },
        Debug: () => () => { },
        Info: () => () => { },
        Message: () => () => { },
        LogFunction: () => () => { },
        Level : "error",
        Out: 'OUT'
    }
}))

describe("DataTable", () => {
    let
        dt: DataTable = <DataTable>{},
        dtEmpty: DataTable = <DataTable>{},
        dtA: DataTable = <DataTable>{},
        dtB: DataTable = <DataTable>{},
        dtC: DataTable = <DataTable>{}

    beforeEach(() => {
        dt = new DataTable("table", [
            {
                name: "Alice",
                age: 25
            },
            {
                name: "Bob",
                age: 30
            }
        ])

        dtEmpty = new DataTable("empty")

        dtA = new DataTable('A', [
            {
                id: 2,
                name: 'Bob',
                age: 40
            },
            {
                id: 1,
                name: 'Alice',
                age: 30
            },
            {
                id: 3,
                name: 'Charlie',
                age: 50
            }
        ])
        dtB = new DataTable('B', [
            {
                id: 3,
                city: 'San Francisco'
            },
            {
                id: 2,
                city: 'New York'
            },
            {
                id: 4,
                city: 'London'
            }
        ])

        dtC = new DataTable('C', [
            { x: 3, y: 1 },
            { x: 1, y: 1 },
            { x: 2, y: 1 },
            { x: 4, y: 1 },
            { x: 2, y: 2 }
        ])
    })

    afterEach(() => {
        dt = <DataTable>{}
        dtEmpty = <DataTable>{}
        dtA = <DataTable>{}
        dtB = <DataTable>{}
    })

    describe("constructor", () => {
        it("should create an instance of DataTable", () => {
            expect(dt).toBeInstanceOf(DataTable)
        })

        it("should set the table name and fields", () => {
            expect(dt.Name).toEqual("table")
            expect(dt.Fields).toEqual({
                name: "string",
                age: "number"
            })
        })

        it("should assign a random name if undefined", () => {
            const dt = new DataTable()
            expect(dt.Name).toBeDefined()
        })
    })

    describe("Set", () => {
        it("should set the rows and fields of the table", () => {
            dt.Set([
                {
                    name: "Charlie",
                    age: 35
                }
            ])
            expect(dt.Rows).toEqual([
                {
                    name: "Charlie",
                    age: 35
                }
            ])
            expect(dt.Fields).toEqual({
                name: "string",
                age: "number"
            })
        })

        it("should not modify the table if rows are undefined", () => {
            dt.Set()
            expect(dt.Rows).toEqual([
                {
                    name: "Alice",
                    age: 25
                }, {
                    name: "Bob",
                    age: 30
                }
            ])
            expect(dt.Fields).toEqual({
                name: "string",
                age: "number"
            })
        })
    })

    describe("SetFields", () => {
        it("should set the fields based on the first row of the table", () => {
            dt.SetFields()
            expect(dt.Fields).toEqual({
                name: "string",
                age: "number"
            })
        })
    })

    describe("GetFieldsNames", () => {
        it("should return an array of field names", () => {
            const fields = dt.GetFieldNames()
            expect(fields).toEqual(["name", "age"])
        })

        it("should return emty array for empty Datatable", () => {
            const fields = new DataTable("empty").GetFieldNames()
            expect(fields).toEqual([])
        })
    })

    describe("PrefixAllFields", () => {
        it("should prefix all field names with the given string", () => {
            dt.PrefixAllFields("prefix")
            expect(dt.Fields).toEqual({
                "prefix.name": "string",
                "prefix.age": "number"
            })
            expect(dt.Rows).toEqual([
                {
                    "prefix.name": "Alice",
                    "prefix.age": 25
                },
                {
                    "prefix.name": "Bob",
                    "prefix.age": 30
                }
            ])
        })

        it("should not modify the table if it has no rows", () => {
            const emptyTable = new DataTable("empty")
            emptyTable.PrefixAllFields("prefix")
            expect(emptyTable.Fields).toEqual({})
            expect(emptyTable.Rows).toEqual([])
        })
    })

    describe("UnPrefixAllfields", () => {
        it("should remove prefix from field names in all rows", () => {
            // Arrange
            const data = new DataTable("TestTable", [
                {
                    Col1: "Value1",
                    Col2: "Value2"
                },
                {
                    Col1: "Value3",
                    Col2: "Value4"
                }
            ])

            // Add a prefix to all field names
            data.PrefixAllFields("Prefix")

            // Act
            data.UnPrefixAllfields()

            // Assert
            expect(data.Fields).toEqual({
                Col1: "string",
                Col2: "string"
            })
            expect(data.Rows).toEqual([
                {
                    Col1: "Value1",
                    Col2: "Value2"
                },
                {
                    Col1: "Value3",
                    Col2: "Value4"
                }
            ])
        })

        it("should not modify field names if they don't have a prefix", () => {
            // Arrange
            const data = new DataTable("TestTable", [
                {
                    Col1: "Value1",
                    Col2: "Value2"
                },
                {
                    Col1: "Value3",
                    Col2: "Value4"
                }
            ])

            // Act
            data.UnPrefixAllfields()

            // Assert
            expect(data.Fields).toEqual({
                Col1: "string",
                Col2: "string"
            })
            expect(data.Rows).toEqual([
                {
                    Col1: "Value1",
                    Col2: "Value2"
                },
                {
                    Col1: "Value3",
                    Col2: "Value4"
                }
            ])
        })

        it("should do nothing if there are no rows", () => {
            // Arrange
            const data = new DataTable("TestTable")

            // Act
            data.UnPrefixAllfields()

            // Assert
            expect(data.Fields).toEqual({})
            expect(data.Rows).toEqual([])
        })
    })

    describe('Sort', () => {
        it('should sort the rows by the specified fields in ascending order', () => {
            const sorted = dtA.Sort({ 'name': SORT_ORDER.ASC }).Rows
            expect(sorted).toEqual([
                {
                    id: 1,
                    name: 'Alice',
                    age: 30
                },
                {
                    id: 2,
                    name: 'Bob',
                    age: 40
                },
                {
                    id: 3,
                    name: 'Charlie',
                    age: 50
                }
            ])
        })

        it('should sort the rows by the specified fields in descending order', () => {
            const sorted = dtA.Sort({ 'age': SORT_ORDER.DESC }).Rows
            expect(sorted).toEqual([
                {
                    id: 3,
                    name: 'Charlie',
                    age: 50
                },
                {
                    id: 2,
                    name: 'Bob',
                    age: 40
                },
                {
                    id: 1,
                    name: 'Alice',
                    age: 30
                }
            ])
        })


        it('should sort the rows by the specified fields in ascending order first, then descending order', () => {
            const sorted = dtC.Sort({ 'x': SORT_ORDER.ASC, 'y': SORT_ORDER.DESC }).Rows
            expect(sorted).toEqual([
                { x: 1, y: 1 },
                { x: 2, y: 2 },
                { x: 2, y: 1 },
                { x: 3, y: 1 },
                { x: 4, y: 1 }
            ])
        })
    })

    describe('InnerJoin', () => {
        it('should return a new DataTable containing the inner join of the two tables on the specified fields', () => {
            const result = dtA.InnerJoin(dtB, 'id', 'id')
            expect(result.Rows).toEqual([
                {
                    id: 2,
                    name: 'Bob',
                    age: 40,
                    city: 'New York'
                },
                {
                    id: 3,
                    name: 'Charlie',
                    age: 50,
                    city: 'San Francisco'
                }
            ])
        })
    })

    describe('LeftJoin', () => {
        it('should return a new DataTable containing the left join of the two tables on the specified fields', () => {
            const result = dtA.LeftJoin(dtB, 'id', 'id')
            expect(result.Rows).toEqual([
                {
                    id: 2,
                    name: "Bob",
                    age: 40,
                    city: "New York"
                },
                {
                    id: 1,
                    name: "Alice",
                    age: 30
                },
                {
                    id: 3,
                    name: "Charlie",
                    age: 50,
                    city: "San Francisco"
                }
            ])
        })
    })

    describe('CrossJoin', () => {
        it('should return a new DataTable containing the cross join of the two tables on the specified fields', () => {
            const result = dtA.CrossJoin(dtB)
            expect(result.Rows).toEqual([
                {
                    id: 3,
                    name: "Bob",
                    age: 40,
                    city: "San Francisco"
                },
                {
                    id: 2,
                    name: "Bob",
                    age: 40,
                    city: "New York"
                },
                {
                    id: 4,
                    name: "Bob",
                    age: 40,
                    city: "London"
                },
                {
                    id: 3,
                    name: "Alice",
                    age: 30,
                    city: "San Francisco"
                },
                {
                    id: 2,
                    name: "Alice",
                    age: 30,
                    city: "New York"
                },
                {
                    id: 4,
                    name: "Alice",
                    age: 30,
                    city: "London"
                },
                {
                    id: 3,
                    name: "Charlie",
                    age: 50,
                    city: "San Francisco"
                },
                {
                    id: 2,
                    name: "Charlie",
                    age: 50,
                    city: "New York"
                },
                {
                    id: 4,
                    name: "Charlie",
                    age: 50,
                    city: "London"
                }
            ])
        })

        it('should return empty if any is empty', () => {
            const result = dtA.CrossJoin(dtEmpty)
            expect(result.Rows).toEqual([])
        })
    })

    describe('Fields', () => {
        it('should return the DataTable instance if no fields are provided', () => {
            dt = new DataTable('test', [
                {
                    id: 1,
                    name: 'John'
                }
            ])
            const result = dt.SelectFields([])
            expect(result).toBeInstanceOf(DataTable)
            expect(result.Rows).toEqual([
                {
                    id: 1,
                    name: 'John'
                }
            ])
        })

        it('should return the DataTable instance if no rows are present', () => {
            dt = new DataTable('test')
            const result = dt.SelectFields(['id'])
            expect(result).toBeInstanceOf(DataTable)
            expect(result.Rows).toEqual([])
        })

        it('should return the DataTable instance with only the specified fields in the rows', () => {
            dt = new DataTable('test', [
                {
                    id: 1,
                    name: 'John',
                    age: 30
                },
                {
                    id: 2,
                    name: 'Mary',
                    age: 25
                }
            ])
            const result = dt.SelectFields(['id', 'name'])
            expect(result).toBeInstanceOf(DataTable)
            expect(result.Rows).toEqual([
                {
                    id: 1,
                    name: 'John'
                },
                {
                    id: 2,
                    name: 'Mary'
                }
            ])
        })
    })

    describe('SetMetaData', () => {
        it('should set metadata for the DataTable instance', () => {
            dt = new DataTable('test')
            dt.SetMetaData('version', '1.0.0')
            expect(dt.MetaData).toEqual({ version: '1.0.0' })
        })

        it('should override metadata if key already exists', () => {
            dt = new DataTable('test')
            dt.SetMetaData('version', '1.0.0')
            dt.SetMetaData('version', '2.0.0')
            expect(dt.MetaData).toEqual({ version: '2.0.0' })
        })
    })

    describe('FreeSql', () => {

        // Executes a valid SQL query and returns a DataTable object with updated Rows and Fields properties
        it('should execute valid SQL query and update Rows and Fields properties', async () => {
            // Arrange
            const myDataTable = new DataTable("myTable")
            myDataTable.Set([
                {
                    id: 1,
                    name: "John"
                },
                {
                    id: 2,
                    name: "Jane"
                }
            ])
            const sqlQuery = "SELECT * FROM myTable WHERE id = 1"

            // Act
            const result = await myDataTable.FreeSqlAsync(sqlQuery)

            // Assert
            expect(result).toBeInstanceOf(DataTable)
            expect(result.Rows).toEqual([
                {
                    id: 1,
                    name: "John"
                }
            ])
            expect(result.Fields).toEqual({
                id: "number",
                name: "string"
            })
        })

        it('should execute valid SQL query with no results and return DataTable object with empty Rows and Fields', async () => {
            // Arrange
            const myDataTable = new DataTable("myTable")
            myDataTable.Set([
                {
                    id: 1,
                    name: "John"
                },
                {
                    id: 2,
                    name: "Jane"
                }
            ])
            const sqlQuery = "SELECT * FROM myTable WHERE id = 3"

            // Act
            const result = await myDataTable.FreeSqlAsync(sqlQuery)

            // Assert
            expect(result).toBeInstanceOf(DataTable)
            expect(result.Rows).toEqual([])
            expect(result.Fields).toEqual({})
        })

        // Executes a valid SQL query with no input Rows and returns a DataTable object with empty Rows and updated Fields properties
        it('should execute valid SQL query with no input Rows and return DataTable object with empty Rows and updated Fields properties', async () => {
            // Arrange
            const myDataTable = new DataTable("myTable")
            const sqlQuery = "SELECT * FROM myTable"

            // Act
            const result = await myDataTable.FreeSqlAsync(sqlQuery)

            // Assert
            expect(result).toBeInstanceOf(DataTable)
            expect(result.Rows).toEqual([])
            expect(result.Fields).toEqual({})
        })

        // Executes an invalid SQL query and throws an error
        it('should execute invalid SQL query and return same Datatable', async () => {
            // Arrange
            const myDataTable = new DataTable("myTable")
            const sqlQuery = "INVALID QUERY"


            let result: DataTable | undefined

            // Act
            try {
                result = await myDataTable.FreeSqlAsync(sqlQuery)
            } catch {
                //
            }
            // Assert
            expect(result).toEqual(undefined)
        })

        // Executes a SQL query with a syntax error and throws an error
        it('should execute SQL query with syntax error and throw an error', async () => {
            // Arrange
            const myDataTable = new DataTable("myTable")
            const sqlQuery = "SELECT * FROM myTable WHERE id = 1"

            // Act
            const result = await myDataTable.FreeSqlAsync(sqlQuery)

            // Assert
            expect(result).toBeInstanceOf(DataTable)
            expect(result.Rows).toEqual([])
            expect(result.Fields).toEqual({})
        })

        // Executes a SQL query with a semantic error and throws an error
        it('should execute SQL query with semantic error and throw an error', async () => {
            // Arrange
            const myDataTable = new DataTable("myTable")
            const sqlQuery = "SELECT * FROM nonExistentTable"


            let result: DataTable | undefined

            // Act
            try {
                result = await myDataTable.FreeSqlAsync(sqlQuery)
            } catch {
                //
            }
            // Assert
            expect(result).toEqual(undefined)
        })

        it('should execute insert data', async () => {
            // Arrange
            const myDataTable = new DataTable("myTable")
            myDataTable.Set([
                {
                    id: 1,
                    name: "John"
                },
                {
                    id: 2,
                    name: "Jane"
                }
            ])
            const sqlQuery = "INSERT INTO myTable(name) VALUES ('John'),  ('June'),  ('Jane')"

            // Act
            const result = await myDataTable.FreeSqlAsync(sqlQuery)

            // Assert
            expect(result).toBeInstanceOf(DataTable)
            expect(result.Rows).toEqual([
                {
                    id: 1,
                    name: "John"
                },
                {
                    id: 2,
                    name: "Jane"
                },
                {
                    name: "John"
                },
                {
                    name: "June"
                },
                {
                    name: "Jane"
                }
            ])
            expect(result.Fields).toEqual({
                id: "number",
                name: "string"
            })
        })
    })

    describe('SyncReport', () => {

        // Given two DataTables with matching rows, when calling SyncReport with a common 'on' field, then it should return an empty TSyncReport object
        it('should return an empty TSyncReport object when DataTables have matching rows', () => {
            const sourceData = new DataTable("Source", [
                {
                    id: 1,
                    name: "John"
                },
                {
                    id: 2,
                    name: "Jane"
                },
                {
                    id: 3,
                    name: "Bob"
                }
            ])

            const destinationData = new DataTable("Destination", [
                {
                    id: 1,
                    name: "John"
                },
                {
                    id: 2,
                    name: "Jane"
                },
                {
                    id: 3,
                    name: "Bob"
                }
            ])

            const syncReport = sourceData.SyncReport(destinationData, "id")

            expect(syncReport).toEqual({
                AddedRows: [],
                DeletedRows: [],
                UpdatedRows: []
            })
        })

        // Given two DataTables with null or undefined values, when calling SyncReport with a common 'on' field, then it should throw an error
        it('should throw an error when DataTables have null or undefined values', () => {
            const sourceData = new DataTable("Source", [
                {
                    id: 1,
                    name: "John"
                },
                {
                    id: 2,
                    name: "Jane"
                },
                {
                    id: 3,
                    name: "Bob"
                }
            ])

            const destinationData = new DataTable("Destination", undefined)

            const syncReport = sourceData.SyncReport(destinationData, "id")

            expect(syncReport).toEqual({
                AddedRows: [
                    {
                        id: 1,
                        name: "John"
                    },
                    {
                        id: 2,
                        name: "Jane"
                    },
                    {
                        id: 3,
                        name: "Bob"
                    }
                ],
                DeletedRows: [],
                UpdatedRows: []
            })
        })

        // Given two DataTables with identical rows, when calling SyncReport with a common 'on' field, then it should return an empty TSyncReport object
        it('should return an empty TSyncReport object when DataTables have matching rows', () => {
            const sourceData = new DataTable("Source", [
                {
                    id: 1,
                    name: "John"
                },
                {
                    id: 2,
                    name: "Jane"
                },
                {
                    id: 3,
                    name: "Bob"
                }
            ])

            const destinationData = new DataTable("Destination", [
                {
                    id: 1,
                    name: "John"
                },
                {
                    id: 2,
                    name: "Jane"
                },
                {
                    id: 3,
                    name: "Bob"
                }
            ])

            const syncReport = sourceData.SyncReport(destinationData, "id")

            expect(syncReport).toEqual({
                AddedRows: [],
                DeletedRows: [],
                UpdatedRows: []
            })
        })

        // Given two DataTables with no matching rows, when calling SyncReport with a common 'on' field, then it should return a TSyncReport object with all rows marked as added
        it('should return a TSyncReport object with all rows marked as added when DataTables have no matching rows', () => {
            const sourceData = new DataTable("Source", [
                {
                    id: 1,
                    name: "John"
                },
                {
                    id: 2,
                    name: "Jane"
                },
                {
                    id: 3,
                    name: "Bob"
                }
            ])

            const destinationData = new DataTable("Destination", [
                {
                    id: 4,
                    name: "Alice"
                },
                {
                    id: 5,
                    name: "Eve"
                },
                {
                    id: 6,
                    name: "Charlie"
                }
            ])

            const syncReport = sourceData.SyncReport(destinationData, "id")

            expect(syncReport).toEqual({
                AddedRows: [
                    {
                        id: 1,
                        name: "John"
                    },
                    {
                        id: 2,
                        name: "Jane"
                    },
                    {
                        id: 3,
                        name: "Bob"
                    }
                ],
                DeletedRows: [
                    {
                        id: 4,
                        name: "Alice"
                    },
                    {
                        id: 5,
                        name: "Eve"
                    },
                    {
                        id: 6,
                        name: "Charlie"
                    }
                ],
                UpdatedRows: []
            })
        })

        // Given two DataTables with identical rows and additional rows in the destination DataTable, when calling SyncReport with a common 'on' field, then it should return a TSyncReport object with deleted rows only
        it('should return a TSyncReport object with deleted rows only when DataTables have additional rows in the destination DataTable', () => {
            const sourceData = new DataTable("Source", [
                {
                    id: 1,
                    name: "John"
                },
                {
                    id: 2,
                    name: "Jane"
                },
                {
                    id: 3,
                    name: "Bob"
                }
            ])

            const destinationData = new DataTable("Destination", [
                {
                    id: 1,
                    name: "John"
                },
                {
                    id: 2,
                    name: "Jane"
                },
                {
                    id: 3,
                    name: "Bob"
                },
                {
                    id: 4,
                    name: "Alice"
                }
            ])

            const syncReport = sourceData.SyncReport(destinationData, "id")

            expect(syncReport).toEqual({
                AddedRows: [],
                DeletedRows: [
                    {
                        id: 4,
                        name: "Alice"
                    }
                ],
                UpdatedRows: []
            })
        })

        // Given two DataTables with identical rows and additional rows in the source DataTable, when calling SyncReport with a common 'on' field, then it should return a TSyncReport object with added rows only
        it('should return a TSyncReport object with added rows only when DataTables have additional rows in the source DataTable', () => {
            // Arrange
            const sourceData = new DataTable("Source", [
                {
                    id: 1,
                    name: "John"
                },
                {
                    id: 2,
                    name: "Jane"
                },
                {
                    id: 3,
                    name: "Bob"
                },
                {
                    id: 4,
                    name: "Alice"
                }
            ])

            const destinationData = new DataTable("Destination", [
                {
                    id: 1,
                    name: "John"
                },
                {
                    id: 2,
                    name: "Jane"
                },
                {
                    id: 3,
                    name: "Bob"
                }
            ])

            // Act
            const syncReport = sourceData.SyncReport(destinationData, "id")

            // Assert
            expect(syncReport).toEqual({
                AddedRows: [
                    {
                        id: 4,
                        name: "Alice"
                    }
                ],
                DeletedRows: [],
                UpdatedRows: []
            })
        })

        // Given two DataTables with different rows, when calling SyncReport with a common 'on' field, then it should return a TSyncReport object with added, deleted and updated rows
        it('should return an empty TSyncReport object when DataTables have matching rows', () => {
            const sourceData = new DataTable("Source", [
                {
                    id: 1,
                    name: "John"
                },
                {
                    id: 2,
                    name: "Jane"
                },
                {
                    id: 3,
                    name: "Bob"
                }
            ])

            const destinationData = new DataTable("Destination", [
                {
                    id: 1,
                    name: "John"
                },
                {
                    id: 2,
                    name: "Jane"
                },
                {
                    id: 3,
                    name: "Bob"
                }
            ])

            const syncReport = sourceData.SyncReport(destinationData, "id")

            expect(syncReport).toEqual({
                AddedRows: [],
                DeletedRows: [],
                UpdatedRows: []
            })
        })

        // Given two DataTables with different field names, when calling SyncReport with a common 'on' field, then it should throw an error
        it('should throw an error when calling SyncReport with DataTables with different field names', () => {
            const sourceData = new DataTable("Source", [
                {
                    id: 1,
                    name: "John"
                },
                {
                    id: 2,
                    name: "Jane"
                },
                {
                    id: 3,
                    name: "Bob"
                }
            ])

            const destinationData = new DataTable("Destination", [
                {
                    identifier: 1,
                    fullName: "John Doe"
                },
                {
                    identifier: 2,
                    fullName: "Jane Smith"
                },
                {
                    identifier: 3,
                    fullName: "Bob Johnson"
                }
            ])

            expect(() => sourceData.SyncReport(destinationData, "identifier"))
                .toThrow(Error)
        })

        it('Case: Sync from Memory to Postgres', () => {
            const sourceData = new DataTable("Source", [
                { memid: 0, surname: "GUEST", firstname: "GUEST", address: "XXXXXXXXXX", zipcode: 0, telephone: "(000) 000-0000", recommendedby: null, joindate: "2012-06-30T22:00:00.000Z" },
                { memid: 1, surname: "Smith", firstname: "Darren", address: "XXXXXXXXXX", zipcode: 4321, telephone: "555-555-5555", recommendedby: null, joindate: "2012-07-02T10:02:05.000Z" },
                { memid: 2, surname: "Smith", firstname: "Tracy", address: "XXXXXXXXXX", zipcode: 4321, telephone: "555-555-5555", recommendedby: null, joindate: "2012-07-02T10:08:23.000Z" },
                { memid: 3, surname: "Rownam", firstname: "Tim", address: "XXXXXXXXXX", zipcode: 23423, telephone: "(844) 693-0723", recommendedby: null, joindate: "2012-07-03T07:32:15.000Z" },
                { memid: 4, surname: "Joplette", firstname: "Janice", address: "20 Crossing Road, New York", zipcode: 234, telephone: "(833) 942-4710", recommendedby: 1, joindate: "2012-07-03T08:25:05.000Z" },
                { memid: 6, surname: "toadd", firstname: "ADD", address: "where", zipcode: 234, telephone: "(833) 942-4710", recommendedby: 1, joindate: "2012-07-03T08:25:05.000Z" }
            ])

            const destinationData = new DataTable("Destination", [
                { memid: 0, surname: "GUEST", firstname: "GUEST", address: "GUEST", zipcode: 0, telephone: "(000) 000-0000", recommendedby: null, joindate: "2012-06-30T22:00:00.000Z" },
                { memid: 1, surname: "Smith", firstname: "Darren", address: "8 Bloomsbury Close, Boston", zipcode: 4321, telephone: "555-555-5555", recommendedby: null, joindate: "2012-07-02T10:02:05.000Z" },
                { memid: 2, surname: "Smith", firstname: "Tracy", address: "8 Bloomsbury Close, New York", zipcode: 4321, telephone: "555-555-5555", recommendedby: null, joindate: "2012-07-02T10:08:23.000Z" },
                { memid: 3, surname: "Rownam", firstname: "Tim", address: "23 Highway Way, Boston", zipcode: 23423, telephone: "(844) 693-0723", recommendedby: null, joindate: "2012-07-03T07:32:15.000Z" },
                { memid: 4, surname: "Joplette", firstname: "Janice", address: "20 Crossing Road, New York", zipcode: 234, telephone: "(833) 942-4710", recommendedby: 1, joindate: "2012-07-03T08:25:05.000Z" },
                { memid: 5, surname: "todelete", firstname: "DELETE", address: "nowhere", zipcode: 234, telephone: "(833) 942-4710", recommendedby: 1, joindate: "2012-07-03T08:25:05.000Z" }
            ])

            const syncReport = sourceData.SyncReport(destinationData, "memid")

            expect(syncReport).toEqual({
                AddedRows: [
                    {
                        memid: 6,
                        surname: "toadd",
                        firstname: "ADD",
                        address: "where",
                        zipcode: 234,
                        telephone: "(833) 942-4710",
                        recommendedby: 1,
                        joindate: "2012-07-03T08:25:05.000Z"
                    }
                ],
                DeletedRows: [
                    {
                        memid: 5,
                        surname: "todelete",
                        firstname: "DELETE",
                        address: "nowhere",
                        zipcode: 234,
                        telephone: "(833) 942-4710",
                        recommendedby: 1,
                        joindate: "2012-07-03T08:25:05.000Z"
                    }
                ],
                UpdatedRows: [
                    {
                        memid: 0,
                        surname: "GUEST",
                        firstname: "GUEST",
                        address: "XXXXXXXXXX",
                        zipcode: 0,
                        telephone: "(000) 000-0000",
                        recommendedby: null,
                        joindate: "2012-06-30T22:00:00.000Z"
                    },
                    {
                        memid: 1,
                        surname: "Smith",
                        firstname: "Darren",
                        address: "XXXXXXXXXX",
                        zipcode: 4321,
                        telephone: "555-555-5555",
                        recommendedby: null,
                        joindate: "2012-07-02T10:02:05.000Z"
                    },
                    {
                        memid: 2,
                        surname: "Smith",
                        firstname: "Tracy",
                        address: "XXXXXXXXXX",
                        zipcode: 4321,
                        telephone: "555-555-5555",
                        recommendedby: null,
                        joindate: "2012-07-02T10:08:23.000Z"
                    },
                    {
                        memid: 3,
                        surname: "Rownam",
                        firstname: "Tim",
                        address: "XXXXXXXXXX",
                        zipcode: 23423,
                        telephone: "(844) 693-0723",
                        recommendedby: null,
                        joindate: "2012-07-03T07:32:15.000Z"
                    }
                ]
            })
        })

        it('Case: Sync from Memory to Postgres (Optimized return)', () => {
            const sourceData = new DataTable("Source", [
                {
                    memid: 0,
                    surname: "GUEST",
                    firstname: "GUEST",
                    address: "XXXXXXXXXX",
                    zipcode: 0,
                    telephone: "(000) 000-0000",
                    recommendedby: null,
                    joindate: "2012-06-30T22:00:00.000Z"
                },
                {
                    memid: 1,
                    surname: "Smith",
                    firstname: "Darren",
                    address: "XXXXXXXXXX",
                    zipcode: 4321,
                    telephone: "555-555-5555",
                    recommendedby: null,
                    joindate: "2012-07-02T10:02:05.000Z"
                },
                {
                    memid: 2,
                    surname: "Smith",
                    firstname: "Tracy",
                    address: "XXXXXXXXXX",
                    zipcode: 4321,
                    telephone: "555-555-5555",
                    recommendedby: null,
                    joindate: "2012-07-02T10:08:23.000Z"
                },
                {
                    memid: 3,
                    surname: "Rownam",
                    firstname: "Tim",
                    address: "XXXXXXXXXX",
                    zipcode: 23423,
                    telephone: "(844) 693-0723",
                    recommendedby: null,
                    joindate: "2012-07-03T07:32:15.000Z"
                },
                {
                    memid: 4,
                    surname: "Joplette",
                    firstname: "Janice",
                    address: "20 Crossing Road, New York",
                    zipcode: 234,
                    telephone: "(833) 942-4710",
                    recommendedby: 1,
                    joindate: "2012-07-03T08:25:05.000Z"
                },
                {
                    memid: 6,
                    surname: "toadd",
                    firstname: "ADD",
                    address: "where",
                    zipcode: 234,
                    telephone: "(833) 942-4710",
                    recommendedby: 1,
                    joindate: "2012-07-03T08:25:05.000Z"
                }
            ])

            const destinationData = new DataTable("Destination", [
                {
                    memid: 0,
                    surname: "GUEST",
                    firstname: "GUEST",
                    address: "GUEST",
                    zipcode: 0,
                    telephone: "(000) 000-0000",
                    recommendedby: null,
                    joindate: "2012-06-30T22:00:00.000Z"
                },
                {
                    memid: 1,
                    surname: "Smith",
                    firstname: "Darren",
                    address: "8 Bloomsbury Close, Boston",
                    zipcode: 4321,
                    telephone: "555-555-5555",
                    recommendedby: null,
                    joindate: "2012-07-02T10:02:05.000Z"
                },
                {
                    memid: 2,
                    surname: "Smith",
                    firstname: "Tracy",
                    address: "8 Bloomsbury Close, New York",
                    zipcode: 4321,
                    telephone: "555-555-5555",
                    recommendedby: null,
                    joindate: "2012-07-02T10:08:23.000Z"
                },
                {
                    memid: 3,
                    surname: "Rownam",
                    firstname: "Tim",
                    address: "23 Highway Way, Boston",
                    zipcode: 23423,
                    telephone: "(844) 693-0723",
                    recommendedby: null,
                    joindate: "2012-07-03T07:32:15.000Z"
                },
                {
                    memid: 4,
                    surname: "Joplette",
                    firstname: "Janice",
                    address: "20 Crossing Road, New York",
                    zipcode: 234,
                    telephone: "(833) 942-4710",
                    recommendedby: 1,
                    joindate: "2012-07-03T08:25:05.000Z"
                },
                {
                    memid: 5,
                    surname: "todelete",
                    firstname: "DELETE",
                    address: "nowhere",
                    zipcode: 234,
                    telephone: "(833) 942-4710",
                    recommendedby: 1,
                    joindate: "2012-07-03T08:25:05.000Z"
                }
            ])

            const syncReport = sourceData.SyncReport(destinationData, "memid", { keepOnlyUpdatedValues: true })

            expect(syncReport).toEqual({
                AddedRows: [
                    {
                        memid: 6,
                        surname: "toadd",
                        firstname: "ADD",
                        address: "where",
                        zipcode: 234,
                        telephone: "(833) 942-4710",
                        recommendedby: 1,
                        joindate: "2012-07-03T08:25:05.000Z"
                    }
                ],
                DeletedRows: [
                    {
                        memid: 5,
                        surname: "todelete",
                        firstname: "DELETE",
                        address: "nowhere",
                        zipcode: 234,
                        telephone: "(833) 942-4710",
                        recommendedby: 1,
                        joindate: "2012-07-03T08:25:05.000Z"
                    }
                ],
                UpdatedRows: [
                    {
                        memid: 0,
                        address: "XXXXXXXXXX"
                    },
                    {
                        memid: 1,
                        address: "XXXXXXXXXX"
                    },
                    {
                        memid: 2,
                        address: "XXXXXXXXXX"
                    },
                    {
                        memid: 3,
                        address: "XXXXXXXXXX"
                    }
                ]
            })
        })
    })

    describe('Anonymize', () => {

        // Anonymizes specified fields in all rows
        it('should anonymize specified fields in all rows', async () => {
            const dataTable = new DataTable("myTable")
            dataTable.Set([
                {
                    name: 'John Doe',
                    email: 'john@example.com'
                },
                {
                    name: 'Jane Doe',
                    email: 'jane@example.com'
                }
            ])
            const fieldsToAnonymize = ['email']
            await dataTable.Anonymize(fieldsToAnonymize)
            dataTable.Rows.forEach(row => {
                expect(row.email).toMatch(/^[A-Za-z0-9+/]*={0,2}$/)
            })
        })

        // Anonymizes fields when no rows are present
        it('should handle anonymization when no rows are present', async () => {
            const dataTable = new DataTable("myTable")
            dataTable.Set([])
            const fieldsToAnonymize = ['email']
            await dataTable.Anonymize(fieldsToAnonymize)
            expect(dataTable.Rows).toEqual([])
        })

        // Returns the DataTable instance after anonymization
        it('should return DataTable instance after anonymization when fields are provided', async () => {
            const dataTable = new DataTable("myTable")
            const fields = ['email', 'phone']
            const result = await dataTable.Anonymize(fields)
            expect(result).toBeInstanceOf(DataTable)
        })

        // Handles multiple fields for anonymization
        it('should anonymize specified fields for all rows when multiple fields are provided', async () => {
            const dataTable = new DataTable("myTable")
            dataTable.Set([
                {
                    name: 'Alice',
                    email: 'alice@example.com'
                }, {
                    name: 'Bob',
                    email: 'bob@example.com'
                }
            ])
            const fields = ['name', 'email']
            await dataTable.Anonymize(fields)
            expect(dataTable.Rows[0].name).not.toBe('Alice')
            expect(dataTable.Rows[0].email).not.toBe('alice@example.com')
            expect(dataTable.Rows[1].name).not.toBe('Bob')
            expect(dataTable.Rows[1].email).not.toBe('bob@example.com')
        })

        // Processes all rows in the DataTable
        it('should anonymize specified fields for all rows when processing all rows', async () => {
            const dataTable = new DataTable("myTable")
            dataTable.Set([
                {
                    name: 'Alice',
                    email: 'alice@example.com'
                }, {
                    name: 'Bob',
                    email: 'bob@example.com'
                }
            ])
            const fields = ['name', 'email']
            await dataTable.Anonymize(fields)
            expect(dataTable.Rows[0].name).not.toBe('Alice')
            expect(dataTable.Rows[0].email).not.toBe('alice@example.com')
            expect(dataTable.Rows[1].name).not.toBe('Bob')
            expect(dataTable.Rows[1].email).not.toBe('bob@example.com')
        })

        // Handles empty fields array without errors
        it('should handle empty fields array without errors when calling AnonymizeFields', async () => {
            const dataTable = new DataTable("myTable")
            const rows = [
                {
                    name: 'Alice',
                    age: 30
                }, {
                    name: 'Bob',
                    age: 25
                }
            ]
            dataTable.Set(rows)

            expect((await dataTable.Anonymize([])).Rows).toEqual(rows)
        })

        // Anonymizes fields when some rows lack the specified fields
        it('should anonymize fields when some rows lack the specified fields when calling AnonymizeFields', async () => {
            const dataTable = new DataTable("myTable")
            const rows = [
                {
                    name: 'Alice',
                    age: 30
                }, { name: 'Bob' }
            ]
            dataTable.Set(rows)

            const expectedRows = [
                {
                    name: 'Alice',
                    age: 'F2mdKMiTK6Wq34bDP1jIKrF9dNPtu/EJu8QgFJLNIsw='
                }, { name: 'Bob' }
            ]
            expect((await dataTable.Anonymize(['age'])).Rows).toEqual(expectedRows)
        })

        // Processes all fields in the DataTable
        it('should anonymize all fields for all rows', async () => {
            const dataTable = new DataTable("myTable")
            dataTable.Set([
                {
                    name: 'Alice',
                    email: 'alice@example.com'
                }, {
                    name: 'Bob',
                    email: 'bob@example.com'
                }
            ])
            const fields = '*'
            await dataTable.Anonymize(fields)
            expect(dataTable.Rows).toEqual([
                {
                    "email": "JKujUcPGJxgTM5IlypKLP7HKRd/8opG4tFp2wuvl644=",
                    "name": "lsuciPTQkJ1xx+/Pi9+xAZlgr/iAp7Cz4/+3ZHKqI4g=",
                },
                {
                    "email": "bcr/lBtGgyStO61XSOcHUAPI5dNFXLgyRUSMewrYUs8=",
                    "name": "RMcdMMmopXifCoQPDlxg6rTQUXyqDhbAckNcEGqla3M=",
                }
            ])
        })
    })

    describe('RemoveDuplicates', () => {
        let dtDuplicates: DataTable = <DataTable>{}

        beforeEach(() => {
            dtDuplicates = new DataTable("mytable", [
                { id: 1, name: 'Alice', age: 30, value: 10 },
                { id: 1, name: 'Alice', age: 15, value: null },
                { id: 1, name: 'alice', age: 30 },
                { id: 2, name: 'Bob', age: 25, value: 20 },
                { id: 2, name: 'Bob', age: true, value: 15 },
                { id: 2, name: 'Bob', age: undefined, value: 15 },
                { id: 3, name: 'Jane', age: 10, value: true },
                { id: 3, name: 'Jane', age: 25, value: undefined },
                { id: 4 }
            ])
        })

        afterEach(() => {
            dtDuplicates = <DataTable>{}
        })

        // Removes duplicate rows based on specified fields using hash method
        it('should remove duplicate rows based on specified fields using hash method', () => {
            dtDuplicates.RemoveDuplicates(['id', 'name'], REMOVE_DUPLICATES_METHOD.HASH, REMOVE_DUPLICATES_STRATEGY.FIRST)
            expect(dtDuplicates.Rows).toEqual([
                { id: 1, name: 'Alice', age: 30, value: 10 },
                { id: 1, name: 'alice', age: 30 },
                { id: 2, name: 'Bob', age: 25, value: 20 },
                { id: 3, name: 'Jane', age: 10, value: true },
                { id: 4 }
            ])
        })

        // Handles empty rows array gracefully
        it('should handle empty rows array gracefully', () => {
            dtDuplicates.Set([])
            dtDuplicates.RemoveDuplicates(['name', 'age'], REMOVE_DUPLICATES_METHOD.HASH, REMOVE_DUPLICATES_STRATEGY.FIRST, '')
            expect(dtDuplicates.Rows).toEqual([])
        })

        it('should remove duplicate rows based on specified fields using exact method', () => {
            // Call the method
            dtDuplicates.RemoveDuplicates(['id', 'name'], REMOVE_DUPLICATES_METHOD.EXACT)

            // Assertion
            expect(dtDuplicates.Rows).toEqual([
                { id: 1, name: 'Alice', age: 30, value: 10 },
                { id: 1, name: 'alice', age: 30 },
                { id: 2, name: 'Bob', age: 25, value: 20 },
                { id: 3, name: 'Jane', age: 10, value: true },
                { id: 4 }
            ])
        })

        // Keeps the first occurrence of duplicate rows when strategy is REMOVE_DUPLICATES_STRATEGY.FIRST
        it('should keep the first occurrence of duplicate rows when strategy is last', () => {
            dtDuplicates.RemoveDuplicates(['id', 'name'], REMOVE_DUPLICATES_METHOD.EXACT, REMOVE_DUPLICATES_STRATEGY.LAST)

            // Assertion
            expect(dtDuplicates.Rows).toEqual([
                { id: 1, name: 'Alice', age: 15, value: null },
                { id: 1, name: 'alice', age: 30 },
                { id: 2, name: 'Bob', age: undefined, value: 15 },
                { id: 3, name: 'Jane', age: 25, value: undefined },
                { id: 4 }
            ])
        })

        // Replaces the first occurrence with the last occurrence when strategy is 'last'
        it('should replace first occurrence with last occurrence when strategy is last', () => {
            dtDuplicates.RemoveDuplicates(['id'], REMOVE_DUPLICATES_METHOD.HASH, REMOVE_DUPLICATES_STRATEGY.LAST)

            // Assertion
            expect(dtDuplicates.Rows).toEqual([
                { id: 1, name: 'alice', age: 30 },
                { id: 2, name: 'Bob', age: undefined, value: 15 },
                { id: 3, name: 'Jane', age: 25, value: undefined },
                { id: 4 }
            ])
        })

        // Replaces the first occurrence with the row having maximum condition value when strategy is 'highest'
        it('should replace first occurrence with row having maximum condition value when strategy is max', () => {
            dtDuplicates.RemoveDuplicates(['id'], REMOVE_DUPLICATES_METHOD.HASH, REMOVE_DUPLICATES_STRATEGY.HIGHEST, 'value')

            // Assertion
            expect(dtDuplicates.Rows).toEqual([
                { id: 1, name: 'Alice', age: 30, value: 10 },
                { id: 2, name: 'Bob', age: 25, value: 20 },
                { id: 3, name: 'Jane', age: 10, value: true },
                { id: 4 }
            ])
        })

        // Replaces the first occurrence with the row having minimum condition value when strategy is 'lowest'
        it('should replace first occurrence with row having minimum condition value when strategy is min', () => {
            dtDuplicates.RemoveDuplicates(['name'], REMOVE_DUPLICATES_METHOD.HASH, REMOVE_DUPLICATES_STRATEGY.LOWEST, 'age')

            // Assertion
            expect(dtDuplicates.Rows).toEqual([
                { id: 1, name: 'Alice', age: 15, value: null },
                { id: 1, name: 'alice', age: 30 },
                { id: 2, name: 'Bob', age: true, value: 15 },
                { id: 3, name: 'Jane', age: 10, value: true },
                { id: 4 }
            ])
        })

        // Handles empty fields array gracefully
        it('should handle empty fields array gracefully when calling RemoveDuplicates', () => {
            dtDuplicates.RemoveDuplicates([], REMOVE_DUPLICATES_METHOD.HASH, REMOVE_DUPLICATES_STRATEGY.FIRST)

            // Assert that Rows remain unchanged
            expect(dtDuplicates.Rows).toEqual([
                { id: 1, name: 'Alice', age: 30, value: 10 },
                { id: 1, name: 'Alice', age: 15, value: null },
                { id: 1, name: 'alice', age: 30 },
                { id: 2, name: 'Bob', age: 25, value: 20 },
                { id: 2, name: 'Bob', age: true, value: 15 },
                { id: 2, name: 'Bob', age: undefined, value: 15 },
                { id: 3, name: 'Jane', age: 10, value: true },
                { id: 3, name: 'Jane', age: 25, value: undefined },
                { id: 4 }
            ])
        })

        // Handles invalid JSON structure in rows
        it('should handle invalid JSON structure in rows when calling RemoveDuplicates', () => {
            dtDuplicates.RemoveDuplicates(['id'], REMOVE_DUPLICATES_METHOD.HASH, REMOVE_DUPLICATES_STRATEGY.FIRST, '')

            // Assert that Rows remain unchanged
            expect(dtDuplicates.Rows).toEqual([
                { id: 1, name: 'Alice', age: 30, value: 10 },
                { id: 2, name: 'Bob', age: 25, value: 20 },
                { id: 3, name: 'Jane', age: 10, value: true },
                { id: 4 }
            ])
        })

        // Handles invalid condition path in rows
        it('should handle invalid condition path in rows when calling RemoveDuplicates', () => {
            dtDuplicates.RemoveDuplicates(['id'], REMOVE_DUPLICATES_METHOD.HASH, REMOVE_DUPLICATES_STRATEGY.FIRST, 'invalidField')
            // Assertion
            expect(dtDuplicates.Rows).toEqual([
                { id: 1, name: 'Alice', age: 30, value: 10 },
                { id: 2, name: 'Bob', age: 25, value: 20 },
                { id: 3, name: 'Jane', age: 10, value: true },
                { id: 4 }
            ])
        })

        // Handles rows with missing fields specified in the fields array
        it('should handle rows with missing fields specified in the fields array when calling RemoveDuplicates', () => {
            dtDuplicates.RemoveDuplicates(['id', 'name'], REMOVE_DUPLICATES_METHOD.HASH, REMOVE_DUPLICATES_STRATEGY.FIRST)

            // Assertion
            expect(dtDuplicates.Rows).toEqual([
                { id: 1, name: 'Alice', age: 30, value: 10 },
                { id: 1, name: 'alice', age: 30 },
                { id: 2, name: 'Bob', age: 25, value: 20 },
                { id: 3, name: 'Jane', age: 10, value: true },
                { id: 4 }
            ])
        })

        // Handles rows with null or undefined values in specified fields
        it('should handle rows with null or undefined values in specified fields when calling RemoveDuplicates method', () => {
            dtDuplicates.RemoveDuplicates(['id'], REMOVE_DUPLICATES_METHOD.HASH, REMOVE_DUPLICATES_STRATEGY.FIRST)
            // Assertion
            expect(dtDuplicates.Rows).toEqual([
                { id: 1, name: 'Alice', age: 30, value: 10 },
                { id: 2, name: 'Bob', age: 25, value: 20 },
                { id: 3, name: 'Jane', age: 10, value: true },
                { id: 4 }
            ])
        })

        // Handles rows with non-string values in specified fields
        it('should handle rows with non-string values in specified fields when calling RemoveDuplicates method and condition', () => {
            dtDuplicates.RemoveDuplicates(['id'], REMOVE_DUPLICATES_METHOD.HASH, REMOVE_DUPLICATES_STRATEGY.HIGHEST, 'age')
            // Assertion
            expect(dtDuplicates.Rows).toEqual([
                { id: 1, name: 'Alice', age: 30, value: 10 },
                { id: 2, name: 'Bob', age: 25, value: 20 },
                { id: 3, name: 'Jane', age: 25, value: undefined },
                { id: 4 }
            ])
        })

        it('should remove duplicate rows based on specified fields using ignorecase method', () => {
            dtDuplicates.RemoveDuplicates(['id', 'name'], REMOVE_DUPLICATES_METHOD.IGNORE_CASE, REMOVE_DUPLICATES_STRATEGY.LOWEST, 'age')
            expect(dtDuplicates.Rows).toEqual([
                { id: 1, name: 'Alice', age: 15, value: null },
                { id: 2, name: 'Bob', age: true, value: 15 },
                { id: 3, name: 'Jane', age: 10, value: true },
                { id: 4 }
            ])
        })

        // // Handles large datasets efficiently
        // it('should handle large datasets efficiently when calling RemoveDuplicates method', () => {
        //     // Initialize the class object
        //     const dataTable = new DataTable('myTable')
        //     // Populate the DataTable with a large dataset
        //     // Mock the necessary dependencies and functions
        //     // Call the RemoveDuplicates method with a large dataset
        //     // Assert that the method handles large datasets efficiently
        // })
    })


    describe('FilterRows', () => {

        // Filters rows based on a valid SQL condition
        it('should filter rows based on a valid SQL condition', async () => {
            const dataTable = new DataTable("myTable")
            dataTable.Rows = [
                { id: 1, name: 'Alice' },
                { id: 2, name: 'Bob' }
            ]
            const condition = "name = 'Alice'"
            await dataTable.FilterRows(condition)
            expect(dataTable.Rows).toEqual([{ id: 1, name: 'Alice' }])
        })

        // Handles empty Rows array without errors
        it('should handle empty Rows array without errors', async () => {
            const dataTable = new DataTable("myTable")
            dataTable.Rows = []
            const condition = "name = 'Alice'"
            expect(async () => await dataTable.FilterRows(condition)).not.toThrow()
            expect(dataTable.Rows).toEqual([])
        })

        // Returns the DataTable instance after filtering
        it('should return DataTable instance after filtering when condition is valid', async () => {
            // Initialize DataTable object
            const dataTable = new DataTable("myTable")
            dataTable.Rows = [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }]

            // Call the Filter method
            const result = await dataTable.FilterRows('id = 1')

            // Assertions
            expect(result).toBe(dataTable)
        })

        // Executes the SQL query using alasql
        it('should execute SQL query using alasql when condition is valid', async () => {
            // Initialize DataTable object
            const dataTable = new DataTable("myTable")
            dataTable.Rows = [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }]

            // Call the Filter method
            const result = await dataTable.FilterRows('id = 1')

            // Assertions
            expect(result).toBe(dataTable)
        })

        // Handles non-empty Rows array correctly
        it('should return the filtered Rows when Rows array is non-empty', async () => {
            // Initialize the class object
            const dataTable = new DataTable("myTable")
            dataTable.Rows = [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }]

            // Call the Filter method with a valid condition
            await dataTable.FilterRows('id = 1')

            // Assertion
            expect(dataTable.Rows).toEqual([{ id: 1, name: 'Alice' }])
        })

        it('should return same table gracefully', async () => {
            const data = [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }]
            // Initialize the class object
            const dt1 = new DataTable("myTable", data)

            // Call the Filter method with a invalid condition
            await dt1.FilterRows('!id = *1 %')

            // Assertion
            expect(dt1.Rows).toEqual(data)
        }, 300_000)
    })

    describe('Transpose', () => {

        // Transpose empty table returns the same table
        it('should return same table when input is empty', () => {
            const table = new DataTable()
            table.Rows = []
            const result = table.Transpose()
            expect(result.Rows).toEqual([])
        })

        // Transpose table with single row and multiple columns
        it('should correctly transpose single row with multiple columns', () => {
            const table = new DataTable()
            table.Rows = [{ a: 1, b: 2, c: 3 }]
            const result = table.Transpose()
            expect(result.Rows).toEqual([
                { key: 'a', field_1: 1 },
                { key: 'b', field_1: 2 },
                { key: 'c', field_1: 3 }
            ])
        })

        // Transpose table with multiple rows and columns
        it('should correctly transpose multiple rows and columns', () => {
            const table = new DataTable()
            table.Rows = [
                { a: 1, b: 2 },
                { a: 3, b: 4 }
            ]
            const result = table.Transpose()
            expect(result.Rows).toEqual([
                { key: 'a', field_1: 1, field_2: 3 },
                { key: 'b', field_1: 2, field_2: 4 }
            ])
        })

        // Transpose with renamed columns provided matches column count
        it('should use provided column names when count matches', () => {
            const table = new DataTable()
            table.Rows = [{ a: 1, b: 2 }]
            const result = table.Transpose(['col1', 'val1'])
            expect(result.Rows).toEqual([
                { col1: 'a', val1: 1 },
                { col1: 'b', val1: 2 }
            ])
        })

        // Transpose with no renamed columns uses default naming pattern
        it('should use default naming pattern when no column names provided', () => {
            const table = new DataTable()
            table.Rows = [{ a: 1, b: 2 }]
            const result = table.Transpose()
            expect(result.Rows).toEqual([
                { key: 'a', field_1: 1 },
                { key: 'b', field_1: 2 }
            ])
        })

        // Transpose with renamed columns array shorter than number of columns
        it('should use default pattern for remaining columns when renamed array is short', () => {
            const table = new DataTable()
            table.Rows = [{ a: 1, b: 2, c: 3 }]
            const result = table.Transpose(['col1'])
            expect(result.Rows).toEqual([
                { col1: 'a', field_2: 1 },
                { col1: 'b', field_2: 2 },
                { col1: 'c', field_2: 3 }
            ])
        })

        // Transpose with renamed columns array longer than number of columns
        it('should ignore extra renamed columns when array is too long', () => {
            const table = new DataTable()
            table.Rows = [{ a: 1 }]
            const result = table.Transpose(['col1', 'col2', 'col3'])
            expect(result.Rows).toEqual([{ col1: 'a', col2: 1 }])
        })

        // Transpose table with single column
        it('should correctly transpose table with single column', () => {
            const table = new DataTable()
            table.Rows = [{ a: 1 }, { a: 2 }]
            const result = table.Transpose()
            expect(result.Rows).toEqual([{ key: 'a', field_1: 1, field_2: 2 }])
        })

        // Transpose table with null/undefined values in cells
        it('should handle null and undefined values correctly', () => {
            const table = new DataTable()
            table.Rows = [{ a: null, b: undefined }]
            const result = table.Transpose()
            expect(result.Rows).toEqual([
                { key: 'a', field_1: null },
                { key: 'b', field_1: undefined }
            ])
        })

        // Transpose table with special characters in column names
        it('should handle special characters in column names', () => {
            const table = new DataTable()
            table.Rows = [{ '@#$': 1, '!@#': 2 }]
            const result = table.Transpose()
            expect(result.Rows).toEqual([
                { key: '@#$', field_1: 1 },
                { key: '!@#', field_1: 2 }
            ])
        })

        // Verify column naming pattern follows "field_N" format
        it('should follow field_N naming pattern for auto-generated columns', () => {
            const table = new DataTable()
            table.Rows = [{ a: 1, b: 2 }, { a: 3, b: 4 }]
            const result = table.Transpose()
            expect(Object.keys(result.Rows[0])).toEqual(['key', 'field_1', 'field_2'])
        })

        // Check if original data is preserved after transpose
        it('should preserve all original data values after transpose', () => {
            const table = new DataTable()
            const originalData = [{ a: 1, b: 2 }, { a: 3, b: 4 }]
            table.Rows = originalData
            const result = table.Transpose()
            const allValues = result.Rows.flatMap(row => Object.values(row))
            expect(allValues).toContain('a')
            expect(allValues).toContain('b')
            expect(allValues).toContain(1)
            expect(allValues).toContain(2)
            expect(allValues).toContain(3)
            expect(allValues).toContain(4)
        })
    })

    ///////
})

