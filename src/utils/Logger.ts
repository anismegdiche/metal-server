//
//
//
import { CustomEvent, EventBus, type IEvent, on } from "@dimkl/events"
import { bold, cyan, gray, green, magenta, red, whiteBright, yellow } from "colorette"
import * as _ from "lodash-es"
import LogLevel from "loglevel"
import Prefix from "loglevel-plugin-prefix"
import morgan from "morgan"
//
import { SERVER } from "../modules/core/@consts"
import { NormalizeError } from "../modules/errors/HttpErrorBase"
import { DecoratorUtils } from "./DecoratorUtils"
import { Stringify } from "./JsonUtils/Stringify"
import { ToTextList } from "./JsonUtils/ToTextList"

//
export enum VERBOSITY {
	TRACE = "trace",
	DEBUG = "debug",
	INFO = "info",
	WARN = "warn",
	ERROR = "error",
}

//
export enum LOG_EVENT {
	TRACE = "log:trace",
	DEBUG = "log:debug",
	INFO = "log:info",
	WARN = "log:warn",
	ERROR = "log:error",
	FUNC_REGISTER = "log:func:register",
}

//
declare global {
	interface LogTrace extends IEvent {
		type: LOG_EVENT.TRACE
		data: { message: any }
	}

	interface LogDebug extends IEvent {
		type: LOG_EVENT.DEBUG
		data: { message: any }
	}

	interface LogInfo extends IEvent {
		type: LOG_EVENT.INFO
		data: { message: any }
	}

	interface LogWarn extends IEvent {
		type: LOG_EVENT.WARN
		data: { message: any }
	}

	interface LogError extends IEvent {
		type: LOG_EVENT.ERROR
		data: { message: any }
	}

	interface LogFuncRegister extends IEvent {
		type: LOG_EVENT.FUNC_REGISTER
		data: { hide: string[] | boolean; target: any; propertyKey: string; descriptor: PropertyDescriptor }
	}

	interface Events {
		[LOG_EVENT.TRACE]: LogTrace
		[LOG_EVENT.DEBUG]: LogDebug
		[LOG_EVENT.INFO]: LogInfo
		[LOG_EVENT.WARN]: LogWarn
		[LOG_EVENT.ERROR]: LogError
		[LOG_EVENT.FUNC_REGISTER]: LogFuncRegister
	}
}

//
const _colors: Record<string, (text: string) => string> = {
	[VERBOSITY.TRACE.toUpperCase()]: (text: string) => magenta(text),
	[VERBOSITY.DEBUG.toUpperCase()]: (text: string) => green(text),
	[VERBOSITY.INFO.toUpperCase()]: (text: string) => cyan(text),
	[VERBOSITY.WARN.toUpperCase()]: (text: string) => yellow(text),
	[VERBOSITY.ERROR.toUpperCase()]: (text: string) => red(text),
}

export const LOGGER_DEFAULT_LEVEL: LogLevel.LogLevelDesc = VERBOSITY.WARN

Prefix.reg(LogLevel)

LogLevel.setLevel(LOGGER_DEFAULT_LEVEL)

Prefix.apply(LogLevel, {
	format(level: string, name: string | undefined, timestamp: Date) {
		return `${gray(timestamp.toString())} ${_colors[level]?.(level.padEnd(5).slice(-5))} [${SERVER.NAME}] ${whiteBright(`${name}:`)}`
	},
})

Prefix.apply(LogLevel.getLogger("critical"), {
	format(level: string, name: string | undefined, timestamp: Date) {
		return red(bold(`${timestamp} ${(level.padEnd(5)).slice(-5)} [${SERVER.NAME}] ${name}:`))
	},
})

export class Logger {
	static readonly In = magenta("▶ ")
	static readonly Out = yellow("◀ ")
	static Level: LogLevel.LogLevelDesc = LOGGER_DEFAULT_LEVEL
	static Bus = new EventBus()

	static RequestMiddleware = morgan(":remote-addr, :method :url, :status, :res[content-length], :response-time ms", {
		stream: {
			write: (message: string) => Logger.Info(message.trim()),
		},
	})

	static SetLevel(verbosity: LogLevel.LogLevelDesc = Logger.Level): void {
		Logger.Level = verbosity
		try {
			LogLevel.setLevel(Logger.Level)
		} catch (error: unknown) {
			LogLevel.setLevel(LOGGER_DEFAULT_LEVEL)
			Logger.Error(`Logger.SetLevel: Error while setting verbosity, resetting to default`)
			Logger.Error(error)
		}
	}

	static EnableAll(): void {
		LogLevel.enableAll()
	}

	static Trace(msg: any): void {
		Logger.Bus.dispatchEvent(new CustomEvent<{ message: any }>(LOG_EVENT.TRACE, { data: { message: msg } }))
	}

	static Debug(msg: any): void {
		Logger.Bus.dispatchEvent(new CustomEvent<{ message: any }>(LOG_EVENT.DEBUG, { data: { message: msg } }))
	}

	static Info(msg: any): void {
		Logger.Bus.dispatchEvent(new CustomEvent<{ message: any }>(LOG_EVENT.INFO, { data: { message: msg } }))
	}

