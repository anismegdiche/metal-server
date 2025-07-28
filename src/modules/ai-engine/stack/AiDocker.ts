/* eslint-disable */
//
//
//
import Docker from 'dockerode'
import _ from 'lodash'
import { exec } from 'child_process'
//
import { Logger } from '../../../utils/Logger'
import { TJson } from '../../../types/TJson'
import { JsonUtils } from '../../../utils/JsonUtils'
import { StringUtils } from '../../../utils/StringUtils'

export type TAiDockerService = {
    Name: string
    InstanceName?: string
    Port: number
    ImageName: string
    ImageContext?: Docker.ImageBuildContext
    DockerVolume?: string
    Options?: TJson
    InternalUrl?: string
}

export class AiDocker {
    static docker: Docker = new Docker();
    static AiNetwork = 'ai_net';
    static AiEnginePrefix = 'ai_engine';

    static AutoScaleWorker: NodeJS.Timeout

    static Instances: Map<string, TAiDockerService> = new Map()

    static ServiceInstance = {
        MinInstances: 1,
        MaxInstances: 5,
        CpuScaleUp: 70,
        CpuScaleDown: 30,
        ScaleInterval: 15_000 // 15 seconds
    }

    static TRAEFIK: TAiDockerService = {
        Name: `${AiDocker.AiEnginePrefix}_traefik`,
        ImageName: 'traefik:v2.11',
        DockerVolume: '/var/run/docker.sock:/var/run/docker.sock:ro', // '\\\.\\pipe\\docker_engine:\\\.\\pipe\\docker_engine:ro'
        Port: 5000,
        Options: {
            DashboardPort: 8080
        }
    }

    static OCR: TAiDockerService = {
        Name: 'ocr',
        Port: 5000,
        ImageName: `${AiDocker.AiEnginePrefix}_ocr:v1.0`,
        ImageContext: {
            context: `${__dirname}/services/ocr`,
            src: ['.', './requirements.txt']
        },
        InternalUrl: '/ocr'
    }

    static HUGGINGFACE: TAiDockerService = {
        Name: 'huggingface',
        Port: 5000,
        ImageName: `${AiDocker.AiEnginePrefix}_huggingface:v1.0.0`,
        ImageContext: {
            context: `${__dirname}/services/huggingface`,
            src: ['.', './requirements.txt']
        },
        InternalUrl: '/huggingface'
    }

    static TEXT_TRANSLATION: TAiDockerService = {
        Name: 'text_translation',
        Port: 5000,
        ImageName: `${AiDocker.AiEnginePrefix}_text_translation:v1.0.0`,
        ImageContext: {
            context: `${__dirname}/services/text/translation`,
            src: ['.', './requirements.txt']
        },
        InternalUrl: '/text-translation'
    }

    static TEXT_EMOTION_DETECTION: TAiDockerService = {
        Name: 'text_emotion_detection',
        Port: 5000,
        ImageName: `${AiDocker.AiEnginePrefix}_text_emotion_detection:v1.0.0`,
        ImageContext: {
            context: `${__dirname}/services/text/emotion-detection`,
            src: ['.', './requirements.txt']
        },
        InternalUrl: '/text-emotion-detection'
    }

    static TEXT_FEATURE_EXTRACTION: TAiDockerService = {
        Name: 'text_feature_extraction',
        Port: 5000,
        ImageName: `${AiDocker.AiEnginePrefix}_text_feature_extraction:v1.0.0`,
        ImageContext: {
            context: `${__dirname}/services/text/feature-extraction`,
            src: ['.', './requirements.txt']
        },
        InternalUrl: '/text-feature-extraction'
    }

    static TEXT_FILL_MASK: TAiDockerService = {
        Name: 'text_fill_mask',
        Port: 5000,
        ImageName: `${AiDocker.AiEnginePrefix}_text_fill_mask:v1.0.0`,
        ImageContext: {
            context: `${__dirname}/services/text/fill-mask`,
            src: ['.', './requirements.txt']
        },
        InternalUrl: '/text-fill-mask'
    }

    static TEXT_KEYWORD_EXTRACTION: TAiDockerService = {
        Name: 'text_keyword_extraction',
        Port: 5000,
        ImageName: `${AiDocker.AiEnginePrefix}_text_keyword_extraction:v1.0.0`,
        ImageContext: {
            context: `${__dirname}/services/text/keyword-extraction`,
            src: ['.', './requirements.txt']
        },
        InternalUrl: '/text-keyword-extraction'
    }

