//
//
//

import fs from "node:fs"
import { Logger } from "@metal/logger"
import { JsonUtils, StringUtils } from "@metal/utils"
import Docker from "dockerode"
//
import { Assert } from "../../utils/Assert"
import { Mutex } from "../../utils/Mutex"
import { ConfigManager } from "../core/ConfigManager"
import type { U__server_ai_engines } from "../core/types/U__server"
import { HttpErrorInternalServerError, NormalizeError } from "../errors/HttpErrors"
import { DOCKER } from "./consts/DOCKER"
import { CaddyDockerService } from "./docker-services/CaddyDockerService"
import type { TAiDockerService } from "./types/TAiDockerService"

//
export class AiDocker {
	static docker: Docker = new Docker()
	static AutoScaleWorker: NodeJS.Timeout | undefined
	static Instances: Map<string, TAiDockerService> = new Map()

	static Config: U__server_ai_engines

	static _convertStreamToLog(streamString: string): string[] {
		if (!streamString) return []

		const _streamString = streamString
			.split("\r\n")
			.map((item: string) => item.replaceAll(/(\\r|\\n)/g, ""))
			.map((item) => {
				try {
					const parsed = JsonUtils.TryParse(item, { stream: "" }, true)
					return parsed && typeof parsed.stream === "string" ? parsed.stream : ""
				} catch {
					return ""
				}
			})
			.filter((item) => item && typeof item === "string" && item.trim().length > 0)

		return _streamString
	}

	@Logger.LogFunction()
	static async Init(isBuildMode = false) {
		AiDocker.Config = ConfigManager.Get<U__server_ai_engines>("server.ai-engines")

		const _dockerOptions = AiDocker.Config.params

		if (typeof _dockerOptions?.ca === "string") _dockerOptions.ca = fs.readFileSync(_dockerOptions.ca)

		if (typeof _dockerOptions?.cert === "string") _dockerOptions.cert = fs.readFileSync(_dockerOptions.cert)

		if (typeof _dockerOptions?.key === "string") _dockerOptions.key = fs.readFileSync(_dockerOptions.key)

		try {
			AiDocker.docker = new Docker(_dockerOptions)
			Logger.Info(`${Logger.Out} Docker client initialized`)

			await AiDocker.docker.ping().catch((e) => {
				throw new HttpErrorInternalServerError(`Docker daemon is unreachable: ${e.message}`)
			})
			Logger.Info(`${Logger.Out} Docker daemon is reachable`)

			if (!isBuildMode) {
				Logger.Info(`${Logger.In} Starting AI Engine stack manager`)

				await AiDocker.CleanStack().catch((e) => {
					throw new HttpErrorInternalServerError(`Unable to clean stack: ${e.message}`)
				})

				await AiDocker.CreateNetwork().catch((e) => {
					throw new HttpErrorInternalServerError(`Unable to create network: ${e.message}`)
				})

				await AiDocker.StartCaddy().catch((e) => {
					throw new HttpErrorInternalServerError(`Unable to start reverse proxy: ${e.message}`)
				})

				AiDocker.StartScaler()

				Logger.Info(`${Logger.Out} AI Engine stack manager started`)
			}
		} catch (error) {
			throw new HttpErrorInternalServerError(NormalizeError(error).message)
		}
	}

	@Logger.LogFunction()
	static async StartService(service: TAiDockerService) {
		const minInstances = AiDocker.Config["min-instance"]
		Assert.Var<number>(minInstances, "server.ai-engines.min-instance is not defined")

		service.Lock = new Mutex()
		const serviceName = service.InstanceName ?? service.Name
		AiDocker.Instances.set(serviceName, service)
		await AiDocker.BuildServiceImage(service).catch(Logger.Error)
		const containers = await AiDocker.ListActiveContainers(service)
		for (let i = containers.length; i < minInstances; i++) {
			await AiDocker.ScaleUp(service)
		}
	}

	@Logger.LogFunction()
	static StartScaler() {
		const scaleInterval = AiDocker.Config["scale-interval"]
		Assert.Var<number>(scaleInterval, "server.ai-engines.scale-interval is not defined")

		// Clear any existing interval first to prevent duplicates
		if (AiDocker.AutoScaleWorker) clearInterval(AiDocker.AutoScaleWorker)

		AiDocker.AutoScaleWorker = setInterval(AiDocker.AutoScale, scaleInterval)
	}

