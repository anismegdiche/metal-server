//
//
//
//
//
import chalk from 'chalk'
import LogLevel from 'loglevel'
import Prefix from 'loglevel-plugin-prefix'
import morgan from "morgan"
//
import { SERVER } from './Const'

/* eslint-disable no-unused-vars */
export enum VERBOSITY {
    TRACE = "trace",
    DEBUG = "debug",
    INFO = "info",
    WARN = "warn",
    ERROR = "error"
}
/* eslint-enable no-unused-vars */

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

    static In = '-->'
    static Out = '<--'
    static Level: LogLevel.LogLevelDesc = DefaultLevel

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
            LogLevel.setLevel(DefaultLevel)
            Logger.Error(`Logger.SetLevel ${Logger.In} Error while setting verbosity`)
            Logger.Error(error)
        }
    }

    static EnableAll(): void {
        LogLevel.enableAll()
    }

    static Trace(msg: any): void {
        LogLevel.trace(msg)
    }

    static Debug(msg: any): void {
        LogLevel.debug(msg)
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
}