    static TEXT_PARAPHRASE_DETECTION: TAiDockerService = {
        Name: 'text_paraphrase_detection',
        Port: 5000,
        ImageName: `${AiDocker.AiEnginePrefix}_text_paraphrase_detection:v1.0.0`,
        ImageContext: {
            context: `${__dirname}/services/text/paraphrase-detection`,
            src: ['.', './requirements.txt']
        },
        InternalUrl: '/text-paraphrase-detection'
    }

    static TEXT_QUESTION_ANSWERING: TAiDockerService = {
        Name: 'text_question_answering',
        Port: 5000,
        ImageName: `${AiDocker.AiEnginePrefix}_text_question_answering:v1.0.0`,
        ImageContext: {
            context: `${__dirname}/services/text/question-answering`,
            src: ['.', './requirements.txt']
        },
        InternalUrl: '/text-question-answering'
    }

    static TEXT_SENTENCE_SIMILARITY: TAiDockerService = {
        Name: 'text_sentence_similarity',
        Port: 5000,
        ImageName: `${AiDocker.AiEnginePrefix}_text_sentence_similarity:v1.0.0`,
        ImageContext: {
            context: `${__dirname}/services/text/sentence-similarity`,
            src: ['.', './requirements.txt']
        },
        InternalUrl: '/text-sentence-similarity'
    }

    static TEXT_SUMMARIZATION: TAiDockerService = {
        Name: 'text_summarization',
        Port: 5000,
        ImageName: `${AiDocker.AiEnginePrefix}_text_summarization:v1.0.0`,
        ImageContext: {
            context: `${__dirname}/services/text/summarization`,
            src: ['.', './requirements.txt']
        },
        InternalUrl: '/text-summarization'
    }

    static TEXT_TEXT_GENERATION: TAiDockerService = {
        Name: 'text_text_generation',
        Port: 5000,
        ImageName: `${AiDocker.AiEnginePrefix}_text_text_generation:v1.0.0`,
        ImageContext: {
            context: `${__dirname}/services/text/text-generation`,
            src: ['.', './requirements.txt']
        },
        InternalUrl: '/text-text-generation'
    }

    static TEXT_TOKEN_CLASSIFICATION: TAiDockerService = {
        Name: 'text_token_classification',
        Port: 5000,
        ImageName: `${AiDocker.AiEnginePrefix}_text_token_classification:v1.0.0`,
        ImageContext: {
            context: `${__dirname}/services/text/token-classification`,
            src: ['.', './requirements.txt']
        },
        InternalUrl: '/text-token-classification'
    }

    static TEXT_TOXICITY_DETECTION: TAiDockerService = {
        Name: 'text_toxicity_detection',
        Port: 5000,
        ImageName: `${AiDocker.AiEnginePrefix}_text_toxicity_detection:v1.0.0`,
        ImageContext: {
            context: `${__dirname}/services/text/toxicity-detection`,
            src: ['.', './requirements.txt']
        },
        InternalUrl: '/text-toxicity-detection'
    }

    static TEXT_ZERO_SHOT_CLASSIFICATION: TAiDockerService = {
        Name: 'text_zero_shot_classification',
        Port: 5000,
        ImageName: `${AiDocker.AiEnginePrefix}_text_zero_shot_classification:v1.0.0`,
        ImageContext: {
            context: `${__dirname}/services/text/zero-shot-classification`,
            src: ['.', './requirements.txt']
        },
        InternalUrl: '/text-zero-shot-classification'
    }

    static TEXT_LANGUAGE_DETECTION: TAiDockerService = {
        Name: 'text_language_detection',
        Port: 5000,
        ImageName: `${AiDocker.AiEnginePrefix}_text_language_detection:v1.0.0`,
        ImageContext: {
            context: `${__dirname}/services/text/language-detection`,
            src: ['.', './requirements.txt']
        },
        InternalUrl: '/text-language-detection'
    }

    static TEXT_SENTIMENT_ANALYSIS: TAiDockerService = {
        Name: 'text_sentiment_analysis',
        Port: 5000,
        ImageName: `${AiDocker.AiEnginePrefix}_text_sentiment_analysis:v1.0.0`,
        ImageContext: {
            context: `${__dirname}/services/text/sentiment-analysis`,
            src: ['.', './requirements.txt']
        },
        InternalUrl: '/text-sentiment-analysis'
    }

