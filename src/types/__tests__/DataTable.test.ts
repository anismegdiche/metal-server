//
//
//
import { DataTable } from '../DataTable'

describe("DataTable", () => {
    let
        dt: DataTable = <DataTable>{},
        dtEmpty: DataTable = <DataTable>{},
        dtA: DataTable = <DataTable>{},
        dtB: DataTable = <DataTable>{}

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

        it("should throw an error if name is undefined", () => {
            expect(() => new DataTable(undefined)).toThrowError(
                "undefined DataTable name"
            )
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
                    "Col1": "Value1",
                    "Col2": "Value2"
                },
                {
                    "Col1": "Value3",
                    "Col2": "Value4"
                }
            ])

            // Add a prefix to all field names
            data.PrefixAllFields("Prefix")

            // Act
            data.UnPrefixAllfields()

            // Assert
            expect(data.Fields).toEqual({
                "Col1": "string",
                "Col2": "string"
            })
            expect(data.Rows).toEqual([
                {
                    "Col1": "Value1",
                    "Col2": "Value2"
                },
                {
                    "Col1": "Value3",
                    "Col2": "Value4"
                }
            ])
        })

        it("should not modify field names if they don't have a prefix", () => {
            // Arrange
            const data = new DataTable("TestTable", [
                {
                    "Col1": "Value1",
                    "Col2": "Value2"
                },
                {
                    "Col1": "Value3",
                    "Col2": "Value4"
                }
            ])

            // Act
            data.UnPrefixAllfields()

            // Assert
            expect(data.Fields).toEqual({
                "Col1": "string",
                "Col2": "string"
            })
            expect(data.Rows).toEqual([
                {
                    "Col1": "Value1",
                    "Col2": "Value2"
                },
                {
                    "Col1": "Value3",
                    "Col2": "Value4"
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
            const sorted = dtA.Sort(['name'], ['asc']).Rows
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
            const sorted = dtA.Sort(['age'], ['desc']).Rows
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

    //
})