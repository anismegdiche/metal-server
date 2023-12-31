//
//
//
//
//

export class StringHelper {
    static Split(str: string, sep: string) {
        return (str.includes(sep))
            ? str.split(sep)
                .filter(_field => !(_field === undefined || _field.trim() === ""))
                .map(_field => _field.trim())
            : []
    }

    static FixObjectMissingQuotes(str: string) {
        const stringFixed = str.replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":')
        return stringFixed.replace(/:\s*([^"{[,\s][^,\s}]*)/g, ':"$1"')
    }
}