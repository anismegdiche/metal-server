//
//
//
import * as _ from "lodash-es"
import { VM } from "vm2"
//
import { Logger } from "../../utils/Logger"
import { Utils } from "../../utils/Utils"
import { HttpErrorInternalServerError, NormalizeError } from "../errors/HttpErrors"
import { maliciousPatterns } from "./@consts"
import type { TContext } from "./types/TContext"

//
export class Sandbox {
	_context: Partial<TContext> = {}
	_keepState: boolean = false //NOSONAR

	constructor(context?: Partial<TContext>) {
		if (context) {
			this.SetContext(context) // Set the context
			this._keepState = true
		}
	}

	static _isValidCode(code: string): boolean {
		return !maliciousPatterns.some((pattern) => pattern.test(code))
	}

	@Logger.LogFunction(true)
	SetContext(context?: object): void {
		this._context = context ?? {}
		this.AddSafeObjectsToContext()
	}

	@Logger.LogFunction()
	Reset(): void {
		this.SetContext()
	}

	@Logger.LogFunction()
	Evaluate<T>(code: string, throwError: boolean = false): T | undefined {
		const _code = code.trim()
		let isSuspicious = false

		try {
			// Layer 1: Pattern validation (fast)
			if (!Sandbox._isValidCode(_code)) {
				isSuspicious = true
				throw new HttpErrorInternalServerError("Invalid code")
			}

			// Layer 2: vm2 sandbox (secure)
			if (!this._keepState) this.Reset()

			const vm = new VM({
				timeout: 5000,
				sandbox: this._context,
			})
			return vm.run(_code) as T
		} catch (err: unknown) {
			Logger.Error(`Error evaluating code: ${_code}, ${NormalizeError(err).message}`)
			if (isSuspicious || throwError) throw err
			return undefined
		}
	}

	AddSafeObjectsToContext(): void {
		this._context.$utils = {
			JSON,
			Math,
			_,
			newUuid: () => Utils.Uuid(true),
		}
	}
}
