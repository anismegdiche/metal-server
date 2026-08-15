//
//
//

import { AiEngine } from "../AiEngine"
import { DOCKER } from "../consts/DOCKER"
import type { TAiDockerService } from "../types/TAiDockerService"

export const ImageImageClassificationDockerService: TAiDockerService = {
	Name: "image-image-classification",
	Port: 5000,
	ImageName: `${DOCKER.AI_ENGINE_PREFIX}-image-image-classification:1.0.0`,
	ImageContext: {
		context: `${process.cwd()}/.docker/ai-engines/services/image/image-classification`,
		src: [".", "./requirements.txt"],
	},
	InternalUrl: "/image-image-classification",
	get DockerVolume() {
		return [`${AiEngine.modelsPath}/image:/data`]
	},
}

export const ImageImageSegmentationDockerService: TAiDockerService = {
	Name: "image-image-segmentation",
	Port: 5000,
	ImageName: `${DOCKER.AI_ENGINE_PREFIX}-image-image-segmentation:1.0.0`,
	ImageContext: {
		context: `${process.cwd()}/.docker/ai-engines/services/image/image-segmentation`,
		src: [".", "./requirements.txt"],
	},
	InternalUrl: "/image-image-segmentation",
	get DockerVolume() {
		return [`${AiEngine.modelsPath}/image:/data`]
	},
}

export const ImageImageToTextDockerService: TAiDockerService = {
	Name: "image-image-to-text",
	Port: 5000,
	ImageName: `${DOCKER.AI_ENGINE_PREFIX}-image-image-to-text:1.0.0`,
	ImageContext: {
		context: `${process.cwd()}/.docker/ai-engines/services/image/image-to-text`,
		src: [".", "./requirements.txt"],
	},
	InternalUrl: "/image-image-to-text",
	get DockerVolume() {
		return [`${AiEngine.modelsPath}/image:/data`]
	},
}

export const ImageObjectDetectionDockerService: TAiDockerService = {
	Name: "image-object-detection",
	Port: 5000,
	ImageName: `${DOCKER.AI_ENGINE_PREFIX}-image-object-detection:1.0.0`,
	ImageContext: {
		context: `${process.cwd()}/.docker/ai-engines/services/image/object-detection`,
		src: [".", "./requirements.txt"],
	},
	InternalUrl: "/image-object-detection",
	get DockerVolume() {
		return [`${AiEngine.modelsPath}/image:/data`]
	},
}

export const ImageVisualQuestionAnsweringDockerService: TAiDockerService = {
	Name: "image-visual-question-answering",
	Port: 5000,
	ImageName: `${DOCKER.AI_ENGINE_PREFIX}-image-visual-question-answering:1.0.0`,
	ImageContext: {
		context: `${process.cwd()}/.docker/ai-engines/services/image/visual-question-answering`,
		src: [".", "./requirements.txt"],
	},
	InternalUrl: "/image-visual-question-answering",
	get DockerVolume() {
		return [`${AiEngine.modelsPath}/image:/data`]
	},
}