	@Logger.LogFunction()
	static StopScaler() {
		if (AiDocker.AutoScaleWorker) {
			try {
				clearInterval(AiDocker.AutoScaleWorker)
				Logger.Info("AutoScaler stopped successfully")
			} catch (error) {
				Logger.Error(`Failed to clear auto scaler: ${error instanceof Error ? error.message : String(error)}`)
			} finally {
				AiDocker.AutoScaleWorker = undefined
			}
		}
	}

	@Logger.LogFunction()
	static async CleanStack() {
		Logger.Info(`${Logger.In} Cleaning ${DOCKER.AI_ENGINE_PREFIX} stack...`)
		const containers = await AiDocker.docker.listContainers({
			all: true,
			filters: {
				name: [`${DOCKER.AI_ENGINE_PREFIX}_*`],
			},
		})

		const containerCleanupPromises = containers.map(async (container) => {
			try {
				Logger.Info(`${Logger.In} Stopping container '${container.Names[0]}'...`)
				const c = AiDocker.docker.getContainer(container.Id)
				if (container.State === "running") {
					await c.stop({ t: 10000 }).catch((stopError) => {
						Logger.Warn(
							`Failed to stop container '${container.Names[0]}': ${stopError instanceof Error ? stopError.message : String(stopError)}`,
						)
					})
				}
				await c.remove({ force: true }).catch((removeError) => {
					Logger.Warn(
						`Failed to remove container '${container.Names[0]}': ${removeError instanceof Error ? removeError.message : String(removeError)}`,
					)
				})
				Logger.Info(`${Logger.Out} Stopped container '${container.Names[0]}'`)
				return { success: true, container: container.Names[0] }
			} catch (error) {
				Logger.Error(
					`Error processing container '${container.Names[0]}': ${error instanceof Error ? error.message : String(error)}`,
				)
				return { success: false, container: container.Names[0], error }
			}
		})

		const cleanupResults = await Promise.allSettled(containerCleanupPromises)
		const failedContainers = cleanupResults.filter((result) => result.status === "fulfilled" && !result.value.success)

		if (failedContainers.length > 0) {
			Logger.Warn(`${failedContainers.length} containers failed to clean up properly`)
		}

		const networks = await AiDocker.docker.listNetworks({
			filters: {
				name: [DOCKER.AI_NETWORK],
			},
		})

		const promisesNetworks = networks.map(async (network) => {
			try {
				Logger.Info(`${Logger.In} Removing docker network '${network.Name}'...`)
				const n = AiDocker.docker.getNetwork(network.Id)
				await n.remove()
				Logger.Info(`${Logger.Out} Removed docker network '${network.Name}'`)
			} catch (e: unknown) {
				Logger.Error((e as Error).message)
				throw e
			}
		})

		await Promise.allSettled(promisesNetworks)

		Logger.Info(`${Logger.Out} '${DOCKER.AI_ENGINE_PREFIX}' stack cleaned`)
	}

	@Logger.LogFunction()
	static async CreateNetwork() {
		try {
			await AiDocker.docker.createNetwork({ Name: DOCKER.AI_NETWORK })
			Logger.Info(`Docker network created: ${DOCKER.AI_NETWORK}`)
		} catch (e: unknown) {
			if (e && typeof e === "object" && "statusCode" in e && e.statusCode === 409) {
				Logger.Info(`Docker network already exists: ${DOCKER.AI_NETWORK}`)
			} else {
				throw e
			}
		}
	}

	@Logger.LogFunction()
	static async PullImage(image: string): Promise<void> {
		const stream = await AiDocker.docker.pull(image)
		return new Promise<void>((resolve, reject) => {
			AiDocker.docker.modem.followProgress(
				stream,
				(err: Error | null, _output: unknown) => {
					if (err) {
						Logger.Error(`Error in pull progress for ${image}: ${err.message}`)
						return reject(err)
					}
					Logger.Debug(`${Logger.Out} AiDocker.PullImage: 📦 Pulling ${image}...`)
					resolve()
				},
				(event: { status: string; progress?: string }) => {
					if (event.status === "Downloading") {
						Logger.Debug(`${Logger.Out} AiDocker.PullImage: 📦 Pulling ${image}... ${event.progress}`)
					} else {
						Logger.Debug(`${Logger.Out} AiDocker.PullImage: 📦 Pulling ${image}... ${event.status}`)
					}
				},
			)
		})
	}

