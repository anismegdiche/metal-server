//
//
//
//
//
import assert from "assert";
import { HttpErrorInternalServerError } from "../modules/errors/HttpErrors";


//
export function Assert(condition: boolean, message: string): void;
export function Assert<T>(value: unknown, condition: boolean, message: string): asserts value is T;
export function Assert(valueOrCondition: unknown | boolean, conditionOrMessage: boolean | string, messageOrUndefined?: string): void;
export function Assert<T>(valueOrCondition: unknown | boolean, conditionOrMessage: boolean | string, messageOrUndefined?: string): void {
    // eslint-disable-next-line init-declarations
    let condition: boolean;
    // eslint-disable-next-line init-declarations
    let message: string;

    if (typeof valueOrCondition === 'boolean' && typeof conditionOrMessage === 'string') {
        // First overload
        condition = valueOrCondition;
        message = conditionOrMessage;
    } else {
        // Second overload
        condition = conditionOrMessage as boolean;
        message = messageOrUndefined as string;
    }

    try {
        assert(condition, message);
    } catch (error) {
        throw new HttpErrorInternalServerError(message);
    }
}