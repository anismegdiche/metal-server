import { Logger } from '@metal/logger';
import { vi } from 'vitest'

const noop = () => { }

// silence all side-effecting methods
vi.spyOn(Logger, 'Trace').mockImplementation(noop)
vi.spyOn(Logger, 'Debug').mockImplementation(noop)
vi.spyOn(Logger, 'Info').mockImplementation(noop)
vi.spyOn(Logger, 'Warn').mockImplementation(noop)
vi.spyOn(Logger, 'Error').mockImplementation(noop)
vi.spyOn(Logger, 'SetLevel').mockImplementation(noop)
vi.spyOn(Logger, 'EnableAll').mockImplementation(noop)
vi.spyOn(Logger, 'LogFunction').mockImplementation(noop)

// Morgan middleware must still call next()
Logger.RequestMiddleware = (_req: any, _res: any, next: any) => next()

// Prevent Logger.db.set() crashes when @Logger.LogFunction decorator fires events on Logger.Bus
Logger.db = new Map() as any

