/* eslint-disable @typescript-eslint/no-explicit-any */


import { HttpErrorInternalServerError } from "../../modules/errors/HttpErrors"
import { TJson } from "../../types/TJson"
import { JsonUtils } from "../JsonUtils"

describe('JsonHelper', () => {

    describe('ToArray', () => {

        it('should return an array of objects when given a valid JSON object', () => {
            const obj = {
                field1: "value1",
                field2: "value2"
            }
            const expected = [
                { field1: "value1" },
                { field2: "value2" }
            ]

            const result = JsonUtils.ToArray(obj)

            expect(result).toEqual(expected)
        })

        it('should return an empty array when given an empty JSON object', () => {
            const obj = {}
            const expected: any = []

            const result = JsonUtils.ToArray(obj)

            expect(result).toEqual(expected)
        })
    })

    describe('TryParse', () => {

        it('should not convert number to date', () => {
            const objString = `{
            "field1": "1000"
            }`
            const expected = { field1: "1000" }

            const result = JsonUtils.TryParse(objString, undefined)

            expect(result).toEqual(expected)
        })
    })

    describe('PrefixKeys', () => {

        it('should prefix childs', () => {
            const input = {
                movies: {
                    id: {
                        title: "Fight Club",
                        description: "An insomniac office worker and a devil-may-care soapmaker form an underground fight club that evolves into something much, much more.",
                        releaseDate: "2023-01-01T01:10:10",
                        availableOnDvd: true
                    }
                }
            }

            const expected = {
                "web:movies": {
                    "web:id": {
                        "web:title": "Fight Club",
                        "web:description": "An insomniac office worker and a devil-may-care soapmaker form an underground fight club that evolves into something much, much more.",
                        "web:releaseDate": "2023-01-01T01:10:10",
                        "web:availableOnDvd": true
                    }
                }
            }

            const result = JsonUtils.PrefixKeys(input, "web:")
            expect(result).toEqual(expected)
        })

        // Prefixes keys of a flat object with given prefix string
        it('should add prefix to all keys in flat object', () => {
            const input = {
                name: 'John',
                age: 30
            }
            const expected = {
                'test.name': 'John',
                'test.age': 30
            }
            const result = JsonUtils.PrefixKeys(input, 'test.')
            expect(result).toEqual(expected)
        })

        // Recursively prefixes keys in nested objects with dot notation
        it('should recursively prefix nested object keys', () => {
            const input = {
                user: {
                    name: 'John',
                    address: { city: 'NY' }
                }
            }
            const expected = {
                "P:user": {
                    "P:name": 'John',
                    "P:address": { "P:city": 'NY' }
                }
            }
            const result = JsonUtils.PrefixKeys(input, 'P:')
            expect(result).toEqual(expected)
        })

        // Returns object with same values but prefixed keys
        it('should maintain original values while prefixing keys', () => {
            const input = {
                count: 42,
                enabled: true,
                name: 'test'
            }
            const expected = {
                'pre.count': 42,
                'pre.enabled': true,
                'pre.name': 'test'
            }
            const result = JsonUtils.PrefixKeys(input, 'pre.')
            expect(result).toEqual(expected)
        })

        // Handles empty objects correctly
        it('should return empty object when input is empty', () => {
            const input = {}
            const result = JsonUtils.PrefixKeys(input, 'test.')
            expect(result).toEqual({})
        })

        // Works with default empty prefix
        it('should work with default empty prefix', () => {
            const input = { key: 'value' }
            const result = JsonUtils.PrefixKeys(input)
            expect(result).toEqual({ key: 'value' })
        })

        // Handles null values in object properties
        it('should preserve null values in properties', () => {
            const input = {
                nullKey: null,
                validKey: 'value'
            }
            const expected = {
                'pre.nullKey': null,
                'pre.validKey': 'value'
            }
            const result = JsonUtils.PrefixKeys(input, 'pre.')
            expect(result).toEqual(expected)
        })

        // Processes objects with array values without modifying arrays
        it('should keep arrays intact while prefixing their keys', () => {
            const input = {
                list: [1, 2, 3],
                name: 'test'
            }
            const expected = {
                'pre.list': [1, 2, 3],
                'pre.name': 'test'
            }
            const result = JsonUtils.PrefixKeys(input, 'pre.')
            expect(result).toEqual(expected)
        })

        // Manages objects with undefined values
        it('should handle undefined values correctly', () => {
            const input = {
                key1: undefined,
                key2: 'value'
            }
            const expected = {
                'pre.key1': undefined,
                'pre.key2': 'value'
            }
            const result = JsonUtils.PrefixKeys(input, 'pre.')
            expect(result).toEqual(expected)
        })

        // Processes objects with special characters in keys
        it('should handle special characters in keys', () => {
            const input = {
                '@special': 'value',
                '$key': 123
            }
            const expected = {
                'pre.@special': 'value',
                'pre.$key': 123
            }
            const result = JsonUtils.PrefixKeys(input, 'pre.')
            expect(result).toEqual(expected)
        })

        // Maintains value types after transformation
        it('should preserve all value types after transformation', () => {
            const input = {
                num: 42,
                str: 'test',
                bool: true,
                obj: { key: 'value' },
                arr: [1, 2, 3]
            }
            const result = JsonUtils.PrefixKeys(input, 'pre.')
            expect(typeof result['pre.num']).toBe('number')
            expect(typeof result['pre.str']).toBe('string')
            expect(typeof result['pre.bool']).toBe('boolean')
            expect(Array.isArray(result['pre.arr'])).toBe(true)
        })
    })

    describe('Get', () => {

        // Returns nested value from JSON object when valid jsonPath is provided
        it('should return nested value when valid path is provided', () => {
            const json = { user: { name: 'John' } }
            const result = JsonUtils.Get<string>(json, 'user.name')
            expect(result).toBe('John')
        })

        // Returns entire JSON object when jsonPath is undefined
        it('should return entire JSON object when path is undefined', () => {
            const json = {
                id: 1,
                name: 'Test'
            }
            const result = JsonUtils.Get<TJson>(json)
            expect(result).toEqual(json)
        })

        // Returns defaultValue when specified path doesn't exist
        it('should return default value when path does not exist', () => {
            const json = { user: { age: 30 } }
            const result = JsonUtils.Get<string>(json, 'user.email', 'default@email.com')
            expect(result).toBe('default@email.com')
        })

        // Correctly handles nested objects with dot notation paths
        it('should handle deeply nested objects with dot notation', () => {
            const json = { a: { b: { c: { d: 'value' } } } }
            const result = JsonUtils.Get<string>(json, 'a.b.c.d')
            expect(result).toBe('value')
        })

        // Successfully type casts returned value to generic type T
        it('should type cast returned value to specified generic type', () => {
            const json = { count: '42' }
            const result = JsonUtils.Get<number>(json, 'count')
            expect(typeof result).toBe('string')
        })

        // Handles empty JSON object input
        it('should handle empty JSON object input', () => {
            const json = {}
            const result = JsonUtils.Get<any>(json, 'prop', 'default')
            expect(result).toBe('default')
        })

        // Handles undefined/null defaultValue
        it('should return undefined when default value is undefined', () => {
            const json = { user: {} }
            const result = JsonUtils.Get<string>(json, 'user.name', undefined)
            expect(result).toBeUndefined()
        })

        // Handles invalid jsonPath format
        it('should handle invalid jsonPath format gracefully', () => {
            const json = { data: 'test' }
            const result = JsonUtils.Get<string>(json, '..invalid..path..', 'fallback')
            expect(result).toBe('fallback')
        })

        // Handles non-existent nested paths
        it('should handle non-existent nested paths', () => {
            const json = { level1: { level2: {} } }
            const result = JsonUtils.Get<any>(json, 'level1.level2.level3.level4')
            expect(result).toBeUndefined()
        })

        // Handles array indexing in jsonPath
        it('should handle array indexing in path', () => {
            const json = { items: ['a', 'b', 'c'] }
            const result = JsonUtils.Get<string>(json, 'items[1]')
            expect(result).toBe('b')
        })

        // Handles special characters in jsonPath
        it('should handle special characters in path', () => {
            const json = { 'special@key': { '$value': 123 } }
            const result = JsonUtils.Get<number>(json, '["special@key"].$value')
            expect(result).toBe(123)
        })

        // Returns undefined when path exists but value is undefined
        it('should return undefined for existing path with undefined value', () => {
            const json = { prop: undefined }
            const result = JsonUtils.Get<any>(json, 'prop')
            expect(result).toBeUndefined()
        })

        it('should get an array item', () => {
            const json = {
                data: [
                    {
                        id: 1,
                        name: 'Item 1'
                    },
                    {
                        id: 2,
                        name: 'Item 2'
                    },
                    {
                        id: 3,
                        name: 'Item 3'
                    }
                ]
            }
            const result = JsonUtils.Get<any>(json, 'data[1].name')
            expect(result).toBe('Item 2')
        })
    })

    describe('Set', () => {

        // Setting data with valid jsonPath updates nested object property
        it('should update nested object property when valid jsonPath provided', () => {
            const json = { user: { name: 'John' } }
            const result = JsonUtils.Set(json, 'user.name', 'Jane')
            expect(result.user.name).toBe('Jane')
        })

        // Setting data without jsonPath replaces entire json object with data
        it('should replace entire json object when no jsonPath provided', () => {
            const json = { old: 'data' }
            const newData = { new: 'data' }
            const result = JsonUtils.Set(json, undefined, newData)
            expect(result).toEqual(newData)
        })

        // Setting data with empty jsonPath updates root object property
        it('should throw errro if path empty and data is not object', () => {
            const json = { prop: 'old' }
            try {
                JsonUtils.Set(json, '', 'new')
            } catch (error) {
                expect(error).toBeInstanceOf(HttpErrorInternalServerError)
            }
        })

        // Setting data with numeric jsonPath updates array element
        it('should update array element when numeric jsonPath provided', () => {
            const json = ['a', 'b', 'c']
            const result = JsonUtils.Set(json, '1', 'updated')
            expect(result[1]).toBe('updated')
        })

        // Setting data preserves original object type via generic T
        it('should preserve original type when using generic type parameter', () => {
            interface User { name: string; age: number }
            const json: User = {
                name: 'John',
                age: 30
            }
            const result = JsonUtils.Set<User>(json, 'age', 31)
            expect(result.age).toBe(31)
            expect(result).toHaveProperty('name')
        })

        // Setting data with undefined jsonPath returns original json
        it('should throw errro if path undefined and data is not object', () => {
            const json = { prop: 'old' }
            try {
                JsonUtils.Set(json, undefined, 'new')
            } catch (error) {
                expect(error).toBeInstanceOf(HttpErrorInternalServerError)
            }
        })

        // Setting undefined data returns original json unmodified
        it('should return original json when data is undefined', () => {
            const json = { test: 'value' }
            const result = JsonUtils.Set(json, 'test', undefined)
            expect(result).toBe(json)
        })

        // Setting data with null jsonPath returns original json
        it('should throw errro if path null and data is not object', () => {
            const json = { prop: 'old' }
            try {
                JsonUtils.Set(json, null as any, 'new')
            } catch (error) {
                expect(error).toBeInstanceOf(HttpErrorInternalServerError)
            }
        })

        // Setting data with invalid jsonPath creates new nested properties
        it('should create new nested properties when invalid jsonPath provided', () => {
            const json = {}
            const result = JsonUtils.Set(json, 'a.b.c', 'value')
            expect(result).toEqual({ a: { b: { c: 'value' } } })
        })

        // Setting data with array index path updates array elements
        it('should update array elements when array index path provided', () => {
            const json = { items: ['a', 'b', 'c'] }
            const result = JsonUtils.Set(json, 'items[1]', 'updated')
            expect(result.items[1]).toBe('updated')
        })

        // Setting data with deep nested path creates intermediate objects
        it('should create intermediate objects when deep nested path provided', () => {
            const json = {}
            const result = JsonUtils.Set(json, 'deeply.nested.path', 'value')
            expect(result).toEqual({
                deeply: {
                    nested: {
                        path: 'value'
                    }
                }
            })
        })

        it('should set an array item', () => {
            const json = {
                data: [
                    {
                        id: 1,
                        name: 'Item 1'
                    },
                    {
                        id: 2,
                        name: 'Item 2'
                    },
                    {
                        id: 3,
                        name: 'Item 3'
                    }
                ]
            }
            const result = JsonUtils.Set<any>(json, 'data[1].name', "New Item 2")
            expect(result).toEqual({
                data: [
                    {
                        id: 1,
                        name: 'Item 1'
                    },
                    {
                        id: 2,
                        name: 'New Item 2'
                    },
                    {
                        id: 3,
                        name: 'Item 3'
                    }
                ]
            })
        })
    })
})
