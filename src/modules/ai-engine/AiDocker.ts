/* eslint-disable no-async-promise-executor */
//
//
//
import type { DockerOptions } from 'dockerode'
import Docker from 'dockerode'
import fs from "node:fs"

//
import { Assert } from '../../utils/Assert'
import { JsonUtils } from '../../utils/JsonUtils'
import { Logger } from '../../utils/Logger'
import { Mutex } from '../../utils/Mutex'
import { StringUtils } from '../../utils/StringUtils'
import { ConfigManager } from '../core/ConfigManager'
import { HttpErrorInternalServerError } from '../errors/HttpErrors'
import { DOCKER } from './consts/DOCKER'
import { CaddyDockerService } from './docker-services/CaddyDockerService'
import type { TAiDockerService } from './types/TAiDockerService'


//
export class AiDocker {

    static docker: Docker = new Docker();
    static AutoScaleWorker: NodeJS.Timeout
    static Instances: Map<string, TAiDockerService> = new Map()

    static ServiceInstance = {
        Timeout: 60_000, // 60 seconds
        Sleep: 5_000, // 5 seconds
        MinInstances: 1,
        MaxInstances: 5,
        CpuScaleUp: 50,
        CpuScaleDown: 5,
        ScaleInterval: 15_000, // 15 seconds
        ScaleDownGracePeriod: 3_600_000 // 1 hour
    }

    static _convertStreamToLog(streamString: string): string[] {
        if (!streamString) return []

        const _streamString = streamString
            .split('\r\n')
            .map((item: string) => item.replaceAll(/(\\r|\\n)/g, ''))
            .map(item => {
                try {
                    const parsed = JsonUtils.TryParse(item, { stream: '' }, true)
                    return parsed && typeof parsed.stream === 'string'
                        ? parsed.stream
                        : ''
                } catch {
                    return ''
                }
            })
            .filter(item => item && typeof item === 'string' && item.trim().length > 0)

        return _streamString
    }

    @Logger.LogFunction()
    static async Init() {

        const _dockerOptions = ConfigManager.Get<DockerOptions>("server.ai-engines.params")
        AiDocker.ServiceInstance.Timeout = ConfigManager.Get<number>("server.ai-engines.timeout")
        AiDocker.ServiceInstance.MinInstances = ConfigManager.Get<number>("server.ai-engines.min-instance")
        AiDocker.ServiceInstance.MaxInstances = ConfigManager.Get<number>("server.ai-engines.max-instance")
        AiDocker.ServiceInstance.CpuScaleUp = ConfigManager.Get<number>("server.ai-engines.cpu-scale-up")
        AiDocker.ServiceInstance.CpuScaleDown = ConfigManager.Get<number>("server.ai-engines.cpu-scale-down")
        AiDocker.ServiceInstance.ScaleInterval = ConfigManager.Get<number>("server.ai-engines.scale-interval")
        AiDocker.ServiceInstance.ScaleDownGracePeriod = ConfigManager.Get<number>("server.ai-engines.scale-down-grace-period") ?? 60_000

        if (typeof _dockerOptions?.ca == "string")
            _dockerOptions.ca = fs.readFileSync(_dockerOptions.ca)

        if (typeof _dockerOptions?.cert == "string")
            _dockerOptions.cert = fs.readFileSync(_dockerOptions.cert)

        if (typeof _dockerOptions?.key == "string")
            _dockerOptions.key = fs.readFileSync(_dockerOptions.key)

        try {
            AiDocker.docker = new Docker(_dockerOptions)
            Logger.Info(`${Logger.Out} Docker client initialized`)

            await AiDocker.docker.ping()
            Logger.Info(`${Logger.Out} Docker daemon is reachable`)

            await AiDocker.CleanStack()
            //XXX await AiDocker.BuildServiceImage(BaseTextDockerService)

            Logger.Info(`${Logger.In} Starting AI Engine stack manager`)
            await AiDocker.CreateNetwork().catch(Logger.Error)
            await AiDocker.StartCaddy().catch(Logger.Error)

            AiDocker.StartScaler()
            Logger.Info(`${Logger.Out} AI Engine stack manager started`)
        } catch (error) {
            throw new HttpErrorInternalServerError(`AiDocker.Init: ${(error as Error).message}`)
        }
    }

    @Logger.LogFunction()
    static async StartService(service: TAiDockerService) {
        service.Lock = new Mutex()
        const serviceName = service.InstanceName ?? service.Name
        AiDocker.Instances.set(serviceName, service)
        await AiDocker.BuildServiceImage(service).catch(Logger.Error)
        const containers = await AiDocker.ListActiveContainers(service)
        for (let i = containers.length; i < AiDocker.ServiceInstance.MinInstances; i++) {
            await AiDocker.ScaleUp(service)
            // await AiDocker.WaitForService(service)
        }
    }

