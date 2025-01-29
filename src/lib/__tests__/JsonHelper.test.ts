/* eslint-disable @typescript-eslint/no-explicit-any */


import { JsonHelper } from "../JsonHelper"

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

            const result = JsonHelper.ToArray(obj)

            expect(result).toEqual(expected)
        })

        it('should return an empty array when given an empty JSON object', () => {
            const obj = {}
            const expected: any = []

            const result = JsonHelper.ToArray(obj)

            expect(result).toEqual(expected)
        })
    })

    describe('TryParse', () => {

        it('should not convert number to date', () => {
            const objString = `{
            "field1": "1000"
            }`
            const expected = { field1: "1000" }

            const result = JsonHelper.TryParse(objString, undefined)

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

            const result = JsonHelper.PrefixKeys(input, "web:")
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
            const result = JsonHelper.PrefixKeys(input, 'test.')
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
            const result = JsonHelper.PrefixKeys(input, 'P:')
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
            const result = JsonHelper.PrefixKeys(input, 'pre.')
            expect(result).toEqual(expected)
        })

        // Handles empty objects correctly
        it('should return empty object when input is empty', () => {
            const input = {}
            const result = JsonHelper.PrefixKeys(input, 'test.')
            expect(result).toEqual({})
        })

        // Works with default empty prefix
        it('should work with default empty prefix', () => {
            const input = { key: 'value' }
            const result = JsonHelper.PrefixKeys(input)
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
            const result = JsonHelper.PrefixKeys(input, 'pre.')
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
            const result = JsonHelper.PrefixKeys(input, 'pre.')
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
            const result = JsonHelper.PrefixKeys(input, 'pre.')
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
            const result = JsonHelper.PrefixKeys(input, 'pre.')
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
            const result = JsonHelper.PrefixKeys(input, 'pre.')
            expect(typeof result['pre.num']).toBe('number')
            expect(typeof result['pre.str']).toBe('string')
            expect(typeof result['pre.bool']).toBe('boolean')
            expect(Array.isArray(result['pre.arr'])).toBe(true)
        })
    })
})
