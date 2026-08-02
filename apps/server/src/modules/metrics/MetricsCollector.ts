/** biome-ignore-all lint/suspicious/noExplicitAny: <explanation> */
//
//
//
//
import { CustomEvent, EventBus, on } from "@dimkl/events"
import { MetricsGetDataPath } from "@metal/config"
//
import { Logger } from "@metal/logger"
import PersistentMap from "@metal/persistent-map"
import { merge } from "lodash-es"
import { Queue } from "../../utils/Queue"
import { HttpResponse } from "../core/HttpResponse"
import type { TInternalResponse } from "../core/types/TInternalResponse"
import { METRIC_EVENT } from "./@events"

//
export class MetricsCollector {
	static Bus = new EventBus()
	static Data = new PersistentMap<any>(MetricsGetDataPath())
	static _queue = new Queue()

	static Get(metricName: string, defaultValue: any = undefined): any {
		if (!MetricsCollector.Data.has(metricName)) {
			return defaultValue
		}
		return MetricsCollector.Data.get(metricName)
	}

	@on({ eventName: METRIC_EVENT.SET, eventBus: MetricsCollector.Bus })
	@Queue.AddToQueue(MetricsCollector._queue)
	static Set(event: CustomEvent<any>) {
		const { metricName, metricData } = event.data
		MetricsCollector.Data.set(metricName, metricData)
	}

	@on({ eventName: METRIC_EVENT.UPDATE, eventBus: MetricsCollector.Bus })
	@Queue.AddToQueue(MetricsCollector._queue)
	static Update(event: CustomEvent<any>) {
		const { metricName, metricData } = event.data
		const oldData = MetricsCollector.Get(metricName)
		MetricsCollector.Data.set(metricName, merge(oldData, metricData))
	}

	@on({ eventName: METRIC_EVENT.INC, eventBus: MetricsCollector.Bus })
	@Queue.AddToQueue(MetricsCollector._queue)
	static Inc(event: CustomEvent<any>) {
		const { metricName } = event.data
		const oldData: number = MetricsCollector.Get(metricName) ?? 0
		MetricsCollector.Data.set(metricName, oldData + 1)
	}

	static Clear() {
		MetricsCollector.Data.clear()
	}

	@Logger.LogFunction()
	static async GetMetric(metricName: string): Promise<TInternalResponse<any>> {
		return HttpResponse.Ok(MetricsCollector.Get(metricName))
	}

	static async GetMetricsRange(metricFrom: string, metricTo: string): Promise<TInternalResponse<any>> {
		const metrics = MetricsCollector.Data.findRange({
			start: metricFrom,
			end: metricTo,
		})
		return HttpResponse.Ok(Object.fromEntries(metrics))
	}

	@Logger.LogFunction()
	static async GetAllMetrics(): Promise<TInternalResponse<any>> {
		const metrics = MetricsCollector.Data.entries()
		return HttpResponse.Ok(Object.fromEntries(metrics))
	}

	static DispatchEvent_set(metricName: string, metricData: any) {
		MetricsCollector.Bus.dispatchEvent(
			new CustomEvent<any>(METRIC_EVENT.SET, {
				data: {
					metricName,
					metricData,
				},
			}),
		)
	}

	static DispatchEvent_update(metricName: string, metricData: any) {
		MetricsCollector.Bus.dispatchEvent(
			new CustomEvent<any>(METRIC_EVENT.UPDATE, {
				data: {
					metricName,
					metricData,
				},
			}),
		)
	}

	static DispatchEvent_inc(metricName: string) {
		MetricsCollector.Bus.dispatchEvent(
			new CustomEvent<any>(METRIC_EVENT.INC, {
				data: {
					metricName,
				},
			}),
		)
	}
}