    @Logger.LogFunction()
    static StartScaler() {
        // Clear any existing interval first to prevent duplicates
        if (AiDocker.AutoScaleWorker) {
            clearInterval(AiDocker.AutoScaleWorker)
        }
        AiDocker.AutoScaleWorker = setInterval(AiDocker.AutoScale, AiDocker.ServiceInstance.ScaleInterval)
    }

    @Logger.LogFunction()
    static StopScaler() {
        if (AiDocker.AutoScaleWorker) {
            clearInterval(AiDocker.AutoScaleWorker)
            AiDocker.AutoScaleWorker = undefined as any
            Logger.Info('AutoScaler stopped')
        }
    }

    @Logger.LogFunction()
    static async CleanStack() {
        Logger.Info(`${Logger.In} Cleaning ${DOCKER.AI_ENGINE_PREFIX} stack...`)
        const containers = await AiDocker.docker.listContainers({
            all: true,
            filters: {
                name: [`${DOCKER.AI_ENGINE_PREFIX}_*`]
            }
        })

        const promisesContainers = containers.map(container => new Promise<void>(async (resolve, reject) => {
            try {
                Logger.Info(`${Logger.In} Stopping container '${container.Names[0]}'...`)
                const c = AiDocker.docker.getContainer(container.Id)
                if (container.State === "running") {
                    await c.stop().catch(Logger.Error)
                }
                await c.remove().catch(Logger.Error)
                Logger.Info(`${Logger.Out} Stopped container '${container.Names[0]}'`)
                resolve()
            } catch (e: unknown) {
                Logger.Error((e as Error).message)
                reject(e)
            }
        }))

        await Promise.allSettled(promisesContainers)

        const networks = await AiDocker.docker.listNetworks({
            filters: {
                name: [DOCKER.AI_NETWORK]
            }
        })

        const promisesNetworks = networks.map(network => new Promise<void>(async (resolve, reject) => {
            try {
                Logger.Info(`${Logger.In} Removing docker network '${network.Name}'...`)
                const n = AiDocker.docker.getNetwork(network.Id)
                await n.remove()
                Logger.Info(`${Logger.Out} Removed docker network '${network.Name}'`)
                resolve()
            } catch (e: unknown) {
                Logger.Error((e as Error).message)
                reject(e)
            }
        }))

        await Promise.allSettled(promisesNetworks)

        Logger.Info(`${Logger.Out} '${DOCKER.AI_ENGINE_PREFIX}' stack cleaned`)
    }

    @Logger.LogFunction()
    static async CreateNetwork() {
        try {
            await AiDocker.docker.createNetwork({ Name: DOCKER.AI_NETWORK })
            Logger.Info(`Docker network created: ${DOCKER.AI_NETWORK}`)
        } catch (e: any) {
            if (e.statusCode === 409) {
                Logger.Info(`Docker network already exists: ${DOCKER.AI_NETWORK}`)
            } else {
                throw e
            }
        }
    }

    @Logger.LogFunction()
    static async PullImage(image: string) {
        return new Promise<void>((resolve, reject) => {
            AiDocker.docker.pull(image, (err: any, stream: any) => {
                if (err) {
                    Logger.Error(`Error pulling image ${image}: ${err.message}`)
                    return reject(err)
                }

                AiDocker.docker.modem.followProgress(stream,
                    (err: any, _output: unknown) => {
                        if (err) {
                            Logger.Error(`Error in pull progress for ${image}: ${err.message}`)
                            return reject(err)
                        }
                        Logger.Debug(`${Logger.Out} AiDocker.PullImage: 📦 Pulling ${image}...`)
                        resolve()
                    },
                    (event: any) => {
                        if (event.status === 'Downloading') {
                            Logger.Debug(`${Logger.Out} AiDocker.PullImage: 📦 Pulling ${image}... ${event.progress}`)
                        } else {
                            Logger.Debug(`${Logger.Out} AiDocker.PullImage: 📦 Pulling ${image}... ${event.status}`)
                        }
                    }
                )
            })
        })
    }

