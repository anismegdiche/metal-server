

import { JsonHelper } from "../../lib/JsonHelper"
import { DataTable } from "../../types/DataTable"
import { TCacheData } from "../../types/TCacheData"
import { TSchemaRequest } from "../../types/TSchemaRequest"
import { DataProviderOptions } from "../absDataProvider"

// mock related classes
jest.mock('../data/FilesData')
jest.mock('../data/MemoryData')
jest.mock('../data/MetalData')
jest.mock('../data/MongoDbData')
jest.mock('../data/MySqlData')
jest.mock('../data/PostgresData')
jest.mock('../data/PlanData')
jest.mock('../data/SqlServerData')
jest.mock('../data/WebServiceData')
jest.mock('../../server/Step')


describe('DataProviderOptions', () => {

  // Parse method correctly transforms TSchemaRequest into TOptions object
  it('should transform valid TSchemaRequest into TOptions object', () => {
    const providerOptions = new DataProviderOptions()
    const request: TSchemaRequest = {
      schema: 'test',
      entity: 'entity',
      fields: 'field1,field2',
      sort: 'name asc',
      cache: 300
    }

    const result = providerOptions.Parse(request)

    expect(result.Fields).toBe('field1,field2')
    expect(result.Sort).toBe('name asc')
    expect(result.Cache).toBe(300)
  })

  // GetFilter processes both filter-expression and filter fields from request
  it('should process both filter-expression and filter fields', () => {
    const provider = new DataProviderOptions()
    const request: TSchemaRequest = {
      schema: 'test',
      entity: 'entity',
      'filter-expression': 'name = "test"',
      filter: { id: 1 }
    }

    const result = provider.GetFilter({}, request)

    expect(result.Filter).toBeDefined()
    expect(JsonHelper.Stringify(result.Filter)).toContain('id')
  })

  // GetFields returns '*' when no fields specified in request
  it('should return asterisk when fields not specified', () => {
    const provider = new DataProviderOptions()
    const request: TSchemaRequest = {
      schema: 'test',
      entity: 'entity'
    }

    const result = provider.GetFields({}, request)

    expect(result.Fields).toBe('*')
  })

  // GetData creates new DataTable instance from request data
  it('should create DataTable from request data', () => {
    const provider = new DataProviderOptions()
    const request: TSchemaRequest = {
      schema: 'test',
      entity: 'entity',
      data: [
        {
          id: 1,
          name: 'test'
        }
      ]
    }

    const result = provider.GetData({}, request)

    expect(result.Data).toBeInstanceOf(DataTable)
    expect(result.Data?.Rows.length).toBe(1)
  })

  // GetSort transfers sort parameter from request to options
  it('should transfer sort parameter to options', () => {
    const provider = new DataProviderOptions()
    const request: TSchemaRequest = {
      schema: 'test',
      entity: 'entity',
      sort: 'name desc'
    }

    const result = provider.GetSort({}, request)

    expect(result.Sort).toBe('name desc')
  })

  // GetCache copies cache value from request to options when present
  it('should copy cache value to options when present', () => {
    const provider = new DataProviderOptions()
    const request: TSchemaRequest = {
      schema: 'test',
      entity: 'entity',
      cache: 600
    }

    const result = provider.GetCache({}, request)

    expect(result.Cache).toBe(600)
  })

  // Handle empty or undefined schemaRequest in Parse method
  // it('should return empty options for undefined request', () => {
  //   const provider = new DataProviderOptions();

  //   const result = provider.Parse({undefined});

  //   expect(result).toEqual({});
  // });

  // Process TCacheData arrays without evaluation in GetData
  it('should process TCacheData arrays without evaluation', () => {
    const provider = new DataProviderOptions()
    const cacheData: TCacheData[] = [
      {
        hash: '123',
        expires: 123,
        schema: 'test',
        data: new DataTable('test'),
        schemaRequest: {
          schema: 'test',
          entity: 'entity'
        }
      }
    ]
    const request: TSchemaRequest = {
      schema: 'test',
      entity: 'entity',
      data: cacheData
    }

    const result = provider.GetData({}, request)

    expect(result.Data).toBeInstanceOf(DataTable)
  })

  // Handle undefined fields parameter in GetFields
  it('should handle undefined fields parameter', () => {
    const provider = new DataProviderOptions()
    const request: TSchemaRequest = {
      schema: 'test',
      entity: 'entity',
      fields: undefined
    }

    const result = provider.GetFields({}, request)

    expect(result.Fields).toBe('*')
  })

  // Manage concurrent filter-expression and filter fields in GetFilter
  it('should handle both filter types concurrently', () => {
    const provider = new DataProviderOptions()
    const request: TSchemaRequest = {
      schema: 'test',
      entity: 'entity',
      'filter-expression': 'id > 5',
      filter: { status: 'active' }
    }

    const result = provider.GetFilter({}, request)

    expect(result.Filter).toBeDefined()
    expect(JsonHelper.Stringify(result.Filter)).toContain('status')
  })

  // Process empty or malformed sort parameters
  it('should handle empty sort parameter', () => {
    const provider = new DataProviderOptions()
    const request: TSchemaRequest = {
      schema: 'test',
      entity: 'entity',
      sort: ''
    }

    const result = provider.GetSort({}, request)

    expect(result.Sort).toBe(undefined)
  })
})