	@Logger.LogFunction()
	static async BuildServiceImage(service: TAiDockerService): Promise<void> {
		const existingImages = await AiDocker.docker
			.listImages({
				filters: {
					reference: [service.ImageName],
				},
			})
			.catch((error) => {
				Logger.Error(`Error listing images: ${error.message}`)
				return [] as Docker.ImageInfo[]
			})

		if (existingImages.length > 0) {
			Logger.Info(`${Logger.Out} 📦 Image ${service.ImageName} already exists. Skipping build.`)
			return
		}

		const stream = await AiDocker.docker.buildImage(service.ImageContext as Docker.ImageBuildContext, {
			t: service.ImageName,
		})

		return new Promise<void>((resolve, reject) => {
			let _streamData = ""

			const onData = (data: Buffer) => {
				const __data = data.toString()
				_streamData += __data

				const parts = _streamData.split("}")

				// Last part may be incomplete, keep it in buffer
				_streamData = parts.pop() || ""

				for (const part of parts) {
					const complete = `${part}}`
					try {
						const ___aLog = AiDocker._convertStreamToLog(complete)
						___aLog.forEach((item: string) => {
							Logger.Debug(`${Logger.Out} 🔨 Building '${service.ImageName}' image... ${item}`)
						})
					} catch {
						Logger.Warn(`${Logger.Out} ⚠️ Failed to parse log part: ${complete}`)
					}
				}
			}

			const cleanup = () => {
				stream.removeListener("data", onData)
				stream.removeListener("end", onEnd)
				stream.removeListener("error", onError)
			}

			const onEnd = () => {
				cleanup()
				if (_streamData.length > 0) {
					const ___aLog = AiDocker._convertStreamToLog(_streamData)
					___aLog.forEach((item: string) => {
						Logger.Debug(`${Logger.Out} 🔨 Building '${service.ImageName}' image: ${item}`)
					})
					_streamData = ""
				}
				Logger.Info(`${Logger.Out} 🔨 Built '${service.ImageName}' image`)
				resolve()
			}

			const onError = (err: Error) => {
				cleanup()
				Logger.Error(`${Logger.Out} 🔨 ❌ Error building '${service.ImageName}' image: ${err}`)
				reject(err)
			}

			stream.on("data", onData)
			stream.on("end", onEnd)
			stream.on("error", onError)
		})
	}

