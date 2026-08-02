//
/** biome-ignore-all lint/complexity/noBannedTypes: <!+> */
/** biome-ignore-all lint/suspicious/noExplicitAny: <!+> */
//
//

import { join } from "node:path"
import { CustomEvent, EventBus, type IEvent } from "@dimkl/events"
import PersistentMap from "@metal/persistent-map"
import { bold, cyan, gray, green, magenta, red, whiteBright, yellow } from "colorette"
import * as _ from "lodash-es"
import LogLevel from "loglevel"
import Prefix from "loglevel-plugin-prefix"
import morgan from "morgan"
import { configure } from "safe-stable-stringify"

//
export enum VERBOSITY {
	TRACE = "trace",
	DEBUG = "debug",
	INFO = "info",
	WARN = "warn",
	ERROR = "error",
}

const VERBOSITY_RANK = [VERBOSITY.ERROR, VERBOSITY.WARN, VERBOSITY.INFO, VERBOSITY.DEBUG, VERBOSITY.TRACE]

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
export type LogEntry = {
	timestamp: Date
	level: VERBOSITY
	server?: string
	user?: string
	message: string
}

//
declare global {
	interface LogTrace extends IEvent {
		type: LOG_EVENT.TRACE
		data: { message: any[] }
	}

	interface LogDebug extends IEvent {
		type: LOG_EVENT.DEBUG
		data: { message: any[] }
	}

	interface LogInfo extends IEvent {
		type: LOG_EVENT.INFO
		data: { message: any[] }
	}

	interface LogWarn extends IEvent {
		type: LOG_EVENT.WARN
		data: { message: any[] }
	}

	interface LogError extends IEvent {
		type: LOG_EVENT.ERROR
		data: { message: any[] }
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
// Inlined utilities (previously from server utils)
//

type TJson<T = any> = Record<string, T>

function _normalizeError(err: unknown): TJson<any> {
	if (err instanceof Error) {
		return {
			...err,
			message: err?.message || "Unknown error",
			stack: err?.stack,
		}
	}
	return err as TJson<any>
}

//XXX function _getDateStamp(date: Date): string {
//XXX 	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
//XXX }

const STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/gm
const ARGUMENT_NAMES = /([^\s,]+)/g

function _getParameters(originalMethod: Function, ...args: any[]): TJson {
	const fnStr = originalMethod.toString().replaceAll(STRIP_COMMENTS, "")
	const params = fnStr.slice(fnStr.indexOf("(") + 1, fnStr.indexOf(")")).match(ARGUMENT_NAMES)
	return params ? Object.fromEntries(params.map((name, index) => [name, args[index]])) : {}
}

const SafeStableStringify = configure({
	circularValue: undefined,
	maximumDepth: 5,
})

function _stringify<T>(json: T): string {
	try {
		return JSON.stringify(json)
	} catch (_error) {
		return SafeStableStringify(json) ?? ""
	}
}

function _toTextList(json?: TJson): string {
	if (!json) {
		return ""
	}
	const result: string[] = []
	_.forEach(json, (value, key) => {
		if (value) {
			result.push(` - ${key}: ${_stringify(value)}`)
		}
	})
	return result.join("\r\n")
}

//
// Colors
//

const _colors: Record<string, (text: string) => string> = {
	[VERBOSITY.TRACE.toUpperCase()]: (text: string) => magenta(text),
	[VERBOSITY.DEBUG.toUpperCase()]: (text: string) => green(text),
	[VERBOSITY.INFO.toUpperCase()]: (text: string) => cyan(text),
	[VERBOSITY.WARN.toUpperCase()]: (text: string) => yellow(text),
	[VERBOSITY.ERROR.toUpperCase()]: (text: string) => red(text),
}

export const LOGGER_DEFAULT_LEVEL = VERBOSITY.WARN as LogLevel.LogLevelDesc

function _formatPrefix(level: string, name: string | undefined, timestamp: Date) {
	return `${gray(timestamp.toString())} ${_colors[level]?.(level.padEnd(5).slice(-5))} [${Logger.ServiceName}] ${whiteBright(`${name}:`)}`
}

function _cleanMessage(msg: any[]): string {
	return msg
		.map((m) => {
			return (typeof m === "string" ? m : JSON.stringify(m)).replace("[33m◀ [39m", " ◀ ").replace("[35m▶ [39m", " ▶ ")
		})
		.join(" ")
}

function _cleanServiceName(name: string): string {
	return name.replace("@", "").replace("/", "-")
}

Prefix.reg(LogLevel)

LogLevel.setLevel(LOGGER_DEFAULT_LEVEL)

Prefix.apply(LogLevel, {
	format(level: string, name: string | undefined, timestamp: Date) {
		return _formatPrefix(level, name, timestamp)
	},
})

Prefix.apply(LogLevel.getLogger("critical"), {
	format(level: string, name: string | undefined, timestamp: Date) {
		return red(bold(`${timestamp} ${(level.padEnd(5)).slice(-5)} [${Logger.ServiceName}] ${name}:`))
	},
})

export class Logger {
	static db: PersistentMap<LogEntry>
	static readonly In = magenta("▶ ")
	static readonly Out = yellow("◀ ")
	static Level: LogLevel.LogLevelDesc = LOGGER_DEFAULT_LEVEL
	static Bus = new EventBus()

	static ServiceName = "NOT_DEFINED"

	static Init(name: string) {
		Logger.ServiceName = name
		Logger.SetDb()
	}

	static SetDb() {
		Logger.db = new PersistentMap<LogEntry>(`/data/logs/${_cleanServiceName(Logger.ServiceName)}-log.db`)
	}

	static _saveLogEntry(level: VERBOSITY, message: any[]) {
		const timestamp = new Date(Date.now())
		if (VERBOSITY_RANK.indexOf(level) <= VERBOSITY_RANK.indexOf(Logger.Level as VERBOSITY))
			Logger.db.set(`${timestamp.toISOString()},${crypto.randomUUID()}`, <LogEntry>{
				level,
				message: _cleanMessage(message),
				timestamp,
				server: Logger.ServiceName,
				user: process.env.USERNAME || "unknown",
			})
	}

	static RequestMiddleware = morgan(":remote-addr, :method :url, :status, :res[content-length], :response-time ms", {
		stream: {
			write: (message: string) => Logger.Info(Logger.Out, message.trim()),
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

	static Trace(...msg: any[]): void {
		Logger.Bus.dispatchEvent(new CustomEvent<{ message: any[] }>(LOG_EVENT.TRACE, { data: { message: msg } }))
	}

	static Debug(...msg: any[]): void {
		Logger.Bus.dispatchEvent(new CustomEvent<{ message: any[] }>(LOG_EVENT.DEBUG, { data: { message: msg } }))
	}

	static Info(...msg: any[]): void {
		Logger.Bus.dispatchEvent(new CustomEvent<{ message: any[] }>(LOG_EVENT.INFO, { data: { message: msg } }))
	}

	static Warn(...msg: any[]): void {
		Logger.Bus.dispatchEvent(new CustomEvent<{ message: any[] }>(LOG_EVENT.WARN, { data: { message: msg } }))
	}

	static Error(...msg: any[]): void {
		Logger.Bus.dispatchEvent(new CustomEvent<{ message: any[] }>(LOG_EVENT.ERROR, { data: { message: msg } }))
	}

	// static Message(...msg: any[]): void {
	// 	Logger.EnableAll()
	// 	Logger.Info(msg)
	// 	Logger.SetLevel()
	// }

	static _handleTrace(event: CustomEvent<{ message: any[] }>): void {
		const message = event.data?.message ?? []
		Logger._saveLogEntry(VERBOSITY.TRACE, message)
		LogLevel.trace(...message)
	}

	static _handleDebug(event: CustomEvent<{ message: any[] }>): void {
		const message = event.data?.message ?? []
		Logger._saveLogEntry(VERBOSITY.DEBUG, message)
		LogLevel.debug(...message)
	}

	static _handleInfo(event: CustomEvent<{ message: any[] }>): void {
		const message = event.data?.message ?? []
		Logger._saveLogEntry(VERBOSITY.INFO, message)
		LogLevel.info(...message)
	}

	static _handleWarn(event: CustomEvent<{ message: any[] }>): void {
		const message = event.data?.message ?? []
		Logger._saveLogEntry(VERBOSITY.WARN, message)
		LogLevel.warn(...message)
	}

	static _handleError(event: CustomEvent<{ message: any[] }>): void {
		const message = event.data?.message ?? []
		Logger._saveLogEntry(VERBOSITY.ERROR, message)
		LogLevel.error(...message)
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

	static _handleLogFunction(
		event: CustomEvent<{ hide: string[] | boolean; target: any; propertyKey: string; descriptor: PropertyDescriptor }>,
	): void {
		const { hide, target, propertyKey, descriptor } = event.data!

		const wrap = (originalMethod?: (...args: any[]) => any) => {
			if (!originalMethod) return undefined

			return function (this: unknown, ...args: any[]) {
				const _paramObject = _getParameters(originalMethod, ...args)
				const _hide = typeof hide === "boolean" ? Object.keys(_paramObject) : hide

				const _filteredParams: Record<string, any> = _.chain(_paramObject)
					.omitBy((v) => _.isNil(v) || _.isEmpty(v))
					.omit(_hide)
					.value()

				const _argsString = _.isEmpty(_filteredParams) ? "" : ` ${_stringify(_filteredParams)}`

				const ctorName = target.name ?? (this as any)?.constructor?.name ?? "Anonymous"

				Logger.Bus.dispatchEvent(
					new CustomEvent<{ message: any[] }>(LOG_EVENT.DEBUG, {
						data: { message: [`${Logger.In} ${ctorName}.${propertyKey}${_argsString}`] },
					}),
				)
				// biome-ignore lint/suspicious/noImplicitAnyLet: any
				let result
				try {
					result = originalMethod.apply(this, args)
				} catch (err: unknown) {
					const _err =
						Logger.Level === VERBOSITY.DEBUG ? `\r\n${_toTextList(_normalizeError(err))}` : (err as Error)?.message

					Logger.Bus.dispatchEvent(
						new CustomEvent<{ message: any[] }>(LOG_EVENT.ERROR, {
							data: { message: [`${Logger.Out} ${ctorName}.${propertyKey} threw an error: ${_err}`] },
						}),
					)
					throw err
				}
				if (result instanceof Promise) {
					return result
						.then((res) => {
							Logger.Bus.dispatchEvent(
								new CustomEvent<{ message: any[] }>(LOG_EVENT.DEBUG, {
									data: { message: [`${Logger.Out} ${ctorName}.${propertyKey}`] },
								}),
							)
							return res
						})
						.catch((err: unknown) => {
							const _err =
								Logger.Level === VERBOSITY.DEBUG ? `\r\n${_toTextList(_normalizeError(err))}` : (err as Error)?.message

							Logger.Bus.dispatchEvent(
								new CustomEvent<{ message: any[] }>(LOG_EVENT.ERROR, {
									data: { message: [`${Logger.Out} ${ctorName}.${propertyKey} threw an error: ${_err}`] },
								}),
							)
							throw err
						})
				}
				Logger.Bus.dispatchEvent(
					new CustomEvent<{ message: any[] }>(LOG_EVENT.DEBUG, {
						data: { message: [`${Logger.Out} ${ctorName}.${propertyKey}`] },
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

// Register event handlers (replaces @on decorators for cross-runtime compatibility)
Logger.Bus.addEventListener(LOG_EVENT.TRACE, (e) => Logger._handleTrace(e as CustomEvent<{ message: any[] }>))
Logger.Bus.addEventListener(LOG_EVENT.DEBUG, (e) => Logger._handleDebug(e as CustomEvent<{ message: any[] }>))
Logger.Bus.addEventListener(LOG_EVENT.INFO, (e) => Logger._handleInfo(e as CustomEvent<{ message: any[] }>))
Logger.Bus.addEventListener(LOG_EVENT.WARN, (e) => Logger._handleWarn(e as CustomEvent<{ message: any[] }>))
Logger.Bus.addEventListener(LOG_EVENT.ERROR, (e) => Logger._handleError(e as CustomEvent<{ message: any[] }>))
Logger.Bus.addEventListener(LOG_EVENT.FUNC_REGISTER, (e) =>
	Logger._handleLogFunction(
		e as CustomEvent<{ hide: string[] | boolean; target: any; propertyKey: string; descriptor: PropertyDescriptor }>,
	),
)
