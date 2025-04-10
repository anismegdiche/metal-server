//
//
//
//
//
import _ from "lodash"


//
export class clsClonable {    
    Clone<T>(): T {
        return _.cloneDeep(this) as unknown as T
    }
}