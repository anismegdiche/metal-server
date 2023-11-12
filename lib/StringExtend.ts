//
//
//
//
//

export class StringExtend {
    static Split(str: string, sep: string) {
        let _array: string[] = []

        if (str.includes(sep)) {
            _array = str.split(sep)
                .filter(__field => !(__field === undefined || __field.trim() === ""))
                .map(__field => __field.trim())
        }
        return _array
    }

    
    static FixObjectMissingQuotes(str: string) {
        const fixedStr = str.replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":')
        const fixedStrWithQuotes = fixedStr.replace(/:\s*([^"{[,\s][^,\s}]*)/g, ':"$1"')
        return fixedStrWithQuotes
    }
}

Object.assign(String.prototype, {
    Split(str: string, sep = ",") {
        return StringExtend.Split(str, sep)
    }
})