	static Warn(msg: any): void {
		Logger.Bus.dispatchEvent(new CustomEvent<{ message: any }>(LOG_EVENT.WARN, { data: { message: msg } }))
	}

	static Error(msg: any): void {
		Logger.Bus.dispatchEvent(new CustomEvent<{ message: any }>(LOG_EVENT.ERROR, { data: { message: msg } }))
	}

	static Message(msg: any): void {
		Logger.EnableAll()
		Logger.Info(msg)
		Logger.SetLevel()
	}

	@on({ eventName: LOG_EVENT.TRACE, eventBus: Logger.Bus })
	static _handleTrace(event: CustomEvent<{ message: any }>): void {
		LogLevel.trace(event.data?.message)
	}

	@on({ eventName: LOG_EVENT.DEBUG, eventBus: Logger.Bus })
	static _handleDebug(event: CustomEvent<{ message: any }>): void {
		LogLevel.debug(event.data?.message)
	}

	@on({ eventName: LOG_EVENT.INFO, eventBus: Logger.Bus })
	static _handleInfo(event: CustomEvent<{ message: any }>): void {
		LogLevel.info(event.data?.message)
	}

	@on({ eventName: LOG_EVENT.WARN, eventBus: Logger.Bus })
	static _handleWarn(event: CustomEvent<{ message: any }>): void {
		LogLevel.warn(event.data?.message)
	}

	@on({ eventName: LOG_EVENT.ERROR, eventBus: Logger.Bus })
	static _handleError(event: CustomEvent<{ message: any }>): void {
		LogLevel.error(event.data?.message)
	}

	static LogFunction(hide: string[] | boolean = []): any {
		return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
			Logger.Bus.dispatchEvent(
				new CustomEvent<{ hide: string[] | boolean; target: any; propertyKey: string; descriptor: PropertyDescriptor }>(
					LOG_EVENT.FUNC_REGISTER,
					{ data: { hide, target, propertyKey, descriptor } },
				),
			)
			return descriptor
		}
	}

	@on({ eventName: LOG_EVENT.FUNC_REGISTER, eventBus: Logger.Bus })
	static _handleLogFunction(event: CustomEvent<{ hide: string[] | boolean; target: any; propertyKey: string; descriptor: PropertyDescriptor }>): void {
		const { hide, target, propertyKey, descriptor } = event.data!

		const wrap = (originalMethod?: (...args: any[]) => any) => {
			if (!originalMethod) return undefined

			return function (this: unknown, ...args: any[]) {
				const _paramObject = DecoratorUtils.GetParameters(originalMethod, ...args)
				const _hide = typeof hide === "boolean" ? Object.keys(_paramObject) : hide

				const _filteredParams: Record<string, any> = _.chain(_paramObject)
					.omitBy((v) => _.isNil(v) || _.isEmpty(v))
					.omit(_hide)
					.value()

				const _argsString = _.isEmpty(_filteredParams) ? "" : ` ${Stringify(_filteredParams)}`

				const ctorName = target.name ?? (this as any)?.constructor?.name ?? "Anonymous"

				Logger.Bus.dispatchEvent(
					new CustomEvent<{ message: any }>(LOG_EVENT.DEBUG, {
						data: { message: `${Logger.In} ${ctorName}.${propertyKey}${_argsString}` },
					}),
				)
				// biome-ignore lint/suspicious/noImplicitAnyLet: any
				let result
				try {
					result = originalMethod.apply(this, args)
				} catch (err: unknown) {
					Logger.Bus.dispatchEvent(
						new CustomEvent<{ message: any }>(LOG_EVENT.ERROR, {
							data: { message: `${Logger.Out} ${ctorName}.${propertyKey} threw an error: \r\n${ToTextList(NormalizeError(err))}` },
						}),
					)
					throw err
				}
				if (result instanceof Promise) {
					return result
						.then((res) => {
							Logger.Bus.dispatchEvent(
								new CustomEvent<{ message: any }>(LOG_EVENT.DEBUG, {
									data: { message: `${Logger.Out} ${ctorName}.${propertyKey}` },
								}),
							)
							return res
						})
						.catch((err: unknown) => {
							Logger.Bus.dispatchEvent(
								new CustomEvent<{ message: any }>(LOG_EVENT.ERROR, {
									data: { message: `${Logger.Out} ${ctorName}.${propertyKey} threw an error: \r\n${ToTextList(NormalizeError(err))}` },
								}),
							)
							throw err
						})
				}
				Logger.Bus.dispatchEvent(
					new CustomEvent<{ message: any }>(LOG_EVENT.DEBUG, {
						data: { message: `${Logger.Out} ${ctorName}.${propertyKey}` },
					}),
				)
				return result
			}
		}

		if (typeof descriptor?.value === "function") {
			descriptor.value = wrap(descriptor.value)
		}
		if (typeof descriptor?.get === "function") {
			descriptor.get = wrap(descriptor.get)
		}
		if (typeof descriptor?.set === "function") {
			descriptor.set = wrap(descriptor.set)
		}
	}
}
