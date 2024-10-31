import { TypeHelper } from "../../lib/TypeHelper"
import { DataTable } from "../../types/DataTable"
import { Plan } from "../Plan"

describe('Process', () => {

    // Process a valid TSchemaRequest and return a DataTable
    it('should return a DataTable when processing a valid TSchemaRequest', async () => {
        const schemaRequest = {
            schema: 'testSchema',
            entityName: 'testEntity',
            data: [
                {
                    id: 1,
                    name: 'Test'
                }
            ]
        }
        const sqlQuery = 'SELECT * FROM testEntity'

        jest.spyOn(TypeHelper, 'IsSchemaRequest').mockReturnValue(true)
        jest.spyOn(Plan, 'ProcessSchemaRequest').mockResolvedValue(new DataTable())

        const result = await Plan.Process(schemaRequest, sqlQuery)

        expect(result).toBeInstanceOf(DataTable)
        expect(Plan.ProcessSchemaRequest).toHaveBeenCalledWith(schemaRequest, sqlQuery)
    })

    // Handle undefined sqlQuery gracefully
    it('should handle undefined sqlQuery gracefully', async () => {
        const schemaRequest = {
            schema: 'testSchema',
            entityName: 'testEntity',
            data: [
                {
                    id: 1,
                    name: 'Test'
                }
            ]
        }

        jest.spyOn(TypeHelper, 'IsSchemaRequest').mockReturnValue(true)
        jest.spyOn(Plan, 'ProcessSchemaRequest').mockResolvedValue(new DataTable())

        const result = await Plan.Process(schemaRequest)

        expect(result).toBeInstanceOf(DataTable)
        expect(Plan.ProcessSchemaRequest).toHaveBeenCalledWith(schemaRequest, undefined)
    })

    // Process a valid TScheduleConfig and return a DataTable
    it('should process valid TScheduleConfig and return a DataTable', async () => {
        // Arrange
        const scheduleConfig = {
            planName: 'TestPlan',
            entityName: 'TestEntity',
            cron: '* * * * *'
        }

        // Act
        const result = await Plan.Process(scheduleConfig)

        // Assert
        expect(result).toBeInstanceOf(DataTable)
    })

    // Handle a valid SQL query with TSchemaRequest
    it('should handle valid SQL query with TSchemaRequest', async () => {
        // Arrange
        const schemaRequest = {
            anonymize: 'email',
            schema: 'TestSchema',
            entityName: 'TestEntity',
            data: [
                {
                    id: 1,
                    name: 'Alice'
                }
            ],
            fields: 'id, name',
            filter: { id: 1 },
            "filter-expression": 'id = 1',
            sort: 'name',
            cache: 60,
            sourceName: 'TestSource'
        }
        const sqlQuery = 'SELECT * FROM TestTable'

        // Act
        const result = await Plan.Process(schemaRequest, sqlQuery)

        // Assert
        expect(result).toBeInstanceOf(DataTable)
    })

    // Handle a valid SQL query with TScheduleConfig
    it('should handle a valid SQL query with TScheduleConfig', async () => {
        // Arrange
        const schemaRequest = {
            schema: 'TestSchema',
            entityName: 'TestEntity'
        }
        const sqlQuery = 'SELECT * FROM TestTable'

        // Act
        const result = await Plan.Process(schemaRequest, sqlQuery)

        // Assert
        expect(result).toBeInstanceOf(DataTable)
    })
})
