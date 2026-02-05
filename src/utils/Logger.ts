//
//
import { bold, cyan, gray, green, magenta, red, whiteBright, yellow } from 'colorette'
import * as _ from 'lodash-es'
import LogLevel from 'loglevel'
import Prefix from 'loglevel-plugin-prefix'
import morgan from "morgan"
//
import { SERVER } from '../modules/core/@consts'
import { NormalizeError } from '../modules/errors/HttpErrors'
import { DecoratorUtils } from "./DecoratorUtils"
import { JsonUtils } from './JsonUtils'
import { Stringify } from './JsonUtils/Stringify'
import { Queue } from './Queue'


//
export enum VERBOSITY {
    TRACE = "trace",
    DEBUG = "debug",
    INFO = "info",
    WARN = "warn",
    ERROR = "error"
}


//
const _colors: Record<string, (text: string) => string> = {
    [VERBOSITY.TRACE.toUpperCase()]: (text: string) => magenta(text),
    [VERBOSITY.DEBUG.toUpperCase()]: (text: string) => green(text),
    [VERBOSITY.INFO.toUpperCase()]: (text: string) => cyan(text),
    [VERBOSITY.WARN.toUpperCase()]: (text: string) => yellow(text),
    [VERBOSITY.ERROR.toUpperCase()]: (text: string) => red(text)
}

export const LOGGER_DEFAULT_LEVEL: LogLevel.LogLevelDesc = VERBOSITY.WARN

Prefix.reg(LogLevel)

LogLevel.setLevel(LOGGER_DEFAULT_LEVEL)

Prefix.apply(LogLevel, {
    format(level: string, name: string | undefined, timestamp: Date) {
        return `${gray(timestamp.toString())} ${_colors[level]!((level.padEnd(5)).slice(-5))} [${SERVER.NAME}] ${whiteBright(`${name}:`)}`
    }
})

Prefix.apply(LogLevel.getLogger('critical'), {
    format(level: string, name: string | undefined, timestamp: Date) {
        return red(bold(`${timestamp} ${(level.padEnd(5)).slice(-5)} [${SERVER.NAME}] ${name}:`))
    }
})

export class Logger {

    static readonly In = magenta('▶ ')
    static readonly Out = yellow('◀ ')
    static Level: LogLevel.LogLevelDesc = LOGGER_DEFAULT_LEVEL
    private static readonly _queue = new Queue()
    private static readonly _maxQueueSize = 1_000
    private static _cleanupInterval: NodeJS.Timeout | undefined

    static RequestMiddleware = morgan(
        ':remote-addr, :method :url, :status, :res[content-length], :response-time ms',
        {
            stream: {
                write: (message: string) => Logger.Info(message.trim())
            }
        }
    )

    static SetLevel(verbosity: LogLevel.LogLevelDesc = this.Level): void {
        Logger.Level = verbosity
        try {
            LogLevel.setLevel(Logger.Level)
        } catch (error: unknown) {
            LogLevel.setLevel(LOGGER_DEFAULT_LEVEL)
            Logger.Error(`Logger.SetLevel: Error while setting verbosity, resetting to default`)
            Logger.Error(error)
        }
    }

    static StartQueueCleanup(): void {
        if (Logger._cleanupInterval) {
            clearInterval(Logger._cleanupInterval)
        }

        Logger._cleanupInterval = setInterval(() => {
            Logger._cleanupQueue()
        }, 60000) // Clean up every minute
    }

    static StopQueueCleanup(): void {
        if (Logger._cleanupInterval) {
            clearInterval(Logger._cleanupInterval)
            Logger._cleanupInterval = undefined
        }
    }

    private static _cleanupQueue(): void {
        try {
            const currentSize = Logger._queue.Tasks.length
            if (currentSize > Logger._maxQueueSize) {
                const excess = currentSize - Logger._maxQueueSize
                Logger.Warn(`Logger queue size (${currentSize}) exceeds maximum (${Logger._maxQueueSize}), removing ${excess} oldest entries`)

                // Remove oldest entries from the front of the array
                Logger._queue.Tasks.splice(0, excess)
            }
        } catch (error) {
            Logger.Error(`Failed to cleanup logger queue: ${error instanceof Error ? error.message : String(error)}`)
        }
    }

    static EnableAll(): void {
        LogLevel.enableAll()
    }

    // Non-blocking queued log methods
    static Trace(msg: any): void {
        Logger._queue.Enqueue(LogLevel.trace(msg), false)
    }

    static Debug(msg: any): void {
        Logger._queue.Enqueue(LogLevel.debug(msg), false)
    }

    static Info(msg: any): void {
        Logger._queue.Enqueue(LogLevel.info(msg), false)
    }

    static Warn(msg: any): void {
        Logger._queue.Enqueue(LogLevel.warn(msg), false)
    }

    static Error(msg: any): void {
        Logger._queue.Enqueue(LogLevel.error(msg), false)
    }

    static Message(msg: any): void {
        Logger.EnableAll()
        Logger.Info(msg)
        Logger.SetLevel()
    }

    static LogFunction(hide: string[] | boolean = []): any {
        return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
            const wrap = (originalMethod?: (...args: any[]) => any) => {
                if (!originalMethod)
                    return undefined;

                return function (this: unknown, ...args: any[]) {
                    // ---------- BEFORE CALL ----------
                    const _paramObject = DecoratorUtils.GetParameters(originalMethod, ...args);
                    const _hide = typeof hide === 'boolean'
                        ? Object.keys(_paramObject)
                        : hide;

                    const _filteredParams: Record<string, any> = _.chain(_paramObject)
                        .omitBy(v => _.isNil(v) || _.isEmpty(v))
                        .omit(_hide)
                        .value();

                    const _argsString = _.isEmpty(_filteredParams)
                        ? ''
                        : ` ${Stringify(_filteredParams)}`;

                    const ctorName =
                        target.name ??
                        (this as any)?.constructor?.name ??
                        "Anonymous";

                    Logger.Debug(`${Logger.In} ${ctorName}.${propertyKey}${_argsString}`);
                    // ---------- CALL ORIGINAL ----------
                    let result;
                    try {
                        result = originalMethod.apply(this, args);
                    } catch (err: unknown) {
                        Logger.Error(`${Logger.Out} ${ctorName}.${propertyKey} threw an error: \r\n${JsonUtils.ToTextList(NormalizeError(err))}`);
                        throw err; // rethrow
                    }
                    // ---------- ASYNC HANDLING ----------
                    if (result instanceof Promise) {
                        return result
                            .then(res => {
                                Logger.Debug(`${Logger.Out} ${ctorName}.${propertyKey}`);
                                return res;
                            })
                            .catch((err: unknown) => {
                                Logger.Error(`${Logger.Out} ${ctorName}.${propertyKey} threw an error: \r\n${JsonUtils.ToTextList(NormalizeError(err))}`);
                                throw err; // rethrow async error
                            });
                    }
                    // ---------- SYNC SUCCESS ----------
                    Logger.Debug(`${Logger.Out} ${ctorName}.${propertyKey}`);
                    return result;
                };
            };

            // wrap function / getter / setter
            if (typeof descriptor.value === "function") {
                descriptor.value = wrap(descriptor.value);
            }
            if (typeof descriptor.get === "function") {
                descriptor.get = wrap(descriptor.get);
            }
            if (typeof descriptor.set === "function") {
                descriptor.set = wrap(descriptor.set);
            }

            return descriptor;
        };
    }

    static async FlushQueue(): Promise<void> {
        while (Logger._queue.Tasks.length > 0) {
            await Logger._queue.ProcessQueue()
        }
    }
}
