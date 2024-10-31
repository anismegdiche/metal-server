

import { DataTable, REMOVE_DUPLICATES_METHOD, REMOVE_DUPLICATES_STRATEGY } from "../../types/DataTable"
import { Step } from "../Step"
import { Plan } from "../Plan"
import { StepCommand, TConfig } from "../../types/TConfig"
import { Schema } from "../Schema"
import { TSchemaResponse } from "../../types/TSchemaResponse"
import typia from "typia"
import { Config } from "../Config"
import { HttpResponse } from "../HttpResponse"

describe('Step', () => {

    beforeAll(async () => {
        jest.clearAllMocks()
        Config.Configuration = typia.random<TConfig>()
    }, 120000)

    describe('Select', () => {
        // Executes a valid 'select' step and returns a DataTable object.
        it('should execute a valid select step and return a DataTable object', async () => {
            // Mock the necessary dependencies
            const schema = "mySchema"
            const plan = "myPlan"
            const entity = "myEntity"
            const steps = [
                {
                    select: {
                        entity: "users",
                        fields: "name, age",
                        filter: {
                            age: { $gte: 18 }
                        }
                    }
                }
            ]

            // Mock the DataTable object
            const dtWorking = new DataTable(entity)
            dtWorking.Name = "users"
            dtWorking.AddRows({
                name: "John",
                age: 25
            })
            dtWorking.AddRows({
                name: "Jane",
                age: 30
            })

            // Mock the Step.ExecuteCaseMap function
            Step.ExecuteCaseMap = {
                select: jest.fn().mockResolvedValue(dtWorking)
            }

            // Invoke the Step.Execute function
            const result = await Plan.ExecuteSteps(schema, plan, entity, steps)

            // Assertions
            expect(result).toBeInstanceOf(DataTable)
            expect(result.Name).toBe("users")
            expect(result.GetFieldNames()).toEqual(["name", "age"])
            expect(result.Rows).toEqual([
                {
                    name: "John",
                    age: 25
                },
                {
                    name: "Jane",
                    age: 30
                }
            ])
        })

        it('should execute a select step with an invalid entity and return the current DataTable object', async () => {
            // Mock the necessary dependencies
            const schema = "mySchema"
            const plan = "myPlan"
            const entity = "users"
            const steps = [
                {
                    select: {
                        entity: "invalid_entity",
                        fields: "name, age",
                        filter: {
                            age: { $gte: 18 }
                        }
                    }
                }
            ]

            // Mock the DataTable object
            const dtWorking = new DataTable(entity)
            dtWorking.AddRows({
                name: "John",
                age: 25
            })
            dtWorking.AddRows({
                name: "Jane",
                age: 30
            })

            // Mock the Step.ExecuteCaseMap function
            Step.ExecuteCaseMap = {
                select: jest.fn().mockResolvedValue(dtWorking)
            }

            // Invoke the Step.Execute function
            const result = await Plan.ExecuteSteps(schema, plan, entity, steps)

            // Assertions
            expect(result).toBeInstanceOf(DataTable)
            expect(result.Name).toBe("users")
            expect(result.GetFieldNames()).toEqual(["name", "age"])
            expect(result.Rows).toEqual([
                {
                    name: "John",
                    age: 25
                },
                {
                    name: "Jane",
                    age: 30
                }
            ])
        })
    })

    describe('Insert', () => {

        // Executes a valid 'insert' step and returns a DataTable object.
        it('should execute a valid insert step and return a DataTable object', async () => {
            // Mock the necessary dependencies
            const schema = "mySchema"
            const plan = "myPlan"
            const entity = "myEntity"
            const steps = [
                {
                    insert: {
                        entity: "users",
                        data: [
                            {
                                name: "John",
                                age: 25
                            },
                            {
                                name: "Jane",
                                age: 30
                            }
                        ]
                    }
                }
            ]

            // Mock the DataTable object
            const dtWorking = new DataTable(entity)
            dtWorking.Name = "users"
            dtWorking.AddRows({
                name: "John",
                age: 25
            })
            dtWorking.AddRows({
                name: "Jane",
                age: 30
            })

            // Mock the Step.ExecuteCaseMap function
            Step.ExecuteCaseMap = {
                insert: jest.fn().mockResolvedValue(dtWorking)
            }

            // Invoke the Step.Execute function
            const result = await Plan.ExecuteSteps(schema, plan, entity, steps)

            // Assertions
            expect(result).toBeInstanceOf(DataTable)
            expect(result.Name).toBe("users")
            expect(result.GetFieldNames()).toEqual(["name", "age"])
            expect(result.Rows).toEqual([
                {
                    name: "John",
                    age: 25
                },
                {
                    name: "Jane",
                    age: 30
                }
            ])
        })
        it('should execute an insert step with no data and return the current DataTable object', async () => {
            // Mock the necessary dependencies
            const schema = "mySchema"
            const plan = "myPlan"
            const entity = "users"
            const steps = <Array<StepCommand>>[
                {
                    insert: {
                        entity: "users"
                    }
                }
            ]

            // Mock the DataTable object
            const dtWorking = new DataTable(entity)
            dtWorking.AddRows({
                name: "John",
                age: 25
            })
            dtWorking.AddRows({
                name: "Jane",
                age: 30
            })

            // Mock the Step.ExecuteCaseMap function
            Step.ExecuteCaseMap = {
                insert: jest.fn().mockResolvedValue(dtWorking)
            }

            // Invoke the Step.Execute function
            const result = await Plan.ExecuteSteps(schema, plan, entity, steps)

            // Assertions
            expect(result).toBeInstanceOf(DataTable)
            expect(result.Name).toBe("users")
            expect(result.GetFieldNames()).toEqual(["name", "age"])
            expect(result.Rows).toEqual([
                {
                    name: "John",
                    age: 25
                },
                {
                    name: "Jane",
                    age: 30
                }
            ])
        })
    })

    describe('Update', () => {
        // Executes a valid 'update' step and returns a DataTable object.
        it('should execute a valid update step and return a DataTable object', async () => {
            // Mock the necessary dependencies
            const schema = "mySchema"
            const plan = "myPlan"
            const entity = "myEntity"
            const steps = <Array<StepCommand>>[
                {
                    update: {
                        entity: "users",
                        data: { age: 30 },
                        filter: {
                            name: "John"
                        }
                    }
                }
            ]

            // Mock the DataTable object
            const dtWorking = new DataTable(entity)
            dtWorking.Name = "users"
            dtWorking.AddRows({
                name: "John",
                age: 25
            })
            dtWorking.AddRows({
                name: "Jane",
                age: 30
            })

            // Mock the Step.ExecuteCaseMap function
            Step.ExecuteCaseMap = {
                update: jest.fn().mockResolvedValue(dtWorking)
            }

            // Invoke the Step.Execute function
            const result = await Plan.ExecuteSteps(schema, plan, entity, steps)

            // Assertions
            expect(result).toBeInstanceOf(DataTable)
            expect(result.Name).toBe("users")
            expect(result.GetFieldNames()).toEqual(["name", "age"])
            expect(result.Rows).toEqual([
                {
                    name: "John",
                    age: 25
                },
                {
                    name: "Jane",
                    age: 30
                }
            ])
        })

        it('should execute an update step with no data and return the current DataTable object', async () => {
            // Mock the necessary dependencies
            const schema = "mySchema"
            const plan = "myPlan"
            const entity = "users"
            const steps = [
                {
                    update: {
                        entity: "users",
                        filter: {
                            name: "John"
                        }
                    }
                }
            ]

            // Mock the DataTable object
            const dtWorking = new DataTable(entity)
            dtWorking.AddRows({
                name: "John",
                age: 25
            })
            dtWorking.AddRows({
                name: "Jane",
                age: 30
            })

            // Mock the Step.ExecuteCaseMap function
            Step.ExecuteCaseMap = {
                update: jest.fn().mockResolvedValue(dtWorking)
            }

            // Invoke the Step.Execute function
            const result = await Plan.ExecuteSteps(schema, plan, entity, steps)

            // Assertions
            expect(result).toBeInstanceOf(DataTable)
            expect(result.Name).toBe("users")
            expect(result.GetFieldNames()).toEqual(["name", "age"])
            expect(result.Rows).toEqual([
                {
                    name: "John",
                    age: 25
                },
                {
                    name: "Jane",
                    age: 30
                }
            ])
        })
    })
    describe('Delete', () => {
        // Executes a valid 'delete' step and returns a DataTable object.
        it('should execute a valid delete step and return a DataTable object', async () => {
            // Mock the necessary dependencies
            const schema = "mySchema"
            const plan = "myPlan"
            const entity = "myEntity"
            const steps = [
                {
                    delete: {
                        entity: "users",
                        filter: {
                            age: { $gte: 18 }
                        }
                    }
                }
            ]

            // Mock the DataTable object
            const dtWorking = new DataTable(entity)
            dtWorking.Name = "users"
            dtWorking.AddRows({
                name: "John",
                age: 25
            })
            dtWorking.AddRows({
                name: "Jane",
                age: 30
            })

            // Mock the Step.ExecuteCaseMap function
            Step.ExecuteCaseMap = {
                delete: jest.fn().mockResolvedValue(dtWorking)
            }

            // Invoke the Step.Execute function
            const result = await Plan.ExecuteSteps(schema, plan, entity, steps)

            // Assertions
            expect(result).toBeInstanceOf(DataTable)
            expect(result.Name).toBe("users")
            expect(result.GetFieldNames()).toEqual(["name", "age"])
            expect(result.Rows).toEqual([
                {
                    name: "John",
                    age: 25
                },
                {
                    name: "Jane",
                    age: 30
                }
            ])
        })
    })

    describe('Join', () => {
        // Executes a valid 'join' step and returns a DataTable object.
        it('should execute a valid join step and return a DataTable object', async () => {
            // Mock the necessary dependencies
            const schema = "mySchema"
            const plan = "myPlan"
            const entity = "myEntity"
            const steps = <Array<StepCommand>>[
                {
                    join: {
                        entity: "orders",
                        type: "left",
                        leftField: "user_id",
                        rightField: "id"
                    }
                }
            ]

            // Mock the DataTable objects
            const dtWorking = new DataTable(entity)
            dtWorking.Name = "users"
            dtWorking.AddRows({
                user_id: 1,
                name: "John"
            })
            dtWorking.AddRows({
                user_id: 2,
                name: "Jane"
            })

            const dtRight = new DataTable("orders")
            dtRight.Name = "orders"
            dtRight.AddRows({
                id: 1,
                order_number: "123"
            })
            dtRight.AddRows({
                id: 2,
                order_number: "456"
            })

            // Mock the Step.ExecuteCaseMap and Step.JoinCaseMap functions
            Step.ExecuteCaseMap = {
                join: jest.fn().mockResolvedValue(dtWorking)
            }
            Step.JoinCaseMap = {
                left: jest.fn().mockResolvedValue(dtWorking)
            }

            // Invoke the Step.Execute function
            const result = await Plan.ExecuteSteps(schema, plan, entity, steps)

            // Assertions
            expect(result).toBeInstanceOf(DataTable)
            expect(result.Name).toBe("users")
            expect(result.GetFieldNames()).toEqual(["user_id", "name"])
            expect(result.Rows).toEqual([
                {
                    user_id: 1,
                    name: "John"
                },
                {
                    user_id: 2,
                    name: "Jane"
                }
            ])
        })
    })

    describe('Fields', () => {
        // Executes a valid 'fields' step and returns a DataTable object.
        it('should execute a valid fields step and return a DataTable object', async () => {
            // Mock the necessary dependencies
            const schema = "mySchema"
            const plan = "myPlan"
            const entity = "myEntity"
            const steps = [
                {
                    fields: "name, age"
                }
            ]

            // Mock the DataTable object
            const dtWorking = new DataTable(entity)
            dtWorking.Name = "users"
            dtWorking.AddRows({
                name: "John",
                age: 25
            })
            dtWorking.AddRows({
                name: "Jane",
                age: 30
            })

            // Mock the Step.ExecuteCaseMap function
            Step.ExecuteCaseMap = {
                fields: jest.fn().mockResolvedValue(dtWorking)
            }

            // Invoke the Step.Execute function
            const result = await Plan.ExecuteSteps(schema, plan, entity, steps)

            // Assertions
            expect(result).toBeInstanceOf(DataTable)
            expect(result.Name).toBe("users")
            expect(result.GetFieldNames()).toEqual(["name", "age"])
            expect(result.Rows).toEqual([
                {
                    name: "John",
                    age: 25
                },
                {
                    name: "Jane",
                    age: 30
                }
            ])
        })
    })

    describe('Debug', () => {
        // Executes a valid 'debug' step and returns a DataTable object.
        it('should execute a valid debug step and return a DataTable object', async () => {
            // Mock the necessary dependencies
            const schema = "mySchema"
            const plan = "myPlan"
            const entity = "myEntity"
            const steps = [
                {
                    debug: "info"
                }
            ]

            // Mock the DataTable object
            const dtWorking = new DataTable(entity)
            dtWorking.Name = "myEntity"
            dtWorking.AddRows({
                field1: "value1",
                field2: 10
            })
            dtWorking.AddRows({
                field1: "value2",
                field2: 20
            })

            // Mock the Step.ExecuteCaseMap function
            Step.ExecuteCaseMap = {
                debug: jest.fn().mockResolvedValue(dtWorking)
            }

            // Invoke the Step.Execute function
            const result = await Plan.ExecuteSteps(schema, plan, entity, steps)

            // Assertions
            expect(result).toBeInstanceOf(DataTable)
            expect(result.Name).toBe("myEntity")
            expect(result.GetFieldNames()).toEqual(["field1", "field2"])
            expect(result.Rows).toEqual([
                {
                    field1: "value1",
                    field2: 10
                },
                {
                    field1: "value2",
                    field2: 20
                }
            ])
        })
    })

    describe('Anonymize', () => {
        // Anonymize fields when stepParams of field names
        it('should anonymize specified fields', async () => {
            const mockDataTable = new DataTable('testTable', [
                {
                    name: 'John',
                    email: 'john@example.com'
                }
            ])
            const stepArguments = {
                currentSchemaName: 'schema',
                currentPlanName: 'plan',
                currentDataTable: mockDataTable,
                stepParams: 'name'
            }

            const result = await Step.Anonymize(stepArguments)

            expect(result.Rows[0].name).toBe('61409aa1fd47d4a5332de23cbf59a36f')
            expect(result.Rows[0].email).toBe('john@example.com')
        })

        // Handle empty stepParams gracefully
        it('should handle empty stepParams gracefully', async () => {
            const mockDataTable = new DataTable('testTable', [
                {
                    name: 'John',
                    email: 'john@example.com'
                }
            ])
            const stepArguments = {
                currentSchemaName: 'schema',
                currentPlanName: 'plan',
                currentDataTable: mockDataTable,
                stepParams: ''
            }

            const result = await Step.Anonymize(stepArguments)

            expect(result.Rows[0].name).toBe('John')
            expect(result.Rows[0].email).toBe('john@example.com')
        })
    })

    describe('RemoveDuplicates', () => {

        const dt1 = new DataTable(undefined, [
            {
                id: 1,
                name: 'Alice'
            },
            {
                id: 1,
                name: 'Alice'
            },
            {
                id: 2,
                name: 'Bob'
            }
        ])

        const dt2 = new DataTable(undefined, [
            {
                id: 1,
                name: 'Alice'
            },
            {
                id: 2,
                name: 'Bob'
            },
            {
                id: 1,
                name: 'Alice'
            }
        ])

        // Remove duplicates using default HASH method and FIRST strategy
        it('should remove duplicates using default HASH method and FIRST strategy when no keys or condition are provided', async () => {
            const stepArguments = {
                currentSchemaName: 'testSchema',
                currentPlanName: 'testPlan',
                currentDataTable: dt1,
                stepParams: {}
            }

            const result = await Step.RemoveDuplicates(stepArguments)

            expect(result.Rows).toEqual([
                {
                    id: 1,
                    name: 'Alice'
                },
                {
                    id: 2,
                    name: 'Bob'
                }
            ])
        })

        // Handle undefined keys and condition gracefully
        it('should handle undefined keys and condition gracefully', async () => {
            const stepArguments = {
                currentSchemaName: 'testSchema',
                currentPlanName: 'testPlan',
                currentDataTable: dt1,
                stepParams: {
                    keys: undefined,
                    condition: undefined
                }
            }

            const result = await Step.RemoveDuplicates(stepArguments)

            expect(result.Rows).toEqual([
                {
                    id: 1,
                    name: 'Alice'
                },
                {
                    id: 2,
                    name: 'Bob'
                }
            ])
        })

        // Remove duplicates with specified keys and condition
        it('should remove duplicates with specified keys and condition when called', async () => {
            // Set up step arguments
            const stepArguments = {
                currentSchemaName: 'schema1',
                currentPlanName: 'plan1',
                currentDataTable: dt2,
                stepParams: {
                    keys: ['id'],
                    condition: 'name === "Alice"',
                    method: REMOVE_DUPLICATES_METHOD.HASH,
                    strategy: REMOVE_DUPLICATES_STRATEGY.FIRST
                }
            }

            // Call RemoveDuplicates method
            const result = await Step.RemoveDuplicates(stepArguments)

            // Assert the modified DataTable
            expect(result.Rows.length).toBe(2)
        })

        // Return the modified DataTable after duplicates removal
        it('should return modified DataTable after duplicates removal when duplicates exist', async () => {
            // Call RemoveDuplicates method
            const result = await Step.RemoveDuplicates({
                currentSchemaName: 'schema1',
                currentPlanName: 'plan1',
                currentDataTable: dt2,
                stepParams: {
                    keys: ['id'],
                    method: REMOVE_DUPLICATES_METHOD.HASH,
                    strategy: REMOVE_DUPLICATES_STRATEGY.FIRST
                }
            })

            // Assert the modified DataTable
            expect(result.Rows.length).toBe(2)
        })

        // Handle empty DataTable without errors
        it('should handle empty DataTable without errors when removing duplicates', async () => {
            // Initialize empty DataTable
            const dataTable = new DataTable()

            // Call RemoveDuplicates method on empty DataTable
            const result = await Step.RemoveDuplicates({
                currentSchemaName: 'schema1',
                currentPlanName: 'plan1',
                currentDataTable: dataTable,
                stepParams: {
                    keys: ['id'],
                    method: REMOVE_DUPLICATES_METHOD.HASH,
                    strategy: REMOVE_DUPLICATES_STRATEGY.FIRST
                }
            })

            // Assert the result is still an empty DataTable
            expect(result.Rows.length).toBe(0)
        })
    })


    describe('ListEntities', () => {

        afterEach(() => {
            jest.clearAllMocks()
        })

        // Returns a DataTable with entities when schema is provided and valid
        it('should return DataTable with entities when schema is valid', async () => {
            const stepArguments = {
                currentSchemaName: 'validSchema',
                currentDataTable: new DataTable('TestTable', []),
                currentPlanName: 'TestPlan',
                stepParams: { schema: 'validSchema' }
            }

            jest.spyOn(Schema, 'ListEntities').mockResolvedValue(HttpResponse.Ok(
                <TSchemaResponse>{
                    ...typia.random<TSchemaResponse>(),
                    data: new DataTable('TestTable', [{ name: 'entity1' }, { name: 'entity2' }])
                }))

            const result = await Step.ListEntities(stepArguments)

            expect(result).toBeInstanceOf(DataTable)
            expect(result.Rows).toHaveLength(2)
        })

        // Returns a DataTable with plan entities when schema is not provided
        it('should return DataTable with plan entities when schema is not provided', async () => {

            Config.Configuration.plans = {
                plan1: {
                    entity1: typia.random<StepCommand[]>()
                }
            }

            const data = new DataTable('table1', [
                {
                    name: 'entity1',
                    type: 'plan entity'
                }
            ])

            // Mock stepArguments          
            const stepArguments = {
                currentSchemaName: 'schema1',
                currentDataTable: data,
                currentPlanName: 'plan1',
                stepParams: {}
            }

            jest.spyOn(Schema, 'ListEntities').mockResolvedValue(HttpResponse.Ok(
                <TSchemaResponse>{
                    ...typia.random<TSchemaResponse>(),
                    data: new DataTable('table2', [
                        {
                            name: 'entity2',
                            type: 'plan entity'
                        }
                    ])
                }))

            const result = await Step.ListEntities(stepArguments)

            // Assertion
            expect(result).toEqual(data)
        })

        // Successfully calls Schema.ListEntities with the correct schemaRequest
        it('should call Schema.ListEntities with correct schemaRequest when schema is provided', async () => {
            // Arrange
            const stepArguments = {
                currentSchemaName: 'currentSchema',
                currentDataTable: new DataTable(),
                currentPlanName: 'currentPlan',
                stepParams: { schema: 'testSchema' }
            }

            jest.spyOn(Schema, 'ListEntities').mockResolvedValue(HttpResponse.Ok(
                <TSchemaResponse>{
                    ...typia.random<TSchemaResponse>(),
                    data: new DataTable('TestTable', [{ name: 'entity1' }, { name: 'entity2' }])
                }))

            // Act
            await Step.ListEntities(stepArguments)

            // Assert
            expect(Schema.ListEntities).toHaveBeenCalledWith({ schema: 'testSchema' })
        })
    })
})