	@Logger.LogFunction()
	private static async CreateServiceContainer(service: TAiDockerService) {
		const _cpu = AiDocker.Config.cpu
		const _memory = AiDocker.Config.memory
		const _cpuScaleUp = AiDocker.Config["cpu-scale-up"]
		const _cpuScaleDown = AiDocker.Config["cpu-scale-down"]
		const _scaleInterval = AiDocker.Config["scale-interval"]
		const _scaleDownGracePeriod = AiDocker.Config["scale-down-grace-period"]
		const _cors = AiDocker.Config.cors

		Assert.Var<number>(_cpu, "server.ai-engines.cpu is not defined")
		Assert.Var<number>(_memory, "server.ai-engines.memory is not defined")
		Assert.Var<number>(_cpuScaleUp, "server.ai-engines.cpu-scale-up is not defined")
		Assert.Var<number>(_cpuScaleDown, "server.ai-engines.cpu-scale-down is not defined")
		Assert.Var<number>(_scaleInterval, "server.ai-engines.scale-interval is not defined")
		Assert.Var<number>(_scaleDownGracePeriod, "server.ai-engines.scale-down-grace-period is not defined")

		const serviceName = service.InstanceName ?? service.Name
		const containerName = `${DOCKER.AI_ENGINE_PREFIX}_${serviceName}_${Date.now()}`
		const serviceIndex = Array.from(AiDocker.Instances.keys()).indexOf(serviceName)

		const container = await AiDocker.docker.createContainer({
			Image: service.ImageName,
			name: containerName,
			Hostname: containerName,
			NetworkingConfig: {
				EndpointsConfig: { [DOCKER.AI_NETWORK]: {} },
			},
			Env: [
				"MAX_HISTORY=3",
				`MAX_LOAD=${_cpuScaleUp}`,
				`ALLOWED_ORIGINS=${_cors?.["allowed-origins"]}`,
				`ALLOWED_METHODS=${_cors?.["allowed-methods"]}`,
				`ALLOWED_HEADERS=${_cors?.["allowed-headers"]}`,
			],
			Labels: {
				service: serviceName,
				scaled: "true",

				caddy_ingress_network: DOCKER.AI_NETWORK,

				// Caddy site
				caddy: ":5000",

				// Use an index to avoid label conflicts between different services
				[`caddy.${serviceIndex}_route`]: `/${serviceName}*`,

				// Rewrite path
				[`caddy.${serviceIndex}_route.0_uri`]: `replace ^/${serviceName} ${service.InternalUrl}`,

				// Reverse proxy to the container itself
				[`caddy.${serviceIndex}_route.1_reverse_proxy`]: `{{upstreams ${service?.Port ?? 5000}}}`,

				// Health check configuration
				// [`caddy.${serviceIndex}_route.1_reverse_proxy.health_uri`]: `${service.InternalUrl}/health`,
				// [`caddy.${serviceIndex}_route.1_reverse_proxy.health_interval`]: `10s`,
				// [`caddy.${serviceIndex}_route.1_reverse_proxy.health_timeout`]: `5s`,

				// Passive health checks
				[`caddy.${serviceIndex}_route.1_reverse_proxy.unhealthy_status`]: `429`,
				[`caddy.${serviceIndex}_route.1_reverse_proxy.max_fails`]: `1`,
				[`caddy.${serviceIndex}_route.1_reverse_proxy.fail_duration`]: `10s`,

				// Load balancing configuration
				[`caddy.${serviceIndex}_route.1_reverse_proxy.lb_policy`]: `round_robin`,
				[`caddy.${serviceIndex}_route.1_reverse_proxy.lb_retries`]: `3`,
				[`caddy.${serviceIndex}_route.1_reverse_proxy.lb_try_duration`]: `5s`,
				[`caddy.${serviceIndex}_route.1_reverse_proxy.lb_try_interval`]: `250ms`,
			},
			HostConfig: {
				// Restart Policy
				RestartPolicy: { Name: "unless-stopped" },

				// Network
				NetworkMode: DOCKER.AI_NETWORK,

				// Volume
				Binds: service.DockerVolume,

				// CPU Configuration
				NanoCpus: _cpu * 1_000_000_000, // 4 CPUs (1 CPU = 1e9 nanocpus)

				// Memory Configuration
				Memory: _memory * 1_000_000_000, // 6 GB hard limit (in bytes)
				MemoryReservation: _memory * 100_000_000, // 4 GB soft limit
				MemorySwap: -1, // Disable swap (or set to Memory value to prevent
			},
		})

		await container
			.start()
			.then(() => {
				Logger.Info(`${Logger.Out} Started new '${serviceName}' container '${containerName}'`)
			})
			.catch((error) => {
				Logger.Error(`${Logger.Out} Failed to start new '${serviceName}' container '${containerName}': ${error}`)
			})

		if (service.PipeLoaded) {
			Logger.Info(`${Logger.Out} Pipe already loaded for '${serviceName}'`)
			return
		}

		Logger.Info(`${Logger.In} Loading pipe for '${serviceName}'`)
		await service.Lock?.Acquire()
		await container
			.exec({
				Cmd: ["python", "app.py", "--load-pipe"],
				AttachStdout: true,
				AttachStderr: true,
			})
			.then((exec) => exec.start({}))
			.then(() => {
				service.PipeLoaded = true
				Logger.Info(`${Logger.Out} Pipe loaded for '${serviceName}'`)
			})
			.catch((error) => {
				Logger.Error(`${Logger.Out} Failed to load pipe for '${serviceName}': ${error}`)
			})
		service.Lock?.Release()
	}

