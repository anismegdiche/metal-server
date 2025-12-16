/* eslint-disable no-async-promise-executor */
//
//
//
import Docker, { DockerOptions } from 'dockerode'
import fs from "fs";

//
import { JsonUtils } from '../../utils/JsonUtils'
import { Logger } from '../../utils/Logger'
import { StringUtils } from '../../utils/StringUtils'
import { DOCKER } from './consts/DOCKER'
import { TraefikDockerService } from './docker-services/TraefikDockerService'
import { TAiDockerService } from './types/TAiDockerService'
import { ConfigManager } from '../core/ConfigManager'
import { HttpErrorInternalServerError } from '../errors/HttpErrors';
import { BaseDockerService } from './docker-services/BaseDockerService';


//
export class AiDocker {

    static docker: Docker = new Docker();
    static AutoScaleWorker: NodeJS.Timeout
    static Instances: Map<string, TAiDockerService> = new Map()

    static ServiceInstance = {
        MinInstances: 1,
        MaxInstances: 5,
        CpuScaleUp: 70,
        CpuScaleDown: 30,
        ScaleInterval: 15_000, // 15 seconds
        Timeout: 60_000, // 60 seconds
        Sleep: 5_000 // 5 seconds
    }

    static _convertStreamToLog(streamString: string): string[] {
        if (!streamString) return []

        const _streamString = streamString
            .split('\r\n')
            .map((item: string) => item.replace(/(\\r|\\n)/g, ''))
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

        if (_dockerOptions?.ca instanceof String)
            _dockerOptions.ca = fs.readFileSync(_dockerOptions.ca as string)

        if (_dockerOptions?.cert instanceof String)
            _dockerOptions.cert = fs.readFileSync(_dockerOptions.cert as string)

        if (_dockerOptions?.key instanceof String)
            _dockerOptions.key = fs.readFileSync(_dockerOptions.key as string)

        try {
            AiDocker.docker = new Docker(_dockerOptions)
            Logger.Info(`${Logger.Out} Docker client initialized`)

            await AiDocker.docker.ping()
            Logger.Info(`${Logger.Out} Docker daemon is reachable`)

            await AiDocker.CleanStack()
            await AiDocker.BuildServiceImage(BaseDockerService)

            Logger.Info(`${Logger.In} Starting AI Engine stack manager`)
            await AiDocker.CreateNetwork().catch(Logger.Error)
            await AiDocker.StartTraefik().catch(Logger.Error)

            AiDocker.StartScaler()
            Logger.Info(`${Logger.Out} AI Engine stack manager started`)
        } catch (error) {
            throw new HttpErrorInternalServerError(`AiDocker.Init: ${(error as Error).message}`)
        }
    }

    @Logger.LogFunction()
    static async StartService(service: TAiDockerService) {
        AiDocker.Instances.set(service.InstanceName ?? service.Name, service)
        await AiDocker.BuildServiceImage(service).catch(Logger.Error)
        const containers = await AiDocker.ListActiveContainers(service)
        for (let i = containers.length; i < AiDocker.ServiceInstance.MinInstances; i++) {
            await AiDocker.ScaleUp(service)
            // await AiDocker.WaitForService(service)
        }
    }

