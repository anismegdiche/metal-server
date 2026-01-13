import { vi } from 'vitest'
import { Logger } from './src/utils/Logger' // EXACT same path as in your app

const noop = () => { }

// silence all side-effecting methods
vi.spyOn(Logger, 'Trace').mockImplementation(noop)
vi.spyOn(Logger, 'Debug').mockImplementation(noop)
vi.spyOn(Logger, 'Info').mockImplementation(noop)
vi.spyOn(Logger, 'Warn').mockImplementation(noop)
vi.spyOn(Logger, 'Error').mockImplementation(noop)
vi.spyOn(Logger, 'Message').mockImplementation(noop)
vi.spyOn(Logger, 'SetLevel').mockImplementation(noop)
vi.spyOn(Logger, 'EnableAll').mockImplementation(noop)
vi.spyOn(Logger, 'FlushQueue').mockResolvedValue()

// Morgan middleware must still call next()
Logger.RequestMiddleware = (_req: any, _res: any, next: any) => next()
