/** biome-ignore-all lint/suspicious/noExplicitAny: <explanation> */
//
//
//
import { CustomEvent, EventBus, on } from "@dimkl/events"
//
import { MetricsGetDataPath } from "@metal/config"
import PersistentMap from "@metal/persistent-map"
import { Logger } from "../../utils/Logger"
import { HttpResponse } from "../core/HttpResponse"
import type { TInternalResponse } from "../core/types/TInternalResponse"
import { METRIC_EVENT } from "./@events"


//
export class MetricsCollector {

    static Bus = new EventBus()
    static Data = new PersistentMap<any>(MetricsGetDataPath())

    static Get(metricName: string, defaultValue: any = undefined): any {
        if (!MetricsCollector.Data.has(metricName)) {
            return defaultValue
        }
        return MetricsCollector.Data.get(metricName)
    }

    @on({ eventName: METRIC_EVENT.SET, eventBus: MetricsCollector.Bus })
    static Set(event: CustomEvent<any>) {
        const { metricName, metricData } = event.data
        MetricsCollector.Data.set(metricName, metricData)
    }

    @Logger.LogFunction()
    static async GetMetric(metricName: string): Promise<TInternalResponse<any>> {
        return HttpResponse.Ok(MetricsCollector.Get(metricName))
    }

    static async GetMetricsRange(metricFrom: string, metricTo: string): Promise<TInternalResponse<any>> {
        const metrics = MetricsCollector.Data.findRange(metricFrom, metricTo)
        return HttpResponse.Ok(
            Object.fromEntries(metrics)
        )
    }

    @Logger.LogFunction()
    static async GetAllMetrics(): Promise<TInternalResponse<any>> {
        const metrics = MetricsCollector.Data.entries()
        return HttpResponse.Ok(
            Object.fromEntries(metrics)
        )
    }

    static DispatchSetEvent(metricName: string, metricData: any) {
        MetricsCollector.Bus.dispatchEvent(
            new CustomEvent<any>(METRIC_EVENT.SET, {
                data: {
                    metricName,
                    metricData
                },
            }),
        )
    }
}