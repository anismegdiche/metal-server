//
//
//
//
//
import _ from "lodash"


//
export class clsClonable {
    
    Clone<T>(): T {
        // eslint-disable-next-line you-dont-need-lodash-underscore/clone-deep
        return _.cloneDeep(this) as unknown as T
    }
}