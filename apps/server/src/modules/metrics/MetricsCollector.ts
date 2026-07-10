//
/** biome-ignore-all lint/suspicious/noExplicitAny: <explanation> */
//
//
import { CustomEvent, EventBus, type IEvent, on } from "@dimkl/events"
//
import { MetricsGetDataPath } from "@metal/config"
import PersistentMap from "@metal/persistent-map"
import { Logger } from "../../utils/Logger"
import { HttpResponse } from "../core/HttpResponse"
import type { TInternalResponse } from "../core/types/TInternalResponse"


//
export enum METRIC_EVENT {
    SET = "metric:set",
}


//
declare global {
    interface MetricSet extends IEvent {
        type: METRIC_EVENT.SET
        data: any
    }

    interface Events {
        [METRIC_EVENT.SET]: MetricSet
    }
}


//
export class MetricsCollector {

    static Bus = new EventBus()
    static Data = new PersistentMap<any>(MetricsGetDataPath())

    static Get(metricName: string): any {
        if (!MetricsCollector.Data.has(metricName)) {
            return undefined
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