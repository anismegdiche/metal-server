//
//
import LogLevel from 'loglevel'
import Prefix from 'loglevel-plugin-prefix'
import morgan from "morgan"
import { magenta, green, cyan, yellow, red, gray, whiteBright, bold } from 'colorette'
import _ from 'lodash'
//
import { SERVER } from '../modules/core/@consts'
import { DecoratorUtils } from "./DecoratorUtils"
import { Stringify } from './JsonUtils/Stringify'


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

export const LoggerDefaultLevel: LogLevel.LogLevelDesc = VERBOSITY.WARN

Prefix.reg(LogLevel)

LogLevel.setLevel(LoggerDefaultLevel)

Prefix.apply(LogLevel, {
    format(level: string, name: string | undefined, timestamp: Date) {
        return `${gray(timestamp.toString())} ${_colors[level]((level.padEnd(5)).slice(-5))} [${SERVER.NAME}] ${whiteBright(`${name}:`)}`
    }
})

Prefix.apply(LogLevel.getLogger('critical'), {
    format(level: string, name: string | undefined, timestamp: Date) {
        return red(bold(`${timestamp} ${(level.padEnd(5)).slice(-5)} [${SERVER.NAME}] ${name}:`))
    }
})


// Queue for non-blocking, in-order logging
const _logQueue: (() => void)[] = [];

let _processing = false;

function _enqueueLog(fn: () => void) {
    _logQueue.push(fn);
    if (!_processing) _processQueue();
}

function _processQueue() {
    if (_logQueue.length === 0) {
        _processing = false;
        return;
    }
    _processing = true;
    const fn = _logQueue.shift()!;
    setImmediate(() => {
        try {
            fn();
        } finally {
            _processQueue();
        }
    });
}


export class Logger {

    static readonly In = magenta('▶')
    static readonly Out = yellow('◀')
    static Level: LogLevel.LogLevelDesc = LoggerDefaultLevel //NOSONAR

    static readonly RequestMiddleware = morgan(
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
            LogLevel.setLevel(LoggerDefaultLevel)
            Logger.Error(`Logger.SetLevel: Error while setting verbosity, resetting to default`)
            Logger.Error(error)
        }
    }

    static EnableAll(): void {
        LogLevel.enableAll()
    }

    // Non-blocking queued log methods
    static Trace(msg: any): void {
        _enqueueLog(() => LogLevel.trace(msg))
    }

    static Debug(msg: any): void {
        _enqueueLog(() => LogLevel.debug(msg))
    }

    static Info(msg: any): void {
        _enqueueLog(() => LogLevel.info(msg))
    }

    static Warn(msg: any): void {
        _enqueueLog(() => LogLevel.warn(msg))
    }

    static Error(msg: any): void {
        _enqueueLog(() => LogLevel.error(msg))
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
                    return undefined

                return function (this: unknown, ...args: any[]) {
                    const _paramObject = DecoratorUtils.GetParameters(originalMethod, ...args)
                    const _hide = typeof hide === 'boolean'
                        ? Object.keys(_paramObject) 
                        : hide

                    const _filteredParams: Record<string, any> = _.chain(_paramObject)
                        .omitBy(v => _.isNil(v) || _.isEmpty(v))
                        .omit(_hide)
                        .value()

                    const _argsString = (_.isEmpty(_filteredParams))
                        ? ''
                        : ` ${Stringify(_filteredParams)}`

                    const ctorName = target.name ?? (this as any)?.constructor?.name ?? 'Anonymous'
                    Logger.Debug(`${Logger.In} ${ctorName}.${propertyKey}${_argsString}`)
                    return originalMethod.apply(this, args)
                }
            }

            if (typeof descriptor.value === 'function') {
                descriptor.value = wrap(descriptor.value)
            }
            if (typeof descriptor.get === 'function') {
                descriptor.get = wrap(descriptor.get)
            }
            if (typeof descriptor.set === 'function') {
                descriptor.set = wrap(descriptor.set)
            }

            return descriptor
        }
    }
}
