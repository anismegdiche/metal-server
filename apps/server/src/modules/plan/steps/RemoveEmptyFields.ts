//
//
//

import { JsonUtils } from "@metal/utils"
import type { DataTable, TRow } from "../../../types/DataTable"
import { Assert } from "../../../utils/Assert"
import { PlaceHolder } from "../../../utils/PlaceHolder"
import { Sandbox } from "../../sandbox/Sandbox"
import type { TContext } from "../../sandbox/types/TContext"
import { STEP } from "../@consts"
import {
	type U__plans_plan_remove_empty_fields_Params,
	z_U__plans_plan_remove_empty_fields_Params,
} from "../types/U__plans_params"
import type { U__plans_plan__step_Params } from "../types/U__plans_plan__step"

//
export async function RemoveEmptyFields(
	stepParams: U__plans_plan__step_Params,
	$context: Partial<TContext>,
): Promise<DataTable> {
	const _stepParams = Assert.ZodSchema<U__plans_plan_remove_empty_fields_Params>(
		stepParams,
		z_U__plans_plan_remove_empty_fields_Params,
		`${STEP.REMOVE_EMPTY_FIELDS}: Wrong argument passed ${JsonUtils.Stringify(stepParams)}`,
	)

	const { data: planData } = $context?.$plan as NonNullable<Record<string, unknown>>
	Assert.Var<DataTable>(planData, "Data is not initialized")

	return planData.RowsMap((row: TRow) => _removeEmptyFieldsRow(row, stepParams, $context))
}

export async function _removeEmptyFieldsRow(
	row: TRow,
	stepParams: U__plans_plan__step_Params,
	$context: Partial<TContext>,
): Promise<TRow> {
	Assert.Var<U__plans_plan_remove_empty_fields_Params>(
		stepParams,
		z_U__plans_plan_remove_empty_fields_Params.safeParse(stepParams).success,
		`${STEP.REMOVE_EMPTY_FIELDS}: Wrong argument passed ${JsonUtils.Stringify(stepParams)}`,
	)

	const _stepParams = Assert.ZodSchema<U__plans_plan_remove_empty_fields_Params>(
		stepParams,
		z_U__plans_plan_remove_empty_fields_Params,
		`${STEP.REMOVE_EMPTY_FIELDS}: Wrong argument passed ${JsonUtils.Stringify(stepParams)}`,
	)

	const $__stepParams = PlaceHolder.EvaluateJsCode<U__plans_plan_remove_empty_fields_Params>(
		_stepParams,
		new Sandbox($context),
	) as U__plans_plan_remove_empty_fields_Params

	const { defaults, fields } = $__stepParams

	// Create _fields: use provided fields or create from row keys with defaults
	let _fields: Record<string, Record<string, boolean>>
	if (fields) {
		// fields provided: merge each field config with defaults
		_fields = {}
		for (const [fieldName, fieldConfig] of Object.entries(fields)) {
			_fields[fieldName] = fieldConfig === null ? defaults : { ...defaults, ...fieldConfig }
		}
	} else {
		// No fields provided: create from row keys with defaults
		_fields = Object.keys(row).reduce(
			(acc, key) => {
				acc[key] = defaults
				return acc
			},
			{} as Record<string, Record<string, boolean>>,
		)
	}

	// Process each field and remove empty ones
	for (const [fieldName, config] of Object.entries(_fields)) {
		const fieldValue = row[fieldName]

		// Check if the field value should be considered empty
		const isEmpty = _isEmptyValue(fieldValue, config)

		// If empty, remove from row (by not adding to processedRow)
		if (isEmpty) {
			delete row[fieldName]
		}
	}

	return row
}

function _isEmptyValue(value: unknown, config: Record<string, boolean>): boolean {
	return (
		_isNullish(value, config) ||
		_isEmptyString(value, config) ||
		_isEmptyNumber(value, config) ||
		_isEmptyBoolean(value, config) ||
		_isEmptyArray(value, config) ||
		_isEmptyObject(value, config) ||
		false
	)
}

function _isNullish(value: unknown, config: Record<string, boolean>): boolean {
	return config.null === true && (value === null || value === undefined)
}

function _isEmptyString(value: unknown, config: Record<string, boolean>): boolean {
	if (typeof value !== "string") return false
	if (config["empty-string"] === true && value === "") return true
	if (config["blank-string"] === true && /^\s*$/.test(value)) return true
	if (config["string-null"] === true && value === "null") return true
	return false
}

function _isEmptyNumber(value: unknown, config: Record<string, boolean>): boolean {
	return config.zero === true && value === 0
}

function _isEmptyBoolean(value: unknown, config: Record<string, boolean>): boolean {
	return config.false === true && value === false
}

function _isEmptyArray(value: unknown, config: Record<string, boolean>): boolean {
	return config["empty-array"] === true && Array.isArray(value) && value.length === 0
}

function _isEmptyObject(value: unknown, config: Record<string, boolean>): boolean {
	return config["empty-object"] === true && _isEmptyObjectValue(value)
}

function _isEmptyObjectValue(value: unknown): boolean {
	return typeof value === "object" && value !== null && !Array.isArray(value) && Object.keys(value).length === 0
}