    @Logger.LogFunction()
    static async BuildServiceImage(service: TAiDockerService): Promise<void> {
        return new Promise(async (resolve, reject) => {
            try {
                const existingImages = await AiDocker.docker.listImages({ filters: { reference: [service.ImageName] } })
                if (existingImages.length > 0) {
                    Logger.Info(`${Logger.Out} 📦 Image ${service.ImageName} already exists. Skipping build.`)
                    return resolve()
                }

                const stream = await AiDocker.docker.buildImage(
                    service.ImageContext as Docker.ImageBuildContext,
                    {
                        t: service.ImageName
                    }
                ) as NodeJS.ReadableStream

                let _streamData: string = ""

                const onData = (data: Buffer) => {
                    const __data = data.toString()
                    _streamData += __data

                    const parts = _streamData.split('}')

                    // Last part may be incomplete, keep it in buffer
                    _streamData = parts.pop() || ''

                    for (const part of parts) {
                        const complete = `${part}}`
                        try {
                            const ___aLog = AiDocker._convertStreamToLog(complete)
                            ___aLog.forEach((item) => Logger.Debug(`${Logger.Out} 🔨 Building '${service.ImageName}' image... ${item}`))
                        } catch {
                            Logger.Warn(`${Logger.Out} ⚠️ Failed to parse log part: ${complete}`)
                        }
                    }
                }

                const cleanup = () => {
                    stream.removeListener('data', onData)
                    stream.removeListener('end', onEnd)
                    stream.removeListener('error', onError)
                }

                const onEnd = () => {
                    cleanup()
                    if (_streamData.length > 0) {
                        const ___aLog = AiDocker._convertStreamToLog(_streamData)
                        ___aLog.forEach((item) => Logger.Debug(`${Logger.Out} 🔨 Building '${service.ImageName}' image: ${item}`))
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

                stream.on('data', onData)
                stream.on('end', onEnd)
                stream.on('error', onError)

            } catch (err) {
                Logger.Error(`${Logger.Out} 🔨 ❌ Failed to build '${service.ImageName}' image: ${err}`)
                reject(err)
            }
        })
    }

    @Logger.LogFunction()
    private static async CreateServiceContainer(service: TAiDockerService) {
        const serviceName = service.InstanceName ?? service.Name
        const containerName = `${DOCKER.AI_ENGINE_PREFIX}_${serviceName}_${Date.now()}`
        const serviceIndex = Array.from(AiDocker.Instances.keys()).indexOf(serviceName)

        const container = await AiDocker.docker.createContainer({
            Image: service.ImageName,
            name: containerName,
            Hostname: containerName,
            NetworkingConfig: {
                EndpointsConfig: { [DOCKER.AI_NETWORK]: {} }
            },
            Env: [
                'MAX_HISTORY=3',
                `MAX_LOAD=${AiDocker.ServiceInstance.CpuScaleUp}`
            ],
            Labels: {
                service: serviceName,
                scaled: 'true',

                'caddy_ingress_network': DOCKER.AI_NETWORK,

                // Caddy site
                'caddy': ':5000',

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
                NetworkMode: DOCKER.AI_NETWORK,
                RestartPolicy: { Name: 'unless-stopped' },
                Binds: service.DockerVolume,
                NanoCpus: 1000000000
            }
        })

        await container.start()
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
        {
            await container.exec({
                Cmd: ['python', 'app.py', '--load-pipe'],
                AttachStdout: true,
                AttachStderr: true
            }).then(exec => exec.start({}))
                .then(() => {
                    service.PipeLoaded = true
                    Logger.Info(`${Logger.Out} Pipe loaded for '${serviceName}'`)
                })
                .catch((error) => {
                    Logger.Error(`${Logger.Out} Failed to load pipe for '${serviceName}': ${error}`)
                })
        }
        service.Lock?.Release()
    }

    @Logger.LogFunction()
    static async StartCaddy() {
        try {
            const containers = await AiDocker.docker.listContainers({
                all: true,
                filters: { name: [CaddyDockerService.Name] }
            })
            if (containers.length > 0) {
                Logger.Info(`${Logger.Out} Caddy container already running`)
                return
            }
            Logger.Info(`${Logger.In} Starting Caddy container`)
            Logger.Info(`${Logger.In} '${CaddyDockerService.ImageName}' pull started`)

            await AiDocker.PullImage(CaddyDockerService.ImageName).catch(Logger.Error)

            const container = await AiDocker.docker.createContainer({
                Image: CaddyDockerService.ImageName,
                name: CaddyDockerService.Name,
                Hostname: CaddyDockerService.Name,
                Env: [
                    `CADDY_INGRESS_NETWORKS=${DOCKER.AI_NETWORK}`,
                    `CADDY_DOCKER_SCAN_INTERVAL=5s`
                ],
                ExposedPorts: {
                    [`${CaddyDockerService.Port}/tcp`]: {},
                    [`${CaddyDockerService.Options?.DashboardPort}/tcp`]: {}
                },
                HostConfig: {
                    NetworkMode: DOCKER.AI_NETWORK,
                    PortBindings: {
                        [`${CaddyDockerService.Port}/tcp`]: [{ HostPort: (CaddyDockerService.Port as number).toString() }],
                        [`${CaddyDockerService.Options?.DashboardPort}/tcp`]: [{ HostPort: (CaddyDockerService.Options?.DashboardPort as number).toString() }]
                    },
                    Binds: CaddyDockerService.DockerVolume
                },
                NetworkingConfig: {
                    EndpointsConfig: { [DOCKER.AI_NETWORK]: {} }
                }
            })
            await container.start().catch(Logger.Error)
        } catch (error) {
            Logger.Error(error)
        }
    }

    @Logger.LogFunction()
    static async ListActiveContainers(service: TAiDockerService) {
        return AiDocker.docker.listContainers({
            filters: {
                label: [`service=${service.InstanceName ?? service.Name}`]
            }
        })
    }

    @Logger.LogFunction()
    static async AutoScale() {
        for (const service of AiDocker.Instances.values()) {

            const containers = await AiDocker.ListActiveContainers(service)

            if (containers.length === 0)
                continue

            const avgCpu = await AiDocker.GetAverageCpuUsage(service)

            Logger.Info(`${Logger.In} AutoScale: '${service.InstanceName ?? service.Name}', Containers: ${containers.length}, Avg CPU: ${avgCpu.toFixed(0)}%`)

            if (avgCpu > AiDocker.ServiceInstance.CpuScaleUp && containers.length < AiDocker.ServiceInstance.MaxInstances) {
                await AiDocker.ScaleUp(service)
                service.IdleSince = undefined
            } else if (avgCpu < AiDocker.ServiceInstance.CpuScaleDown && containers.length > AiDocker.ServiceInstance.MinInstances) {
                if (!service.IdleSince) {
                    service.IdleSince = Date.now()
                    Logger.Info(`${Logger.Out} AutoScale: '${service.InstanceName ?? service.Name}' is idle. Grace period started.`)
                } else if (Date.now() - service.IdleSince > AiDocker.ServiceInstance.ScaleDownGracePeriod) {
                    await AiDocker.ScaleDown(service)
                    service.IdleSince = undefined
                } else {
                    const remaining = Math.ceil((AiDocker.ServiceInstance.ScaleDownGracePeriod - (Date.now() - service.IdleSince)) / 1000)
                    Logger.Info(`${Logger.Out} AutoScale: '${service.InstanceName ?? service.Name}' is idle. Scaling down in ${remaining}s`)
                }
            } else {
                service.IdleSince = undefined
                Logger.Info(`${Logger.Out} AutoScale: No scaling needed for '${service.InstanceName ?? service.Name}'`)
            }
        }
    }

    @Logger.LogFunction()
    static async ScaleUp(service: TAiDockerService) {
        const containers = await AiDocker.ListActiveContainers(service)
        const nbrContainers = (containers?.length ?? Number.MAX_SAFE_INTEGER)
        if (nbrContainers >= AiDocker.ServiceInstance.MaxInstances) {
            Logger.Info(`Max '${service.InstanceName ?? service.Name}' containers reached: ${AiDocker.ServiceInstance.MaxInstances}`)
            return
        }

        Logger.Info(`Scaling up '${service.InstanceName ?? service.Name}' service...`)
        await AiDocker.CreateServiceContainer(service)
    }

    @Logger.LogFunction()
    static async ScaleDown(service: TAiDockerService) {
        const containers = await AiDocker.ListActiveContainers(service)
        if (containers.length <= AiDocker.ServiceInstance.MinInstances) {
            Logger.Info(`Min '${service.InstanceName ?? service.Name}' containers reached: ${AiDocker.ServiceInstance.MinInstances}`)
            return
        }

        Logger.Info(`Scaling down '${service.InstanceName ?? service.Name}' service...`)

        // Remove oldest scaled container
        const toRemove = containers[0]

        Assert.Var<Docker.ContainerInfo>(toRemove, 'toRemove is required')

        const container = AiDocker.docker.getContainer(toRemove.Id)
        await container.stop()
        await container.remove()
        Logger.Info(`Removed '${service.InstanceName ?? service.Name}' container: ${toRemove.Names[0]}`)
    }

    @Logger.LogFunction()
    static async GetAverageCpuUsage(service: TAiDockerService): Promise<number> {
        try {
            const containers = await AiDocker.ListActiveContainers(service)
            if (containers.length === 0)
                return 0

            // Process all containers in parallel
            const cpuUsages = await Promise.all(
                containers.map(async (containerInfo) => {
                    try {
                        const container = AiDocker.docker.getContainer(containerInfo.Id)

                        // Take 5 snapshots over 5 seconds
                        const snapshots = []
                        for (let i = 0; i < 5; i++) {
                            snapshots.push(await container.stats({ stream: false }))
                            if (i < 4) await new Promise(r => setTimeout(r, 1250)) // 5 seconds / 4 intervals
                        }

                        // Calculate CPU percentage for each interval
                        const percentages = []
                        for (let i = 1; i < snapshots.length; i++) {
                            const cpuDelta =
                                snapshots[i]!.cpu_stats.cpu_usage.total_usage -
                                snapshots[i - 1]!.cpu_stats.cpu_usage.total_usage

                            const systemDelta =
                                snapshots[i]!.cpu_stats.system_cpu_usage -
                                snapshots[i - 1]!.cpu_stats.system_cpu_usage

                            if (systemDelta > 0 && cpuDelta > 0) {
                                const cpuCores = snapshots[i]!.cpu_stats.online_cpus ||
                                    (snapshots[i]!.cpu_stats.cpu_usage.percpu_usage?.length ?? 1)

                                const cpuPercent = (cpuDelta / systemDelta) * cpuCores * 100
                                percentages.push(cpuPercent)
                            }
                        }

                        // Return average of the 4 intervals
                        if (percentages.length === 0)
                            return 0

                        return percentages.reduce((sum, p) => sum + p, 0) / percentages.length

                    } catch (error) {
                        Logger.Warn(`Error getting CPU stats for container '${service.Name}/${containerInfo.Names[0]}' returning 0: ${error instanceof Error
                            ? error.message
                            : String(error)}`)
                        return 0 //NaN
                    }
                })
            )

            // Calculate average of valid CPU percentages across all containers
            const validUsages = cpuUsages.filter(usage => !isNaN(usage))
            if (validUsages.length === 0)
                return 0

            const totalCpuUsage = validUsages.reduce((sum, usage) => sum + usage, 0)
            return totalCpuUsage / validUsages.length
        } catch (error) {
            Logger.Error(`Error getting average CPU usage for service ${service.Name}: ${error instanceof Error
                ? error.message
                : String(error)}`)
            return 0
        }
    }

    @Logger.LogFunction()
    static async WaitForService(service: TAiDockerService, interval = 3000): Promise<void> {
        if (!service.InternalUrl) {
            return
        }

        const internalUrl = StringUtils.Url(
            `http://127.0.0.1:${service.Port}`,
            service.InternalUrl,
            '/health'
        )

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
                        Cmd: ['sh', '-c', `curl -s -w '%{http_code}' -o /dev/null ${internalUrl} || echo "CURL_FAILED"`],
                        AttachStdout: true,
                        AttachStderr: true
                    }

                    const execInstance = await container.exec(execOptions)

                    // Try using inspect to get the result after execution
                    const streamPromise = execInstance.start({
                        hijack: false,
                        stdin: false
                    })
                    const stream = await streamPromise

                    let output = ''

                    // Wait for completion
                    await new Promise((resolve, reject) => {
                        const onData = (chunk: Buffer) => {
                            output += chunk.toString()
                        }

                        const cleanup = () => {
                            stream.removeListener('data', onData)
                            stream.removeListener('end', onEnd)
                            stream.removeListener('error', onError)
                        }

                        const onEnd = () => {
                            cleanup()
                            resolve(undefined)
                        }

                        const onError = (err: any) => {
                            cleanup()
                            reject(err)
                        }

                        stream.on('data', onData)
                        stream.on('end', onEnd)
                        stream.on('error', onError)
                    })

                    // Clean up the output - remove Docker stream headers if present
                    let cleanOutput = output
                    if (output.includes('200') || output.includes('404') || output.includes('500')) {
                        // Extract just the HTTP status code
                        const statusMatch = output.match(/[2-5]\d{2}/)
                        if (statusMatch) {
                            cleanOutput = statusMatch[0]
                        }
                    }

                    if (cleanOutput.includes('CURL_FAILED')) {
                        Logger.Warn(`curl command failed in container ${containerId}`)
                        await new Promise(resolve => setTimeout(resolve, interval)) // wait before retry
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
                    Logger.Error(`Error testing service in container ${containerId}: ${error instanceof Error
                        ? error.message
                        : String(error)}`)
                }
                await new Promise(resolve => setTimeout(resolve, interval)) // wait before retry
            }
        }
    }
}