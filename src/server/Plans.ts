//
//
//
//
//
import _ from "lodash"
//
import { TJson } from "../types/TJson"
import { Config } from "./Config"
import { Plan } from "./Plan"


//
export class Plans {

    static readonly Plans = new Map<string, Plan>()

    static Init() {
        if (!Config.Has('plans'))
            return


        const plans = _.keys(Config.Get<TJson>("plans") ?? {})

        plans.forEach((plan: string) => {
            Plans.Plans.set(plan, new Plan(plan))
            Plans.Plans.get(plan)?.Init()
        })
    }
}