//
//
//
//
//
import chalk from 'chalk'
import LogLevel from 'loglevel'
import Prefix from 'loglevel-plugin-prefix'
import morgan from "morgan"
import typia from "typia"
//
import { SERVER } from '../lib/Const'
import { JsonHelper } from "../lib/JsonHelper"
import { TUserTokenInfo } from "../server/User"


export enum VERBOSITY {
    TRACE = "trace",
    DEBUG = "debug",
    INFO = "info",
    WARN = "warn",
    ERROR = "error"
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
const Colors: Record<string, Function> = {
    [VERBOSITY.TRACE.toUpperCase()]: chalk.magenta,
    [VERBOSITY.DEBUG.toUpperCase()]: chalk.green,
    [VERBOSITY.INFO.toUpperCase()]: chalk.cyan,
    [VERBOSITY.WARN.toUpperCase()]: chalk.yellow,
    [VERBOSITY.ERROR.toUpperCase()]: chalk.red
}

export const DefaultLevel: LogLevel.LogLevelDesc = VERBOSITY.WARN

Prefix.reg(LogLevel)
LogLevel.setLevel(DefaultLevel)

Prefix.apply(LogLevel, {
    format(level: string, name: string | undefined, timestamp: Date) {
        return `${chalk.gray(timestamp)} ${Colors[level]((level.padEnd(5)).slice(-5))} [${SERVER.NAME}] ${chalk.whiteBright(`${name}:`)}`
    }
})

Prefix.apply(LogLevel.getLogger('critical'), {
    format(level: string, name: string | undefined, timestamp: Date) {
        return chalk.red.bold(`${timestamp} ${(level.padEnd(5)).slice(-5)} [${SERVER.NAME}] ${name}:`)
    }
})

export class Logger {

    static readonly In = '->'
    static readonly Out = '<-'
    static Level: LogLevel.LogLevelDesc = DefaultLevel

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
            LogLevel.setLevel(DefaultLevel)
            Logger.Error(`Logger.SetLevel: Error while setting verbosity, resetting to default`)
            Logger.Error(error)
        }
    }

    static EnableAll(): void {
        LogLevel.enableAll()
    }

    static Trace(msg: any): void {
        setImmediate(() => LogLevel.trace(msg))
    }

    static Debug(msg: any): void {
        setImmediate(() => LogLevel.debug(msg))
    }

    static Info(msg: any): void {
        LogLevel.info(msg)
    }

    static Warn(msg: any): void {
        LogLevel.warn(msg)
    }

    static Error(msg: any): void {
        LogLevel.error(msg)
    }

    static Message(msg: any): void {
        Logger.EnableAll()
        Logger.Info(msg)
        Logger.SetLevel()
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    static LogFunction(logger: Function = Logger.Debug, hideParameters: boolean = false): any {
        return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
            const originalMethod = descriptor.value
            descriptor.value = function (...originalArgs: any[]) {
                const _filteredArgs = originalArgs.filter(arg => !typia.is<TUserTokenInfo>(arg))
                const _argsString = (hideParameters || _filteredArgs.length == 0 || _filteredArgs.every(v => v === null) || _filteredArgs.every(v => v === undefined))
                    ? ''
                    : `: ${JsonHelper.Stringify(_filteredArgs)}`

                setImmediate(() => logger(`${Logger.In} ${target.name ?? this.constructor.name}.${propertyKey}${_argsString}`))
                // continue with original args
                return originalMethod.apply(this, originalArgs)
            }
            return descriptor
        }
    }
}
