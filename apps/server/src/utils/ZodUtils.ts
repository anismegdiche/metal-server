//
//
//
import z from "zod"


//
const MUTUALLY_EXCLUSIVE_FILTER_MSG =
    "filter and filter-expression are mutually exclusive, provide only one"


//
export class ZodUtils {
    static WithExclusiveFilter<T extends z.ZodObject<any>>(schema: T) {
        return schema.superRefine((data, ctx) => {

            const hasFilter = Object.hasOwn(data, "filter")
            const hasFilterExpr = Object.hasOwn(data, "filter-expression")

            if (hasFilter && hasFilterExpr) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: MUTUALLY_EXCLUSIVE_FILTER_MSG,
                    path: ["filter"],
                })
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: MUTUALLY_EXCLUSIVE_FILTER_MSG,
                    path: ["filter-expression"],
                })
            }
        })
    }
}