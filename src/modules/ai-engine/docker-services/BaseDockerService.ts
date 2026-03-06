//
//
//

import { DOCKER } from "../consts/DOCKER"
import type { TAiDockerService } from "../types/TAiDockerService"

//
export const BaseTextDockerService: TAiDockerService = {
	Name: "base-text",
	ImageName: `${DOCKER.AI_ENGINE_PREFIX}-base-text:1.0.0`,
	ImageContext: {
		context: `${process.cwd()}/.docker/ai-engines/services/base/text`,
		src: ["."],
	},
}

export const BaseImageDockerService: TAiDockerService = {
	Name: "base-image",
	ImageName: `${DOCKER.AI_ENGINE_PREFIX}-base-image:1.0.0`,
	ImageContext: {
		context: `${process.cwd()}/.docker/ai-engines/services/base/image`,
		src: ["."],
	},
}

export const BaseAudioDockerService: TAiDockerService = {
	Name: "base-audio",
	ImageName: `${DOCKER.AI_ENGINE_PREFIX}-base-audio:1.0.0`,
	ImageContext: {
		context: `${process.cwd()}/.docker/ai-engines/services/base/audio`,
		src: ["."],
	},
}
