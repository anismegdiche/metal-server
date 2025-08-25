/* eslint-disable max-depth */
/* eslint-disable no-promise-executor-return */
/* eslint-disable no-continue */
/* eslint-disable no-async-promise-executor */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-plusplus */
//
//
//
import Docker from 'dockerode'
//
import { JsonUtils } from '../../utils/JsonUtils'
import { Logger } from '../../utils/Logger'
import { StringUtils } from '../../utils/StringUtils'
import { DOCKER } from './consts/DOCKER'
import { TraefikDockerService } from './docker-services/TraefikDockerService'
import { TAiDockerService } from './types/TAiDockerService'


//
export class AiDocker {

    static docker: Docker = new Docker();
    static AutoScaleWorker: NodeJS.Timeout
    static Instances: Map<string, TAiDockerService> = new Map()
    static DockerSocket = undefined  //{ socketPath: '/var/run/docker.sock' }

    static ServiceInstance = {
        MinInstances: 1,
        MaxInstances: 5,
        CpuScaleUp: 70,
        CpuScaleDown: 30,
        ScaleInterval: 15_000 // 15 seconds
    }

    constructor() {
        AiDocker.docker = new Docker(AiDocker.DockerSocket)
    }

    static async Init() {
        try {
            Logger.Info(`${Logger.In} Starting AI Engine stack manager`)
            await AiDocker.CleanStack()
            await AiDocker.CreateNetwork().catch(Logger.Debug)
            await AiDocker.StartTraefik().catch(Logger.Debug)

            AiDocker.StartScaler()
            Logger.Info(`${Logger.Out} AI Engine stack manager started`)
        } catch (error) {
            Logger.Error(`${Logger.Out} Error in Init: ${JSON.stringify(error)}`)
            throw error
        }
    }

    static async StartService(service: TAiDockerService) {
        AiDocker.Instances.set(service.InstanceName ?? service.Name, service)
        await AiDocker.BuildServiceImage(service).catch(Logger.Debug)
        const containers = await AiDocker.ListActiveContainers(service)
        for (let i = containers.length; i < AiDocker.ServiceInstance.MinInstances; i++) {

            await AiDocker.ScaleUp(service)
            // await AiDocker.WaitForService(service)
        }
    }

    static StartScaler() {
        AiDocker.AutoScaleWorker = setInterval(AiDocker.AutoScale, AiDocker.ServiceInstance.ScaleInterval)
    }

    static async CleanStack() {
        Logger.Info(`${Logger.In} Cleaning ${DOCKER.AI_ENGINE_PREFIX} stack...`)
        const containers = await AiDocker.docker.listContainers({
            all: true,
            filters: {
                name: [`${DOCKER.AI_ENGINE_PREFIX}_*`]
            }
        })

        for (const container of containers) {
            Logger.Info(`${Logger.In} Stopping container '${container.Names[0]}'...`)
            const c = AiDocker.docker.getContainer(container.Id)
            await c.stop().catch((e) => Logger.Debug(e.message))
            await c.remove().catch((e) => Logger.Debug(e.message))
            Logger.Info(`${Logger.Out} Stopped container '${container.Names[0]}'`)
        }

        Logger.Info(`${Logger.Out} ${DOCKER.AI_ENGINE_PREFIX} stack cleaned`)
    }

    static async CreateNetwork() {
        try {
            await AiDocker.docker.createNetwork({ Name: DOCKER.AI_NETWORK })
            Logger.Debug(`Docker network created: ${DOCKER.AI_NETWORK}`)
        } catch (e: any) {
            if (e.statusCode === 409) {
                Logger.Debug(`Docker network already exists: ${DOCKER.AI_NETWORK}`)
            } else {
                throw e
            }
        }
    }