	@Logger.LogFunction()
	static async StartCaddy() {
		let caddyContainer: Docker.ContainerInfo | undefined
		try {
			const containers = await AiDocker.docker.listContainers({
				all: true,
				filters: { name: [CaddyDockerService.Name] },
			})
			if (containers.length > 0) {
				const firstContainer = containers[0]
				if (firstContainer) {
					caddyContainer = firstContainer
					if (caddyContainer.State === "running") {
						Logger.Info(`${Logger.Out} Caddy container already running`)
						return
					}
					await AiDocker.docker.getContainer(caddyContainer.Id).start()
					Logger.Info(`${Logger.Out} Caddy container started`)
					return
				}
			}
			Logger.Info(`${Logger.In} Starting Caddy container`)
			Logger.Info(`${Logger.In} '${CaddyDockerService.ImageName}' pull started`)

			await AiDocker.PullImage(CaddyDockerService.ImageName).catch(Logger.Error)

			await AiDocker.docker.createContainer({
				Image: CaddyDockerService.ImageName,
				name: CaddyDockerService.Name,
				Hostname: CaddyDockerService.Name,
				Env: [`CADDY_INGRESS_NETWORKS=${DOCKER.AI_NETWORK}`, `CADDY_DOCKER_SCAN_INTERVAL=5s`],
				ExposedPorts: {
					[`${CaddyDockerService.Port}/tcp`]: {},
					[`${CaddyDockerService.Options?.DashboardPort}/tcp`]: {},
				},
				HostConfig: {
					NetworkMode: DOCKER.AI_NETWORK,
					PortBindings: {
						[`${CaddyDockerService.Port}/tcp`]: [{ HostPort: (CaddyDockerService.Port as number).toString() }], //,
						// [`${CaddyDockerService.Options?.DashboardPort}/tcp`]: [{ HostPort: (CaddyDockerService.Options?.DashboardPort as number).toString() }]
					},
					Binds: CaddyDockerService.DockerVolume,
				},
				NetworkingConfig: {
					EndpointsConfig: { [DOCKER.AI_NETWORK]: {} },
				},
			})

			const containersList = await AiDocker.docker.listContainers({
				all: true,
				filters: { name: [CaddyDockerService.Name] },
			})
			caddyContainer = containersList[0]

			if (!caddyContainer) {
				throw new HttpErrorInternalServerError("Caddy container not found after creation")
			}

			const { Id } = caddyContainer
			Assert.Var<string>(Id, "Caddy container not found")

			await AiDocker.docker.getContainer(Id).start().catch(Logger.Error)
		} catch (error) {
			Logger.Error(error)
		}
	}

	@Logger.LogFunction()
	static async ListActiveContainers(service: TAiDockerService): Promise<Docker.ContainerInfo[]> {
		return AiDocker.docker
			.listContainers({
				filters: {
					label: [`service=${service.InstanceName ?? service.Name}`],
				},
			})
			.catch(() => {
				Logger.Error(`${Logger.Out} Failed to list containers for '${service.InstanceName ?? service.Name}'`)
				return []
			})
	}

	@Logger.LogFunction()
	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: autoScale monitors and adjusts the active docker instance counts based on average CPU usage
	static async AutoScale() {
		const _cpuScaleUp = AiDocker.Config["cpu-scale-up"]
		const _cpuScaleDown = AiDocker.Config["cpu-scale-down"]
		const _scaleInterval = AiDocker.Config["scale-interval"]
		const _scaleDownGracePeriod = AiDocker.Config["scale-down-grace-period"]
		const _minInstances = AiDocker.Config["min-instance"]
		const _maxInstances = AiDocker.Config["max-instance"]

		Assert.Var<number>(_cpuScaleUp, "server.ai-engines.cpu-scale-up is not defined")
		Assert.Var<number>(_cpuScaleDown, "server.ai-engines.cpu-scale-down is not defined")
		Assert.Var<number>(_scaleInterval, "server.ai-engines.scale-interval is not defined")
		Assert.Var<number>(_scaleDownGracePeriod, "server.ai-engines.scale-down-grace-period is not defined")
		Assert.Var<number>(_minInstances, "server.ai-engines.min-instance is not defined")
		Assert.Var<number>(_maxInstances, "server.ai-engines.max-instance is not defined")

		for (const service of AiDocker.Instances.values()) {
			const containers = await AiDocker.ListActiveContainers(service)

			if (containers.length === 0) continue

			const avgCpu = await AiDocker.GetAverageCpuUsage(service)

			Logger.Info(
				`${Logger.In} AutoScale: '${service.InstanceName ?? service.Name}', Containers: ${containers.length}, Avg CPU: ${avgCpu.toFixed(0)}%`,
			)

			if (avgCpu > _cpuScaleUp && containers.length < _maxInstances) {
				await AiDocker.ScaleUp(service)
				service.IdleSince = undefined
			} else if (avgCpu < _cpuScaleDown && containers.length > _minInstances) {
				if (!service.IdleSince) {
					service.IdleSince = Date.now()
					Logger.Info(`${Logger.Out} AutoScale: '${service.InstanceName ?? service.Name}' is idle. Grace period started.`)
				} else if (Date.now() - service.IdleSince > _scaleDownGracePeriod) {
					await AiDocker.ScaleDown(service)
					service.IdleSince = undefined
				} else {
					const remaining = Math.ceil((_scaleDownGracePeriod - (Date.now() - service.IdleSince)) / 1000)
					Logger.Info(
						`${Logger.Out} AutoScale: '${service.InstanceName ?? service.Name}' is idle. Scaling down in ${remaining}s`,
					)
				}
			} else {
				service.IdleSince = undefined
				Logger.Info(`${Logger.Out} AutoScale: No scaling needed for '${service.InstanceName ?? service.Name}'`)
			}
		}
	}

