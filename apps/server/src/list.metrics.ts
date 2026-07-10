// for testing
// for testing
// for testing
import { MetricsGetDataPath } from "@metal/config"
import PersistentMap from "@metal/persistent-map"

//
const _path = MetricsGetDataPath()
console.log(`[Test] Metrics data path: ${_path}`)

const db = new PersistentMap<any>("../../data/metrics")



for (const [key, value] of db.entries()) {
	console.log(`[MetricsRepository] Key: ${key}, Value:`, value)
}