    static async PullImage(image: string) {
        return new Promise<void>((resolve, reject) => {
            AiDocker.docker.pull(image, (err: any, stream: any) => {
                if (err) {
                    Logger.Error(`Error pulling image ${image}: ${err.message}`)
                    return reject(err)
                }

                AiDocker.docker.modem.followProgress(stream,
                    (err: any, output: any) => {
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

    static #ConvertStreamToLog(streamString: string): string[] {
        if (!streamString) return []

        const _streamString = streamString
            .split('\r\n')
            .map((item: string) => item.replace(/(\\r|\\n)/g, ''))
            .map(item => {
                try {
                    const parsed = JsonUtils.TryParse(item, { stream: '' })
                    return parsed && typeof parsed.stream === 'string'
                        ? parsed.stream
                        : ''
                } catch (e) {
                    return ''
                }
            })
            .filter(item => item && typeof item === 'string' && item.trim().length > 0)

        return _streamString
    }

    @Logger.LogFunction()
    static async BuildServiceImage(service: TAiDockerService): Promise<void> {
        return new Promise(async (resolve, reject) => {
            try {
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
                
                    let parts = _streamData.split('}');
                    
                    // Last part may be incomplete, keep it in buffer
                    _streamData = parts.pop() || '';
                
                    for (const part of parts) {
                        const complete = `${part}}`;
                        try {
                            const ___aLog = AiDocker.#ConvertStreamToLog(complete);
                            ___aLog.forEach((item) => Logger.Debug(`${Logger.Out} 🔨 Building '${service.ImageName}' image... ${item}`));
                        } catch (err) {
                            Logger.Warn(`${Logger.Out} ⚠️ Failed to parse log part: ${complete}`);
                        }
                    }
                });
                

                stream.on('end', () => {
                    if (_streamData.length > 0) {
                        const ___aLog = AiDocker.#ConvertStreamToLog(_streamData)
                        ___aLog.forEach((item) => Logger.Debug(`${Logger.Out} 🔨 Building '${service.ImageName}' image: ${item}`))
                        _streamData = ""
                    }
                    Logger.Debug(`${Logger.Out} 🔨 Built '${service.ImageName}' image`)
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
                RestartPolicy: { Name: 'unless-stopped' }
            }
        })

        await container.start()
        Logger.Debug(`${Logger.Out} Started new '${serviceName}' container '${containerName}'`)
    }

    static async StartTraefik() {
        try {
            const containers = await AiDocker.docker.listContainers({
                all: true,
                filters: { name: [TraefikDockerService.Name] }
            })
            if (containers.length > 0) {
                Logger.Debug(`${Logger.Out} Traefik container already running`)
                return
            }
            Logger.Debug(`${Logger.Out} Starting Traefik container`)
            Logger.Debug(`${Logger.Out} '${TraefikDockerService.ImageName}' pull started`)

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
                    Binds: [TraefikDockerService.DockerVolume as string]
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

    static async ListActiveContainers(service: TAiDockerService) {
        const containers = await AiDocker.docker.listContainers({
            filters: {
                label: [`service=${service.InstanceName ?? service.Name}`]
            }
        })
        return containers
    }

    static async AutoScale() {
        for (const service of AiDocker.Instances.values()) {

            const containers = await AiDocker.ListActiveContainers(service)

            if (containers.length === 0)
                continue

            const avgCpu = await AiDocker.GetAverageCpuUsage(service)

            Logger.Debug(`${Logger.In} AutoScale: '${service.InstanceName ?? service.Name}', Containers: ${containers.length}, Avg CPU: ${avgCpu.toFixed(0)}%`)

            if (avgCpu > AiDocker.ServiceInstance.CpuScaleUp && containers.length < AiDocker.ServiceInstance.MaxInstances) {
                await AiDocker.ScaleUp(service)
            } else if (avgCpu < AiDocker.ServiceInstance.CpuScaleDown && containers.length > AiDocker.ServiceInstance.MinInstances) {
                await AiDocker.ScaleDown(service)
            } else {
                Logger.Debug(`${Logger.Out} AutoScale: No scaling needed for '${service.InstanceName ?? service.Name}'`)
            }
        }
    }

    static async ScaleUp(service: TAiDockerService) {
        const containers = await AiDocker.ListActiveContainers(service)
        if (containers.length >= AiDocker.ServiceInstance.MaxInstances) {
            Logger.Debug(`Max '${service.InstanceName ?? service.Name}' containers reached: ${AiDocker.ServiceInstance.MaxInstances}`)
            return
        }

        Logger.Debug(`Scaling up '${service.InstanceName ?? service.Name}' service...`)
        await AiDocker.CreateServiceContainer(service)
    }

    static async ScaleDown(service: TAiDockerService) {
        const containers = await AiDocker.ListActiveContainers(service)
        if (containers.length <= AiDocker.ServiceInstance.MinInstances) {
            Logger.Debug(`Min '${service.InstanceName ?? service.Name}' containers reached: ${AiDocker.ServiceInstance.MinInstances}`)
            return
        }

        Logger.Debug(`Scaling down '${service.InstanceName ?? service.Name}' service...`)

        // Remove oldest scaled container
        const toRemove = containers[0]
        const container = AiDocker.docker.getContainer(toRemove.Id)
        await container.stop()
        await container.remove()
        Logger.Debug(`Removed '${service.InstanceName ?? service.Name}' container: ${toRemove.Names[0]}`)
    }

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
                    Logger.Debug(`Parsed status code: ${statusCode}`);

                    if (statusCode === 200) {
                        Logger.Debug(`Success: ${internalUrl} is available in container ${containerId}`);
                        break;
                    } else if (statusCode >= 100 && statusCode < 500) {
                        Logger.Debug(`Waiting... Status: ${statusCode}`);
                    } else {
                        Logger.Debug(`Invalid status code received: ${statusCode}, raw: '${cleanOutput}'`);
                    }

                } catch (error) {
                    Logger.Debug(`Error testing service in container ${containerId}: ${error instanceof Error
                        ? error.message
                        : String(error)}`);
                }
                await new Promise(resolve => setTimeout(resolve, interval)); // wait before retry
            }
        }
    }
}