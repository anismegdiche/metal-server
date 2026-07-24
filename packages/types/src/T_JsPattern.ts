import z from "zod"

export const z_T_JsPattern = z.string()
	.refine((value) => {
		const openCount = (value.match(/\$\{\{/g) || []).length
		const closeCount = (value.match(/\}\}/g) || []).length
		return openCount === closeCount && openCount > 0
	}, {
		// biome-ignore lint/suspicious/noTemplateCurlyInString: metal feature
		message: "pattern must respect the syntax ${{ ... }}"
	})

export type T_JsPattern = z.infer<typeof z_T_JsPattern>
