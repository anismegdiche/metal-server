//
//
// Server Shutdown Manager
// Handles graceful shutdown of all server components
//
import type { Server } from "node:http"
import { Logger } from "@metal/logger"
import { JsonUtils } from "@metal/utils"
import type { FSWatcher } from "chokidar"
import { AiDocker } from "../ai-engine/AiDocker"
import { Cache } from "../cache/Cache"
import { Schedule } from "../plan/Schedule"
import { Source } from "../source/Source"

export class ServerShutdown {
	private static httpServer?: Server
	private static configWatcher?: FSWatcher
	private static isShuttingDown = false
	private static shutdownTimeout = 30000 // 30 seconds

	/**
	 * Register the HTTP server instance for shutdown
	 */
	static RegisterHttpServer(server: Server): void {
		ServerShutdown.httpServer = server
	}

	/**
	 * Register the config file watcher for shutdown
	 */
	static RegisterConfigWatcher(watcher: FSWatcher): void {
		ServerShutdown.configWatcher = watcher
	}

	/**
	 * Set shutdown timeout in milliseconds
	 */
	static SetShutdownTimeout(timeout: number): void {
		ServerShutdown.shutdownTimeout = timeout
	}

	/**
	 * Perform graceful shutdown of all components
	 */
	@Logger.LogFunction()
	static async Shutdown(signal: string): Promise<void> {
		if (ServerShutdown.isShuttingDown) {
			Logger.Warn("Shutdown already in progress...")
			return
		}

		ServerShutdown.isShuttingDown = true
		Logger.Info(`\n${signal} received. Starting graceful shutdown...`)

		// Set a timeout to force exit if shutdown takes too long
		const forceExitTimer = setTimeout(() => {
			Logger.Error(`Shutdown timeout (${ServerShutdown.shutdownTimeout}ms) exceeded. Forcing exit...`)
			process.exit(1)
		}, ServerShutdown.shutdownTimeout)

		try {
			// 1. Stop accepting new requests
			await ServerShutdown.StopHttpServer()

			// 2. Stop scheduled tasks
			await ServerShutdown.StopScheduledTasks()

			// 3. Stop AI Engine components
			await ServerShutdown.StopAiEngine()

			// 4. Stop file watchers
			await ServerShutdown.StopFileWatchers()

			// 5. Disconnect from data sources
			await ServerShutdown.DisconnectDataSources()

			// 6. Disconnect from cache
			await ServerShutdown.DisconnectCache()

			// 7. Final cleanup
			await ServerShutdown.FinalCleanup()

			clearTimeout(forceExitTimer)
			Logger.Info("✅ Graceful shutdown completed successfully")
			process.exit(0)
		} catch (error) {
			clearTimeout(forceExitTimer)
			Logger.Error(`Error during shutdown: ${error}`)
			process.exit(1)
		}
	}

	/**
	 * Stop HTTP server from accepting new connections
	 */
	private static async StopHttpServer(): Promise<void> {
		if (!ServerShutdown.httpServer) {
			Logger.Debug("No HTTP server to stop")
			return
		}

		return new Promise((resolve, reject) => {
			Logger.Info("Stopping HTTP server...")
			ServerShutdown.httpServer?.close((err) => {
				if (err) {
					Logger.Error(`Error stopping HTTP server: ${err.message}`)
					reject(err)
				} else {
					Logger.Info("✅ HTTP server stopped")
					resolve()
				}
			})
		})
	}

	/**
	 * Stop all scheduled tasks
	 */
	private static async StopScheduledTasks(): Promise<void> {
		try {
			Logger.Info("Stopping scheduled tasks...")
			Schedule.StopAll()
			Logger.Info("✅ Scheduled tasks stopped")
		} catch (error) {
			Logger.Error(`Error stopping scheduled tasks: ${error}`)
			throw error
		}
	}

	/**
	 * Stop AI Engine components
	 */
	private static async StopAiEngine(): Promise<void> {
		try {
			Logger.Info("Stopping AI Engine...")

			// Stop the auto-scaler
			AiDocker.StopScaler()

			// Clean up Docker containers
			await AiDocker.CleanStack()

			Logger.Info("✅ AI Engine stopped")
		} catch (error) {
			Logger.Error(`Error stopping AI Engine: ${error}`)
			// Don't throw - continue with other cleanup
		}
	}

	/**
	 * Stop file watchers
	 */
	private static async StopFileWatchers(): Promise<void> {
		try {
			Logger.Info("Stopping file watchers...")

			if (ServerShutdown.configWatcher) {
				await ServerShutdown.configWatcher.close()
				Logger.Info("✅ Config file watcher stopped")
			}
		} catch (error) {
			Logger.Error(`Error stopping file watchers: ${error}`)
			// Don't throw - continue with other cleanup
		}
	}

	/**
	 * Disconnect from all data sources
	 */
	private static async DisconnectDataSources(): Promise<void> {
		try {
			Logger.Info("Disconnecting from data sources...")
			await Source.DisconnectAll()
			Logger.Info("✅ Data sources disconnected")
		} catch (error) {
			Logger.Error(`Error disconnecting data sources: ${error}`)
			throw error
		}
	}

	/**
	 * Disconnect from cache
	 */
	private static async DisconnectCache(): Promise<void> {
		try {
			Logger.Info("Disconnecting from cache...")
			await Cache.Disconnect()
			Logger.Info("✅ Cache disconnected")
		} catch (error) {
			Logger.Error(`Error disconnecting cache: ${error}`)
			throw error
		}
	}

	/**
	 * Final cleanup tasks
	 */
	private static async FinalCleanup(): Promise<void> {
		try {
			Logger.Info("Performing final cleanup...")

			// Cleanup any remaining locks in StorageFoldersData instances
			// This would need to be called on each instance if you track them

			// Force garbage collection if available
			if (globalThis.gc) {
				Logger.Debug("Running garbage collection...")
				globalThis.gc()
			}

			Logger.Info("✅ Final cleanup completed")
		} catch (error) {
			Logger.Error(`Error during final cleanup: ${error}`)
			// Don't throw - we're shutting down anyway
		}
	}

	/**
	 * Setup signal handlers for graceful shutdown
	 */
	static SetupSignalHandlers(): void {
		// Handle SIGTERM (Docker, Kubernetes, etc.)
		process.on("SIGTERM", () => {
			ServerShutdown.Shutdown("SIGTERM").catch((err) => {
				Logger.Error(`Shutdown error: ${err}`)
				process.exit(1)
			})
		})

		// Handle SIGINT (Ctrl+C)
		process.on("SIGINT", () => {
			ServerShutdown.Shutdown("SIGINT").catch((err) => {
				Logger.Error(`Shutdown error: ${err}`)
				process.exit(1)
			})
		})

		// Handle uncaught exceptions
		process.on("uncaughtException", (error: Error) => {
			Logger.Error(`Uncaught Exception: ${error.message}`)
			Logger.Error(error.stack || "")
			ServerShutdown.Shutdown("UNCAUGHT_EXCEPTION").catch(() => {
				process.exit(1)
			})
		})

		// Handle unhandled promise rejections
		process.on("unhandledRejection", (reason: any, promise: Promise<any>) => {
			Logger.Error(`Unhandled Rejection at: ${JsonUtils.Stringify(promise)}, reason: ${reason}`)
			ServerShutdown.Shutdown("UNHANDLED_REJECTION").catch(() => {
				process.exit(1)
			})
		})

		Logger.Info("✅ Signal handlers registered for graceful shutdown")
	}
}
