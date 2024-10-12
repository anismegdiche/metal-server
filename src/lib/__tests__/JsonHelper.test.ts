

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
})
