

import { JsonHelper } from "../JsonHelper"

describe('JsonHelper', () => {

    // JsonToArray method returns an array of objects from a JSON object
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

    // JsonToArray method returns an empty array when given an empty JSON object
    it('should return an empty array when given an empty JSON object', () => {
        const obj = {}
        const expected: any = []

        const result = JsonHelper.ToArray(obj)

        expect(result).toEqual(expected)
    })
})
