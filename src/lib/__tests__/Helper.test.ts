// Generated by CodiumAI

import { Helper } from "../Helper"

describe('HasExpectedProperties', () => {

    // Returns true when all properties in the object match the expected properties
    it('should return true when all properties in the object match the expected properties', () => {
        const obj = {
            a: 1,
            b: 2,
            c: 3
        }
        const expectedProperties = ['a', 'b', 'c']
        const result = Helper.HasExpectedProperties(obj, expectedProperties)
        expect(result).toBe(true)
    })

    // Handles objects with nested properties
    it('should return true when object has nested properties not in expected properties', () => {
        const obj = {
            a: 1,
            b: { nested: 2 },
            c: 3
        }
        const expectedProperties = ['a', 'b', 'c']
        const result = Helper.HasExpectedProperties(obj, expectedProperties)
        expect(result).toBe(true)
    })

    // Returns false when any property in the object does not match the expected properties
    it('should return false when any property does not match expected properties', () => {
        // Test data
        const obj = {
            key1: 'value1',
            key2: 'value2'
        }
        const expectedProperties = ['key1', 'key3']

        // Assertion
        expect(Helper.HasExpectedProperties(obj, expectedProperties)).toBe(false)
    })

    // Works correctly with an empty object and an empty expected properties array
    it('should work correctly with an empty object and empty expected properties array', () => {
        // Initialize the Helper class

        // Test data
        const obj = {}
        const expectedProperties: any = []

        // Assertion
        expect(Helper.HasExpectedProperties(obj, expectedProperties)).toBe(true)
    })

    // Works correctly with an object that has no properties but expected properties array is not empty
    it('should work correctly with an object having no properties but non-empty expected properties array', () => {
        // Test data
        const obj = {}
        const expectedProperties = ['key1', 'key2']

        // Assertion
        expect(Helper.HasExpectedProperties(obj, expectedProperties)).toBe(false)
    })

    // Works correctly with an object that has properties but expected properties array is empty
    it('should return true when object has properties but expected properties array is empty', () => {
        const obj = {
            key1: 'value1',
            key2: 'value2'
        }
        const expectedProperties: any = []
        expect(Helper.HasExpectedProperties(obj, expectedProperties)).toBe(true)
    })

    // Handles objects with properties that have null or undefined values
    it('should return true when object has properties with null or undefined values', () => {
        const obj = {
            key1: null,
            key2: undefined
        }
        const expectedProperties = ['key1', 'key2']
        expect(Helper.HasExpectedProperties(obj, expectedProperties)).toBe(true)
    })
})