/* eslint-disable max-lines-per-function */

import { DataTable } from "../../types/DataTable"
import { Step } from "../Step"
import { Plan } from "../Plan"

describe('Step', () => {

    describe('select', () => {
        // Executes a valid 'select' step and returns a DataTable object.
        it('should execute a valid select step and return a DataTable object', async () => {
            // Mock the necessary dependencies
            const schemaName = "mySchema"
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
            const result = await Plan.ExecuteSteps(schemaName, plan, entity, steps)

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
            const schemaName = "mySchema"
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
            const result = await Plan.ExecuteSteps(schemaName, plan, entity, steps)

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

    describe('insert', () => {

        // Executes a valid 'insert' step and returns a DataTable object.
        it('should execute a valid insert step and return a DataTable object', async () => {
            // Mock the necessary dependencies
            const schemaName = "mySchema"
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
            const result = await Plan.ExecuteSteps(schemaName, plan, entity, steps)

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
            const schemaName = "mySchema"
            const plan = "myPlan"
            const entity = "users"
            const steps = [
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
            const result = await Plan.ExecuteSteps(schemaName, plan, entity, steps)

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

    describe('update', () => {
        // Executes a valid 'update' step and returns a DataTable object.
        it('should execute a valid update step and return a DataTable object', async () => {
            // Mock the necessary dependencies
            const schemaName = "mySchema"
            const plan = "myPlan"
            const entity = "myEntity"
            const steps = [
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
            const result = await Plan.ExecuteSteps(schemaName, plan, entity, steps)

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
            const schemaName = "mySchema"
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
            const result = await Plan.ExecuteSteps(schemaName, plan, entity, steps)

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
    describe('delete', () => {
        // Executes a valid 'delete' step and returns a DataTable object.
        it('should execute a valid delete step and return a DataTable object', async () => {
            // Mock the necessary dependencies
            const schemaName = "mySchema"
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
            const result = await Plan.ExecuteSteps(schemaName, plan, entity, steps)

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

    describe('join', () => {
        // Executes a valid 'join' step and returns a DataTable object.
        it('should execute a valid join step and return a DataTable object', async () => {
            // Mock the necessary dependencies
            const schemaName = "mySchema"
            const plan = "myPlan"
            const entity = "myEntity"
            const steps = [
                {
                    join: {
                        entity: "orders",
                        type: "left",
                        "leftField": "user_id",
                        "rightField": "id"
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
            const result = await Plan.ExecuteSteps(schemaName, plan, entity, steps)

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

    describe('fields', () => {
        // Executes a valid 'fields' step and returns a DataTable object.
        it('should execute a valid fields step and return a DataTable object', async () => {
            // Mock the necessary dependencies
            const schemaName = "mySchema"
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
            const result = await Plan.ExecuteSteps(schemaName, plan, entity, steps)

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

    describe('debug', () => {
        // Executes a valid 'debug' step and returns a DataTable object.
        it('should execute a valid debug step and return a DataTable object', async () => {
            // Mock the necessary dependencies
            const schemaName = "mySchema"
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
            const result = await Plan.ExecuteSteps(schemaName, plan, entity, steps)

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

    describe('anonymize', () => {
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
})