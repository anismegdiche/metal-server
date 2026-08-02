//
//
//
import type { IEvent } from "@dimkl/events"


//
export enum METRIC_EVENT {
    SET = "metric:set",
    UPDATE = "metric:update",
    INC = "metric:inc"
}


//
declare global {
    interface MetricSet extends IEvent {
        type: METRIC_EVENT.SET
        data: any
    }

    interface MetricUpdate extends IEvent {
        type: METRIC_EVENT.UPDATE
        data: any
    }

    interface MetricInc extends IEvent {
        type: METRIC_EVENT.INC
        data: any
    }

    interface Events {
        [METRIC_EVENT.SET]: MetricSet
        [METRIC_EVENT.UPDATE]: MetricUpdate
        [METRIC_EVENT.INC]: MetricInc
    }
}