	@Logger.LogFunction()
	static async ScaleUp(service: TAiDockerService) {
		const _maxInstances = AiDocker.Config["max-instance"]

		Assert.Var<number>(_maxInstances, "server.ai-engines.max-instance is not defined")

		const containers = await AiDocker.ListActiveContainers(service)
		const nbrContainers = containers?.length ?? Number.MAX_SAFE_INTEGER
		if (nbrContainers >= _maxInstances) {
			Logger.Info(`Max '${service.InstanceName ?? service.Name}' containers reached: ${_maxInstances}`)
			return
		}

		Logger.Info(`Scaling up '${service.InstanceName ?? service.Name}' service...`)
		await AiDocker.CreateServiceContainer(service)
	}

	@Logger.LogFunction()
	static async ScaleDown(service: TAiDockerService) {
		const _minInstances = AiDocker.Config["min-instance"]

		Assert.Var<number>(_minInstances, "server.ai-engines.min-instance is not defined")

		const containers = await AiDocker.ListActiveContainers(service)
		if (containers.length <= _minInstances) {
			Logger.Info(`Min '${service.InstanceName ?? service.Name}' containers reached: ${_minInstances}`)
			return
		}

		Logger.Info(`Scaling down '${service.InstanceName ?? service.Name}' service...`)

		// Remove oldest scaled container
		const toRemove = containers[0]

		Assert.Var<Docker.ContainerInfo>(toRemove, "Unable to scale down: undefined container info")

		const container = AiDocker.docker.getContainer(toRemove.Id)
		await container.stop()
		await container.remove()
		Logger.Info(`Removed '${service.InstanceName ?? service.Name}' container: ${toRemove.Names[0]}`)
	}

	@Logger.LogFunction()
	static async GetAverageCpuUsage(service: TAiDockerService): Promise<number> {
		try {
			const containers = await AiDocker.ListActiveContainers(service)
			if (containers.length === 0) return 0

			// Process all containers in parallel
			const cpuUsages = await Promise.all(
				// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: maps containers to measure CPU usage over multiple snapshot intervals
				containers.map(async (containerInfo) => {
					try {
						const container = AiDocker.docker.getContainer(containerInfo.Id)

						// Take 5 snapshots over 5 seconds
						const snapshots = []
						for (let i = 0; i < 5; i++) {
							snapshots.push(await container.stats({ stream: false }))
							if (i < 4) await new Promise((r) => setTimeout(r, 1250)) // 5 seconds / 4 intervals
						}

						// Calculate CPU percentage for each interval
						const percentages = []
						for (let i = 1; i < snapshots.length; i++) {
							const current = snapshots[i] as Docker.ContainerStats
							const previous = snapshots[i - 1] as Docker.ContainerStats

							const cpuDelta = current.cpu_stats.cpu_usage.total_usage - previous.cpu_stats.cpu_usage.total_usage

							const systemDelta = current.cpu_stats.system_cpu_usage - previous.cpu_stats.system_cpu_usage

							if (systemDelta > 0 && cpuDelta > 0) {
								const cpuCores =
									snapshots[i]?.cpu_stats.online_cpus || (snapshots[i]?.cpu_stats.cpu_usage.percpu_usage?.length ?? 1)

								const cpuPercent = (cpuDelta / systemDelta) * cpuCores * 100
								percentages.push(cpuPercent)
							}
						}

						// Return average of the 4 intervals
						if (percentages.length === 0) return 0

						return percentages.reduce((sum, p) => sum + p, 0) / percentages.length
					} catch (error) {
						Logger.Warn(
							`Failed to get CPU stats for container '${service.Name}/${containerInfo.Names[0]}' returning 0: ${
								error instanceof Error ? error?.message : String(error)
							}`,
						)
						return 0 //NaN
					}
				}),
			)

			// Calculate average of valid CPU percentages across all containers
			const validUsages = cpuUsages.filter((usage) => !Number.isNaN(usage))
			if (validUsages.length === 0) return 0

			const totalCpuUsage = validUsages.reduce((sum, usage) => sum + usage, 0)
			return totalCpuUsage / validUsages.length
		} catch (error) {
			Logger.Error(
				`Error getting average CPU usage for service ${service.Name}: ${
					error instanceof Error ? error.message : String(error)
				}`,
			)
			return 0
		}
	}

