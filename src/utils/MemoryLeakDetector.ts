//
// Memory Leak Detector Utility
// This utility helps identify growing objects and potential memory leaks
//
import { Logger } from './Logger'

export type TMemorySnapshot = {
    timestamp: number
    heapUsed: number
    heapTotal: number
    external: number
    arrayBuffers: number
    rss: number
}

export type TObjectTracker = {
    name: string
    size: number
    timestamp: number
}

export class MemoryLeakDetector {
    private static snapshots: TMemorySnapshot[] = []
    private static objectTrackers: Map<string, TObjectTracker[]> = new Map()
    private static intervalId?: NodeJS.Timeout
    private static maxSnapshots = 100

    /**
     * Start monitoring memory usage
     * @param intervalMs - Interval in milliseconds to take snapshots (default: 10000ms = 10s)
     */
    static StartMonitoring(intervalMs: number = 10000): void {
        if (this.intervalId) {
            Logger.Warn('Memory monitoring is already running')
            return
        }

        Logger.Info(`Starting memory leak detection monitoring (interval: ${intervalMs}ms)`)

        this.intervalId = setInterval(() => {
            this.TakeSnapshot()
        }, intervalMs)
    }

    /**
     * Stop monitoring memory usage
     */
    static StopMonitoring(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId)
            this.intervalId = undefined
            Logger.Info('Stopped memory leak detection monitoring')
        }
    }

    /**
     * Take a memory snapshot
     */
    static TakeSnapshot(): TMemorySnapshot {
        const memUsage = process.memoryUsage()
        const snapshot: TMemorySnapshot = {
            timestamp: Date.now(),
            heapUsed: memUsage.heapUsed,
            heapTotal: memUsage.heapTotal,
            external: memUsage.external,
            arrayBuffers: memUsage.arrayBuffers,
            rss: memUsage.rss
        }

        this.snapshots.push(snapshot)

        // Keep only the last maxSnapshots
        if (this.snapshots.length > this.maxSnapshots) {
            this.snapshots.shift()
        }

        return snapshot
    }

    /**
     * Track an object's size over time
     * @param name - Name of the object to track
     * @param obj - The object to track (Map, Set, Array, etc.)
     */
    static TrackObject(name: string, obj: any): void {
        let size = 0

        if (obj instanceof Map || obj instanceof Set) {
            size = obj.size
        } else if (Array.isArray(obj)) {
            size = obj.length
        } else if (typeof obj === 'object' && obj !== null) {
            size = Object.keys(obj).length
        } else {
            Logger.Warn(`Cannot track object type for: ${name}`)
            return
        }

        if (!this.objectTrackers.has(name)) {
            this.objectTrackers.set(name, [])
        }

        const trackers = this.objectTrackers.get(name)!
        trackers.push({
            name,
            size,
            timestamp: Date.now()
        })

        // Keep only the last 100 measurements
        if (trackers.length > 100) {
            trackers.shift()
        }
    }

    /**
     * Get memory growth rate (bytes per second)
     */
    static GetMemoryGrowthRate(): number {
        if (this.snapshots.length < 2) {
            return 0
        }

        const first = this.snapshots[0]
        const last = this.snapshots[this.snapshots.length - 1]

        const timeDiff = (last!.timestamp - first!.timestamp) / 1000 // seconds
        const memDiff = last!.heapUsed - first!.heapUsed

        return memDiff / timeDiff
    }

    /**
     * Get object growth rate (items per second)
     */
    static GetObjectGrowthRate(name: string): number {
        const trackers = this.objectTrackers.get(name)
        if (!trackers || trackers.length < 2) {
            return 0
        }

        const first = trackers[0]
        const last = trackers[trackers.length - 1]

        const timeDiff = (last!.timestamp - first!.timestamp) / 1000 // seconds
        const sizeDiff = last!.size - first!.size

        return sizeDiff / timeDiff
    }

    /**
     * Get a report of all tracked objects
     */
    static GetObjectReport(): Record<string, {
        currentSize: number
        growthRate: number
        isGrowing: boolean
    }> {
        const report: Record<string, any> = {}

        for (const [name, trackers] of this.objectTrackers.entries()) {
            if (trackers.length === 0) continue

            const currentSize = trackers[trackers.length - 1]!.size
            const growthRate = this.GetObjectGrowthRate(name)

            report[name] = {
                currentSize,
                growthRate,
                isGrowing: growthRate > 0.01 // Growing if more than 0.01 items/sec
            }
        }

        return report
    }

    /**
     * Get a memory usage report
     */
    static GetMemoryReport(): {
        current: TMemorySnapshot
        growthRate: number
        isLeaking: boolean
        snapshots: TMemorySnapshot[]
    } {
        const current = this.snapshots[this.snapshots.length - 1] || this.TakeSnapshot()
        const growthRate = this.GetMemoryGrowthRate()

        return {
            current,
            growthRate,
            isLeaking: growthRate > 1024 * 100, // Leaking if growing more than 100KB/sec
            snapshots: [...this.snapshots]
        }
    }

    /**
     * Print a detailed report to the console
     */
    static PrintReport(): void {
        Logger.Info('=== Memory Leak Detection Report ===')

        // Memory report
        const memReport = this.GetMemoryReport()
        Logger.Info(`\nMemory Usage:`)
        Logger.Info(`  Heap Used: ${this.formatBytes(memReport.current.heapUsed)}`)
        Logger.Info(`  Heap Total: ${this.formatBytes(memReport.current.heapTotal)}`)
        Logger.Info(`  RSS: ${this.formatBytes(memReport.current.rss)}`)
        Logger.Info(`  Growth Rate: ${this.formatBytes(memReport.growthRate)}/sec`)
        Logger.Info(`  Is Leaking: ${memReport.isLeaking ? '⚠️ YES' : '✅ NO'}`)

        // Object report
        const objReport = this.GetObjectReport()
        Logger.Info(`\nTracked Objects:`)

        for (const [name, data] of Object.entries(objReport)) {
            const status = data.isGrowing ? '⚠️ GROWING' : '✅ STABLE'
            Logger.Info(`  ${name}:`)
            Logger.Info(`    Current Size: ${data.currentSize}`)
            Logger.Info(`    Growth Rate: ${data.growthRate.toFixed(2)} items/sec`)
            Logger.Info(`    Status: ${status}`)
        }

        Logger.Info('===================================')
    }

    /**
     * Clear all snapshots and tracked objects
     */
    static Clear(): void {
        this.snapshots = []
        this.objectTrackers.clear()
        Logger.Info('Cleared all memory leak detection data')
    }

    /**
     * Format bytes to human readable format
     */
    private static formatBytes(bytes: number): string {
        if (bytes === 0) return '0 Bytes'

        const k = 1024
        const sizes = ['Bytes', 'KB', 'MB', 'GB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))

        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    }

    /**
     * Get event listener count for common objects
     */
    static GetEventListenerCount(emitter: NodeJS.EventEmitter): Record<string, number> {
        const eventNames = emitter.eventNames()
        const counts: Record<string, number> = {}

        for (const eventName of eventNames) {
            const listeners = emitter.listenerCount(eventName as string | symbol)
            counts[String(eventName)] = listeners
        }

        return counts
    }
}
