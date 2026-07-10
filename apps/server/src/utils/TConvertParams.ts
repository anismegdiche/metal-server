//
//
//


//
export type TConvertParams<S extends string> = S extends `${infer T}-${infer U}`
	? `${T}${Capitalize<TConvertParams<U>>}`
	: S