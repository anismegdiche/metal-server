//
//
//
//
//
import chalk from 'chalk'
import LogLevel from 'loglevel'
import Prefix from 'loglevel-plugin-prefix'

import { SERVER } from './Const'

const Colors: Record<string,Function> = {
    'TRACE': chalk.magenta,
    'DEBUG': chalk.green,
    'INFO': chalk.cyan,
    'WARN': chalk.yellow,
    'ERROR': chalk.red
}

export const DefaultLevel: LogLevel.LogLevelDesc = 'warn'

Prefix.reg(LogLevel)
LogLevel.setLevel(DefaultLevel)

Prefix.apply(LogLevel, {
    format(level: string, name: string | undefined, timestamp: Date) {
        return `${chalk.gray(`${timestamp}`)} ${Colors[level.toUpperCase()]((level.padEnd(5)).slice(-5))} [${SERVER.NAME}] ${chalk.whiteBright(`${name}:`)}`
    }
})

Prefix.apply(LogLevel.getLogger('critical'), {
    format(level: string, name: string | undefined, timestamp: Date) {
        return chalk.red.bold(`${timestamp} ${(level.padEnd(5)).slice(-5)} [${SERVER.NAME}] ${name}:`)
    }
})

export abstract class Logger {

    static In = '-->'
    static Out = '<--'
    static Level: LogLevel.LogLevelDesc = DefaultLevel

    static SetLevel(verbosity: LogLevel.LogLevelDesc = this.Level): void {
        this.Level = verbosity
        try {
            LogLevel.setLevel(this.Level)
        } catch (error: unknown) {
            LogLevel.setLevel(DefaultLevel)
            this.Error(`Logger.SetLevel ${this.In} Error while setting verbosity`)
            this.Error(error)
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
        this.EnableAll()
        this.Info(msg)
        this.SetLevel()
    }
}