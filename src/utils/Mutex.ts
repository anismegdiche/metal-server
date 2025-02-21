//
//
//
//
//
import { Semaphore } from "./Semaphore"


// eslint-disable-next-line unused-imports/no-unused-vars
export class Mutex extends Semaphore {
    constructor() {
        super(1)
    }
}
