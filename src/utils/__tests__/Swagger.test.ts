import type { Express } from 'express'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { Swagger } from '../Swagger'
import { ROUTE } from '../../modules/core/@consts'

vi.mock('../Logger', () => ({
    Logger: {
        LogFunction: () => (_target: object, _key: string, descriptor: PropertyDescriptor) => descriptor
    }
}))

vi.mock('fs', () => ({
    readFileSync: vi.fn().mockReturnValue('openapi: 3.0.0')
}))

vi.mock('js-yaml', () => ({
    load: vi.fn().mockReturnValue({ info: { title: 'API' } })
}))

vi.mock('swagger-ui-express', () => ({
    serve: 'serve-mw',
    setup: vi.fn().mockReturnValue('setup-mw')
}))

vi.mock('express-openapi-validator', () => ({
    middleware: vi.fn().mockReturnValue('validator-mw')
}))

describe('Swagger', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('should load spec from yaml file', async () => {
        await Swagger.Load()

        expect(Swagger.Spec).toEqual({ info: { title: 'API' } })
    })

    it('should start swagger UI and register middleware', async () => {
        const app = { use: vi.fn() } as unknown as Express

        await Swagger.StartUi(app)

        expect(app.use).toHaveBeenCalledWith(ROUTE.SWAGGER_UI_PATH, 'serve-mw', 'setup-mw')
        expect(app.use).toHaveBeenCalledTimes(2)
    })

    it('should register openapi validator middleware', async () => {
        const app = { use: vi.fn() } as unknown as Express

        await Swagger.Validator(app)

        expect(app.use).toHaveBeenCalledWith('validator-mw')
    })
})
