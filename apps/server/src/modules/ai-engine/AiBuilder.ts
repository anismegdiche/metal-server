//
//
//
import { Logger } from "@metal/logger"
import { AiDocker } from "./AiDocker"
import type { IAiEngine } from "./base/IAiEngine"
import {
	BaseAudioDockerService,
	BaseImageDockerService,
	BaseTextDockerService,
} from "./docker-services/BaseDockerService"
import { Audio } from "./engine/Audio"
import { Image } from "./engine/Image"
import { Ocr } from "./engine/Ocr"
import { Text } from "./engine/Text"

//
export class AiBuilder {
	static async PrepareImages() {
		await Promise.all([
			AiBuilder.PrepareAiEngines(new Ocr()),
			AiDocker.BuildServiceImage(BaseTextDockerService).then(async () => {
				await AiBuilder.PrepareAiEngines(new Text())
			}),
			AiDocker.BuildServiceImage(BaseImageDockerService).then(async () => {
				await AiBuilder.PrepareAiEngines(new Image())
			}),
			AiDocker.BuildServiceImage(BaseAudioDockerService).then(async () => {
				await AiBuilder.PrepareAiEngines(new Audio())
			}),
		])
	}

	static async PrepareAiEngines(_ai: IAiEngine) {
		await _ai.Prepare().then(() => {
			return Promise.all(
				Object.values(_ai.AiDockerService).map(async (service) => {
					Logger.Info(`${Logger.In} Building image for '${service.Name}'`)
					return AiDocker.BuildServiceImage(service).catch(Logger.Error)
				}),
			)
		})
	}
}
