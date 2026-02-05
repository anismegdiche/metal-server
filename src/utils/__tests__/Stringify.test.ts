import { describe, expect, it } from 'vitest'
import { Stringify } from '../JsonUtils/Stringify'


describe('Stringify', () => {
    it('should stringify plain objects with JSON.stringify', () => {
        const result = Stringify({ a: 1, b: 'test' })
        expect(result).toBe('{"a":1,"b":"test"}')
    })

    it('should stringify circular objects with safe fallback', () => {
        const obj: { self?: unknown } = {}
        obj.self = obj

        const result = Stringify(obj)

        expect(typeof result).toBe('string')
        expect(result.length).toBeGreaterThan(0)
    })
})