    static TEXT_TEXT2TEXT_GENERATION: TAiDockerService = {
        Name: 'text_text2text_generation',
        Port: 5000,
        ImageName: `${AiDocker.AiEnginePrefix}_text_text2text_generation:v1.0.0`,
        ImageContext: {
            context: `${__dirname}/services/text/text2text-generation`,
            src: ['.', './requirements.txt']
        },
        InternalUrl: '/text-text2text-generation'
    }

    constructor() {
        AiDocker.docker = new Docker()  //{ socketPath: '/var/run/docker.sock' }
    }

    static async Init() {
        try {
            Logger.Info('Starting AI Engine stack manager...')
            await AiDocker.CleanStack()
            await AiDocker.CreateNetwork().catch(Logger.Debug)
            await AiDocker.StartTraefik().catch(Logger.Debug)

            AiDocker.StartScaler()
            Logger.Info('AI Engine stack manager started')
        } catch (error) {
            Logger.Error(`Error in Init: ${JSON.stringify(error)}`)
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
        Logger.Info(`Cleaning ${AiDocker.AiEnginePrefix} stack...`)
        const containers = await AiDocker.docker.listContainers({
            all: true,
            filters: {
                name: [
                    `${AiDocker.AiEnginePrefix}_*`
                ]
            }
        })

        for (const container of containers) {
            Logger.Info(`Stopping container: ${container.Names[0]}`)
            const c = AiDocker.docker.getContainer(container.Id)
            await c.stop().catch((e) => Logger.Debug(e.message))
            await c.remove().catch((e) => Logger.Debug(e.message))
        }

        Logger.Info(`${AiDocker.AiEnginePrefix} stack cleaned`)
    }

    static async CreateNetwork() {
        try {
            await AiDocker.docker.createNetwork({ Name: AiDocker.AiNetwork })
            Logger.Debug(`Docker network created: ${AiDocker.AiNetwork}`)
        } catch (e: any) {
            if (e.statusCode === 409) {
                Logger.Debug(`Docker network already exists: ${AiDocker.AiNetwork}`)
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
                        Logger.Debug(`(📦) Pulling ${image}...`)
                        resolve()
                    },
                    (event: any) => {
                        if (event.status === 'Downloading') {
                            Logger.Debug(`(📦) Pulling ${image}... ${event.progress}`)
                        } else {
                            Logger.Debug(`(📦) Pulling ${image}... ${event.status}`)
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
                    return parsed && typeof parsed.stream === 'string' ? parsed.stream : ''
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
                    const __data = data.toString()
                    _streamData = _streamData + __data

                    if (__data.endsWith('}')) {
                        const ___aLog   = AiDocker.#ConvertStreamToLog(_streamData)
                        ___aLog.forEach((item) => Logger.Debug(`(🔨) Building '${service.ImageName}' image... ${item}`))
                        _streamData = ""
                    }
                })

                stream.on('end', () => {
                    if (_streamData.length > 0) {
                        const ___aLog   = AiDocker.#ConvertStreamToLog(_streamData)
                        ___aLog.forEach((item) => Logger.Debug(`(🔨) Building '${service.ImageName}' image... ${item}`))
                        _streamData = ""
                    }
                    Logger.Debug(`(🔨) Built '${service.ImageName}' image`)
                    resolve()
                })

                stream.on('error', (err: Error) => {
                    Logger.Error(`(🔨) ❌ Error building '${service.ImageName}' image: ${err}`)
                    reject(err)
                })
            } catch (err) {
                Logger.Error(`(🔨) ❌ Failed to build '${service.ImageName}' image: ${err}`)
                reject(err)
            }
        })
    }

    private static async CreateServiceContainer(service: TAiDockerService) {
        const serviceName = service.InstanceName ?? service.Name
        const containerName = `${AiDocker.AiEnginePrefix}_${serviceName}_${Date.now()}`
        const container = await AiDocker.docker.createContainer({
            Image: service.ImageName,
            name: containerName,
            Hostname: containerName,
            NetworkingConfig: {
                EndpointsConfig: { [AiDocker.AiNetwork]: {} }
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
                [`traefik.http.middlewares.rewrite-to-${serviceName}.replacePathRegex.replacement`]: `${service.InternalUrl}$1`,
                //
            },
            HostConfig: {
                NetworkMode: AiDocker.AiNetwork,
                RestartPolicy: { Name: 'unless-stopped' }
            }
        })

        await container.start()
        Logger.Debug(`Started new ${serviceName} container: ${containerName}`)
    }

    static async StartTraefik() {
        try {
            const containers = await AiDocker.docker.listContainers({
                all: true,
                filters: { name: [AiDocker.TRAEFIK.Name] }
            })
            if (containers.length > 0) {
                Logger.Debug('Traefik container already running')
                return
            }
            Logger.Debug('Starting Traefik container...')
            Logger.Debug(` - ${AiDocker.TRAEFIK.ImageName} pull started`)

            await AiDocker.PullImage(AiDocker.TRAEFIK.ImageName).catch(Logger.Error)

            const container = await AiDocker.docker.createContainer({
                Image: AiDocker.TRAEFIK.ImageName,
                name: AiDocker.TRAEFIK.Name,
                Hostname: AiDocker.TRAEFIK.Name,
                Cmd: [
                    "--api.dashboard=true",
                    "--api.insecure=true",
                    `--entrypoints.web.address=:${AiDocker.TRAEFIK.Port}`,
                    `--entrypoints.traefik.address=:${AiDocker.TRAEFIK.Options?.DashboardPort}`,
                    "--providers.docker=true",
                    "--providers.docker.exposedbydefault=false",
                    `--providers.docker.network=${AiDocker.AiNetwork}`,
                    "--log.level=DEBUG"
                ],
                ExposedPorts: {
                    [`${AiDocker.TRAEFIK.Port}/tcp`]: {},
                    [`${AiDocker.TRAEFIK.Options?.DashboardPort}/tcp`]: {}
                },
                HostConfig: {
                    NetworkMode: AiDocker.AiNetwork,
                    PortBindings: {
                        [`${AiDocker.TRAEFIK.Port}/tcp`]: [{ HostPort: (AiDocker.TRAEFIK.Port as number).toString() }],
                        [`${AiDocker.TRAEFIK.Options?.DashboardPort}/tcp`]: [{ HostPort: (AiDocker.TRAEFIK.Options?.DashboardPort as number).toString() }]
                    },
                    Binds: [AiDocker.TRAEFIK.DockerVolume as string]
                },
                NetworkingConfig: {
                    EndpointsConfig: { [AiDocker.AiNetwork]: {} }
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

            Logger.Debug(`AutoScale: '${service.InstanceName ?? service.Name}', Containers: ${containers.length}, Avg CPU: ${avgCpu.toFixed(0)}%`)

            if (avgCpu > AiDocker.ServiceInstance.CpuScaleUp && containers.length < AiDocker.ServiceInstance.MaxInstances) {
                await AiDocker.ScaleUp(service)
            } else if (avgCpu < AiDocker.ServiceInstance.CpuScaleDown && containers.length > AiDocker.ServiceInstance.MinInstances) {
                await AiDocker.ScaleDown(service)
            } else {
                Logger.Debug(`AutoScale: No scaling needed for '${service.InstanceName ?? service.Name}'`)
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
                        const cpuCores = second.cpu_stats.online_cpus
                            || (second.cpu_stats.cpu_usage.percpu_usage?.length ?? 1)
                        return (cpuDelta / 1e9 / elapsedSeconds) * 100 / cpuCores
                    } catch (error) {
                        Logger.Error(`Error getting CPU stats for container '${service.Name}/${containerInfo.Id}': ${error instanceof Error ? error.message : String(error)}`)
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
            Logger.Error(`Error getting average CPU usage for service ${service.Name}: ${error instanceof Error ? error.message : String(error)}`)
            return 0
        }
    }

    static async WaitForService(service: TAiDockerService, interval = 3000): Promise<void> {
        if (!service.InternalUrl) {
            return
        }

        const internalUrl = StringUtils.Url(
            'http://localhost:' + service.Port,
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
                    const streamPromise = execInstance.start({ hijack: false, stdin: false });
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

                    const statusCode = parseInt(cleanOutput.trim());
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
                    Logger.Debug(`Error testing service in container ${containerId}: ${error instanceof Error ? error.message : String(error)}`);
                }
                await new Promise(resolve => setTimeout(resolve, interval)); // wait before retry
            }
        }
    }
}