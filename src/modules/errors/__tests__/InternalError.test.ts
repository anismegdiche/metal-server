import { describe, expect, it } from 'vitest'
import { InternalError, WarnError } from '../InternalError'
import { VERBOSITY } from '../../../utils/Logger'


describe('InternalError', () => {
    it('should set name, verbosity, and message', () => {
        const error = new InternalError(VERBOSITY.ERROR, 'boom')

        expect(error.name).toBe('InternalError')
        expect(error.verbosity).toBe(VERBOSITY.ERROR)
        expect(error.message).toBe('boom')
    })

    it('should default message to empty string', () => {
        const error = new InternalError(VERBOSITY.WARN)

        expect(error.message).toBe('')
    })
})

describe('WarnError', () => {
    it('should set warning verbosity and default message', () => {
        const error = new WarnError()

        expect(error.name).toBe('WarnError')
        expect(error.verbosity).toBe(VERBOSITY.WARN)
        expect(error.message).toBe('Warning')
    })

    it('should allow overriding the default message', () => {
        const error = new WarnError('custom')

        expect(error.message).toBe('custom')
    })
})
