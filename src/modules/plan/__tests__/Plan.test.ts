import { TypeUtils } from "../../../utils/TypeUtils"
import { DataTable } from "../../../types/DataTable"
import { TSchemaRequest } from "../../schema/types/TSchemaRequest"
import { Plan } from "../Plan"
import { ConfigManager } from "../../core/ConfigManager"
import { TStep } from "../types/TStep"


// Mock the Logger
jest.mock('../../../utils/Logger', () => ({
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

describe('Process', () => {

    // Process a valid TSchemaRequest and return a DataTable
    it('should return a DataTable when processing a valid TSchemaRequest', async () => {
        const schemaRequest = {
            schema: 'testSchema',
            entity: 'testEntity',
            data: [
                {
                    id: 1,
                    name: 'Test'
                }
            ]
        }
        const sqlQuery = 'SELECT * FROM testEntity'

        const _plan = new Plan("TestPlan")

        jest.spyOn(TypeUtils, 'IsSchemaRequest').mockReturnValue(true)
        jest.spyOn(_plan, 'ProcessSchemaRequest').mockResolvedValue(new DataTable())

        const result = await _plan.ProcessSchemaRequest(schemaRequest, sqlQuery)

        expect(result).toBeInstanceOf(DataTable)
        expect(_plan.ProcessSchemaRequest).toHaveBeenCalledWith(schemaRequest, sqlQuery)
    })

    // Process a valid TScheduleConfig and return a DataTable
    it('should process valid TScheduleConfig and return a DataTable', async () => {
        // Arrange
        const scheduleConfig = {
            plan: 'TestPlan',
            entity: 'TestEntity',
            cron: '* * * * *'
        }

        const steps: TStep[] = []

        const _plan = new Plan("TestPlan")
        _plan.Entities.set("TestEntity", [])

        jest.spyOn(_plan, 'ExecuteSteps').mockResolvedValue(new DataTable())
        jest.spyOn(ConfigManager, 'Get').mockReturnValueOnce(steps)

        // Act
        const result = await _plan.ProcessScheduleConfig(scheduleConfig)

        // expect ExecuteSteps to have been called
        expect(_plan.ExecuteSteps).toHaveBeenCalledWith(undefined,scheduleConfig.plan,scheduleConfig.entity,steps)

        // Assert
        expect(result).toEqual(undefined)
    })

    // Handle a valid SQL query with TSchemaRequest
    it('should handle valid SQL query with TSchemaRequest', async () => {
        // Arrange
        const schemaRequest: TSchemaRequest = {
            anonymize: 'email',
            schema: 'TestSchema',
            entity: 'TestEntity',
            data: [
                {
                    id: 1,
                    name: 'Alice'
                }
            ],
            fields: 'id, name',
            filter: { id: 1 },
            "filter-expression": 'id = 1',
            sort: { 'name': undefined },
            cache: 60,
            source: 'TestSource'
        }
        const sqlQuery = 'SELECT * FROM TestEntity'

        const _plan = new Plan("TestPlan")
        _plan.Entities.set("TestEntity", [])

        // Act
        const result = await _plan.ProcessSchemaRequest(schemaRequest, sqlQuery)

        // Assert
        expect(result).toBeInstanceOf(DataTable)
    })

    // Handle a valid SQL query with TScheduleConfig
    it('should handle a valid SQL query with TScheduleConfig', async () => {
        // Arrange
        const schemaRequest = {
            schema: 'TestPlan',
            entity: 'TestEntity',
            source: 'TestSource'
        }
        const sqlQuery = 'SELECT * FROM TestEntity'

        const _plan = new Plan("TestPlan")
        _plan.Entities.set("TestEntity", [])

        // Act
        const result = await _plan.ProcessSchemaRequest(schemaRequest, sqlQuery)

        // Assert
        expect(result).toBeInstanceOf(DataTable)
    })
})
