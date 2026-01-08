//
//
//
//
//
import * as _ from 'lodash-es'


//
export class clsClonable {
    Clone<T>(): T {
        return _.cloneDeep(this) as unknown as T
    }
}