    @Logger.LogFunction()
    static StartScaler() {
        AiDocker.AutoScaleWorker = setInterval(AiDocker.AutoScale, AiDocker.ServiceInstance.ScaleInterval)
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
                        Logger.Debug(`${Logger.Out} 📦 Pulling ${image}...`)
                        resolve()
                    },
                    (event: any) => {
                        if (event.status === 'Downloading') {
                            Logger.Debug(`${Logger.Out} 📦 Pulling ${image}... ${event.progress}`)
                        } else {
                            Logger.Debug(`${Logger.Out} 📦 Pulling ${image}... ${event.status}`)
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
                const existingImages = await AiDocker.docker.listImages({ filters: { reference: [service.ImageName] } });
                if (existingImages.length > 0) {
                    Logger.Info(`${Logger.Out} 📦 Image ${service.ImageName} already exists. Skipping build.`);
                    return resolve();
                }

                const stream = await AiDocker.docker.buildImage(
                    service.ImageContext as Docker.ImageBuildContext,
                    {
                        t: service.ImageName
                    }
                ) as NodeJS.ReadableStream

                let _streamData: string = ""

                stream.on('data', (data: Buffer) => {
                    const __data = data.toString();
                    _streamData += __data;

                    const parts = _streamData.split('}');

                    // Last part may be incomplete, keep it in buffer
                    _streamData = parts.pop() || '';

                    for (const part of parts) {
                        const complete = `${part}}`;
                        try {
                            const ___aLog = AiDocker._convertStreamToLog(complete);
                            ___aLog.forEach((item) => Logger.Debug(`${Logger.Out} 🔨 Building '${service.ImageName}' image... ${item}`));
                        } catch {
                            Logger.Warn(`${Logger.Out} ⚠️ Failed to parse log part: ${complete}`);
                        }
                    }
                });


                stream.on('end', () => {
                    if (_streamData.length > 0) {
                        const ___aLog = AiDocker._convertStreamToLog(_streamData)
                        ___aLog.forEach((item) => Logger.Debug(`${Logger.Out} 🔨 Building '${service.ImageName}' image: ${item}`))
                        _streamData = ""
                    }
                    Logger.Info(`${Logger.Out} 🔨 Built '${service.ImageName}' image`)
                    resolve()
                })

                stream.on('error', (err: Error) => {
                    Logger.Error(`${Logger.Out} 🔨 ❌ Error building '${service.ImageName}' image: ${err}`)
                    reject(err)
                })
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
        const container = await AiDocker.docker.createContainer({
            Image: service.ImageName,
            name: containerName,
            Hostname: containerName,
            NetworkingConfig: {
                EndpointsConfig: { [DOCKER.AI_NETWORK]: {} }
            },
            Labels: {
                service: serviceName,
                scaled: 'true',
                'traefik.enable': 'true',
                [`traefik.http.routers.${serviceName}.rule`]: `PathPrefix(\`/${serviceName}\`)`,
                [`traefik.http.services.${serviceName}.loadbalancer.server.port`]: (service.Port as number).toString(),
                //
                [`traefik.http.routers.${serviceName}.middlewares`]: `rewrite-to-${serviceName}`,
                [`traefik.http.middlewares.rewrite-to-${serviceName}.replacePathRegex.regex`]: `^/${serviceName}(/.*)?$`,
                [`traefik.http.middlewares.rewrite-to-${serviceName}.replacePathRegex.replacement`]: `${service.InternalUrl}$1`
                //
            },
            HostConfig: {
                NetworkMode: DOCKER.AI_NETWORK,
                RestartPolicy: { Name: 'unless-stopped' },
                Binds: service.DockerVolume
            }
        })

        await container.start()
        Logger.Info(`${Logger.Out} Started new '${serviceName}' container '${containerName}'`)
    }

    @Logger.LogFunction()
    static async StartTraefik() {
        try {
            const containers = await AiDocker.docker.listContainers({
                all: true,
                filters: { name: [TraefikDockerService.Name] }
            })
            if (containers.length > 0) {
                Logger.Info(`${Logger.Out} Traefik container already running`)
                return
            }
            Logger.Info(`${Logger.Out} Starting Traefik container`)
            Logger.Info(`${Logger.Out} '${TraefikDockerService.ImageName}' pull started`)

            await AiDocker.PullImage(TraefikDockerService.ImageName).catch(Logger.Error)

            const container = await AiDocker.docker.createContainer({
                Image: TraefikDockerService.ImageName,
                name: TraefikDockerService.Name,
                Hostname: TraefikDockerService.Name,
                Cmd: [
                    "--api.dashboard=true",
                    "--api.insecure=true",
                    `--entrypoints.web.address=:${TraefikDockerService.Port}`,
                    `--entrypoints.traefik.address=:${TraefikDockerService.Options?.DashboardPort}`,
                    "--providers.docker=true",
                    "--providers.docker.exposedbydefault=false",
                    `--providers.docker.network=${DOCKER.AI_NETWORK}`,
                    "--log.level=DEBUG"
                ],
                ExposedPorts: {
                    [`${TraefikDockerService.Port}/tcp`]: {},
                    [`${TraefikDockerService.Options?.DashboardPort}/tcp`]: {}
                },
                HostConfig: {
                    NetworkMode: DOCKER.AI_NETWORK,
                    PortBindings: {
                        [`${TraefikDockerService.Port}/tcp`]: [{ HostPort: (TraefikDockerService.Port as number).toString() }],
                        [`${TraefikDockerService.Options?.DashboardPort}/tcp`]: [{ HostPort: (TraefikDockerService.Options?.DashboardPort as number).toString() }]
                    },
                    Binds: TraefikDockerService.DockerVolume
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
            } else if (avgCpu < AiDocker.ServiceInstance.CpuScaleDown && containers.length > AiDocker.ServiceInstance.MinInstances) {
                await AiDocker.ScaleDown(service)
            } else {
                Logger.Info(`${Logger.Out} AutoScale: No scaling needed for '${service.InstanceName ?? service.Name}'`)
            }
        }
    }

    @Logger.LogFunction()
    static async ScaleUp(service: TAiDockerService) {
        const containers = await AiDocker.ListActiveContainers(service)
        if (containers.length >= AiDocker.ServiceInstance.MaxInstances) {
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
                containers.map(async (containerInfo) => {
                    try {
                        const container = AiDocker.docker.getContainer(containerInfo.Id)
                        const start = Date.now()
                        const first = await container.stats({ stream: false })
                        await new Promise(r => setTimeout(r, 1000)) // Wait 1 sec
                        const second = await container.stats({ stream: false })
                        const end = Date.now()

                        const elapsedMs = end - start
                        const elapsedSeconds = elapsedMs / 1000

                        const cpuDelta = second.cpu_stats.cpu_usage.total_usage - first.cpu_stats.cpu_usage.total_usage
                        const cpuCores = second.cpu_stats.online_cpus ||
                            (second.cpu_stats.cpu_usage.percpu_usage?.length ?? 1)
                        return (cpuDelta / 1e9 / elapsedSeconds) * 100 / cpuCores
                    } catch (error) {
                        Logger.Error(`Error getting CPU stats for container '${service.Name}/${containerInfo.Id}': ${error instanceof Error
                            ? error.message
                            : String(error)}`)
                        return NaN
                    }
                })
            )

            // Calculate average of valid CPU percentages
            const validUsages = cpuUsages.filter(usage => !isNaN(usage))
            if (validUsages.length === 0) return 0

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
            `http://localhost:${service.Port}`,
            service.InternalUrl,
            '/health'
        )

        const containers = await AiDocker.ListActiveContainers(service)
        if (containers.length === 0) {
            return
        }

        for (const container of containers) {
            const containerId = container.Id;

            while (true) {
                try {
                    // Get container instance
                    const container = AiDocker.docker.getContainer(containerId);

                    // First, let's try a simpler approach - just test if curl can reach the URL
                    const execOptions: Docker.ExecCreateOptions = {
                        Cmd: ['sh', '-c', `curl -s -w '%{http_code}' -o /dev/null ${internalUrl} || echo "CURL_FAILED"`],
                        AttachStdout: true,
                        AttachStderr: true
                    };

                    const execInstance = await container.exec(execOptions);

                    // Try using inspect to get the result after execution
                    const streamPromise = execInstance.start({
                        hijack: false,
                        stdin: false
                    });
                    const stream = await streamPromise;

                    let output = '';

                    // Handle the stream data
                    stream.on('data', (chunk: Buffer) => {
                        output += chunk.toString();
                    });

                    // Wait for completion
                    await new Promise((resolve, reject) => {
                        stream.on('end', resolve);
                        stream.on('error', reject);
                    });

                    // Clean up the output - remove Docker stream headers if present
                    let cleanOutput = output;
                    if (output.includes('200') || output.includes('404') || output.includes('500')) {
                        // Extract just the HTTP status code
                        const statusMatch = output.match(/[2-5]\d{2}/);
                        if (statusMatch) {
                            cleanOutput = statusMatch[0];
                        }
                    }

                    if (cleanOutput.includes('CURL_FAILED')) {
                        Logger.Warn(`curl command failed in container ${containerId}`);
                        await new Promise(resolve => setTimeout(resolve, interval)); // wait before retry
                        continue;
                    }

                    const statusCode = parseInt(cleanOutput.trim(), 10);

                    if (statusCode === 200) {
                        Logger.Info(`Success: ${internalUrl} is available in container ${containerId}`);
                        break;
                    } else if (statusCode >= 100 && statusCode < 500) {
                        Logger.Info(`Waiting... Status: ${statusCode}`);
                    } else {
                        Logger.Info(`Invalid status code received: ${statusCode}, raw: '${cleanOutput}'`);
                    }

                } catch (error) {
                    Logger.Error(`Error testing service in container ${containerId}: ${error instanceof Error
                        ? error.message
                        : String(error)}`);
                }
                await new Promise(resolve => setTimeout(resolve, interval)); // wait before retry
            }
        }
    }
}