/* eslint-disable @typescript-eslint/no-explicit-any */

/* It takes an object, and returns the object if it's not null or undefined, otherwise it returns the
default value */
export class Try {

    /**
     * It takes an array of objects, and returns the first object that has a property with the name of the
     * second argument.
     * @param {any} object - any = the array of objects
     * @param {string} child - the name of the child object
     * @param {any} defaultValue - The default value to return if the object is not found.
     * @returns The first object in the array that has the property child.
     */
    static GetObjectFromArray(object: any, child: string, defaultValue: any = {}): any {
        try {
            const _tmp = object.filter((__option: string) => Object.prototype.hasOwnProperty.call(__option, child))
            if (_tmp.length > 0) {
                return _tmp[0][child]
            } else {
                return defaultValue
            }
        } catch {
            return defaultValue
        }
    }

    /**
     * If the object has the child, return the child, otherwise return the default value.
     * @param {any} object - The object you want to get the child from.
     * @param {string} child - The child you want to get from the object
     * @param {any} defaultValue - The value to return if the child doesn't exist.
     * @returns The value of the child property of the object.
     */
    static GetChildFromObject(object: any, child: string, defaultValue: any = {}): any {
        try {
            return object?.child ?? defaultValue
        } catch {
            return defaultValue
        }
    }


    /**
     * If the object is null or undefined, return the default value. Otherwise, return the object
     * @param {any} object - The object to parse.
     * @param [defaultValue] - The value to return if the object is null or undefined.
     * @returns The value of the object if it is not null, otherwise the default value.
     */
    static ParseString(object: any, defaultValue = ""): string {
        try {
            return object ?? defaultValue
        } catch {
            return defaultValue
        }
    }

    /**
     * It takes an object and a default value, and returns the object as a number, or the default value
     * if the object is not a number.
     * @param {any} object - any - The object to parse
     * @param [defaultValue=0] - The default value to return if the object is null or undefined.
     * @returns The return value is a number.
     */
    static ParseNumber(object: any, defaultValue = 0): number {
        try {
            return Number.parseInt(object ?? defaultValue, 10)
        } catch (error: unknown) {
            return defaultValue
        }
    }
}