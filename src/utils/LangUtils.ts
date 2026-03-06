//
//
//

//
export class LangUtils {
	static Convert(lang: string | undefined, src: any, tgt: any) {
		if (!lang) return undefined

		const matchedKey = Object.keys(src).find((key) => src[key as keyof typeof src] === lang)

		// Convert matchedKey to OCR_LANG
		return matchedKey ? tgt[matchedKey as keyof typeof tgt] : null
	}
}