	@Logger.LogFunction()
	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: waitForService executes curl checks inside docker containers to wait for service availability
	static async WaitForService(service: TAiDockerService, interval = 3000): Promise<void> {
		if (!service.InternalUrl) {
			return
		}

		const internalUrl = StringUtils.Url(`http://127.0.0.1:${service.Port}`, service.InternalUrl, "/health")

		const containers = await AiDocker.ListActiveContainers(service)
		if (containers.length === 0) {
			return
		}

		for (const container of containers) {
			const containerId = container.Id

			while (true) {
				try {
					// Get container instance
					const container = AiDocker.docker.getContainer(containerId)

					// First, let's try a simpler approach - just test if curl can reach the URL
					const execOptions: Docker.ExecCreateOptions = {
						Cmd: ["sh", "-c", `curl -s -w '%{http_code}' -o /dev/null ${internalUrl} || echo "CURL_FAILED"`],
						AttachStdout: true,
						AttachStderr: true,
					}

					const execInstance = await container.exec(execOptions)

					// Try using inspect to get the result after execution
					const streamPromise = execInstance.start({
						hijack: false,
						stdin: false,
					})
					const stream = await streamPromise

					let output = ""

					// Wait for completion
					await new Promise((resolve, reject) => {
						const onData = (chunk: Buffer) => {
							output += chunk.toString()
						}

						const cleanup = () => {
							stream.removeListener("data", onData)
							stream.removeListener("end", onEnd)
							stream.removeListener("error", onError)
						}

						const onEnd = () => {
							cleanup()
							resolve(undefined)
						}

						const onError = (err: unknown) => {
							cleanup()
							reject(err)
						}

						stream.on("data", onData)
						stream.on("end", onEnd)
						stream.on("error", onError)
					})

					// Clean up the output - remove Docker stream headers if present
					let cleanOutput = output
					if (output.includes("200") || output.includes("404") || output.includes("500")) {
						// Extract just the HTTP status code
						const statusMatch = output.match(/[2-5]\d{2}/)
						if (statusMatch) {
							cleanOutput = statusMatch[0]
						}
					}

					if (cleanOutput.includes("CURL_FAILED")) {
						Logger.Warn(`curl command failed in container ${containerId}`)
						await new Promise((resolve) => setTimeout(resolve, interval)) // wait before retry
						continue
					}

					const statusCode = Number.parseInt(cleanOutput.trim(), 10)

					if (statusCode === 200) {
						Logger.Info(`Success: ${internalUrl} is available in container ${containerId}`)
						break
					} else if (statusCode >= 100 && statusCode < 500) {
						Logger.Info(`Waiting... Status: ${statusCode}`)
					} else {
						Logger.Info(`Invalid status code received: ${statusCode}, raw: '${cleanOutput}'`)
					}
				} catch (error) {
					Logger.Error(
						`Error testing service in container ${containerId}: ${error instanceof Error ? error.message : String(error)}`,
					)
				}
				await new Promise((resolve) => setTimeout(resolve, interval)) // wait before retry
			}
		}
	}
}
