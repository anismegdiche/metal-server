import { describe, expect, it, vi, beforeEach } from 'vitest'
import { absAiEngine } from '../absAiEngine'
import { AI_ENGINE } from '../../@consts'
import type { TAiArguments, TAiOutput } from '../../@types'

vi.mock('axios', () => ({
    default: {
        post: vi.fn(),
        get: vi.fn()
    }
}))

vi.mock('../../../../utils/Utils', () => ({
    Utils: {
        Sleep: vi.fn().mockResolvedValue(undefined)
    }
}))

vi.mock('../../../../utils/Logger', () => ({
    Logger: {
        Info: vi.fn(),
        Warn: vi.fn(),
        Debug: vi.fn(),
        In: 'in',
        Out: 'out',
        LogFunction: () => (_target: object, _key: string, descriptor: PropertyDescriptor) => descriptor
    },
    LOGGER_DEFAULT_LEVEL: 'warn'
}))

class TestAiEngine extends absAiEngine {
    AiEngineName = AI_ENGINE.OCR
    AiDockerService = {}
    RunTask = {}
    async Run(_params: TAiArguments): Promise<TAiOutput> { return { status: 'ok' } as TAiOutput }
    async Prepare(): Promise<void> {
        // No implementation needed for test
    }
}

const axiosModule = await import('axios')

const axios = axiosModule.default

describe('absAiEngine', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('should retry on 429 and return response', async () => {
        const engine = new TestAiEngine()
        engine.InstanceApiUrl = 'http://localhost'
        engine.InstanceName = 'test'

        vi.mocked(axios.post)
            .mockRejectedValueOnce({ response: { status: 429 } })
            .mockResolvedValueOnce({ status: 200 })

        const result = await engine._postData({ hello: 'world' })

        expect(result.status).toBe(200)
        expect(axios.post).toHaveBeenCalledTimes(2)
    })

    it('should retry on non-429 errors and eventually succeed', async () => {
        const engine = new TestAiEngine()
        engine.InstanceApiUrl = 'http://localhost'
        engine.InstanceName = 'test'

        vi.mocked(axios.post)
            .mockRejectedValueOnce({ message: 'fail' })
            .mockResolvedValueOnce({ status: 200 })

        const result = await engine._postData('payload')

        expect(result.status).toBe(200)
        expect(axios.post).toHaveBeenCalledTimes(2)
    })

    it('should report healthy when status 200', async () => {
        const engine = new TestAiEngine()
        engine.InstanceApiUrl = 'http://localhost'
        engine.InstanceName = 'test'
        vi.mocked(axios.get).mockResolvedValue({ status: 200 })

        const result = await engine.IsHealthy()

        expect(result).toBe(true)
    })

    it('should report unhealthy on request failure', async () => {
        const engine = new TestAiEngine()
        engine.InstanceApiUrl = 'http://localhost'
        engine.InstanceName = 'test'
        vi.mocked(axios.get).mockRejectedValue(new Error('fail'))

        const result = await engine.IsHealthy()

        expect(result).toBe(false)
    })
})
