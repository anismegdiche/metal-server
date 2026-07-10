//
//
//
import type { IEvent } from "@dimkl/events"


//
export enum METRIC_EVENT {
    SET = "metric:set"
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

