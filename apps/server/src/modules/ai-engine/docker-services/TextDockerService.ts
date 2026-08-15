//
//
//

import { AiEngine } from "../AiEngine"
import { DOCKER } from "../consts/DOCKER"
import type { TAiDockerService } from "../types/TAiDockerService"

//
export const TextEmotionDetectionDockerService: TAiDockerService = {
	Name: "text-emotion-detection",
	Port: 5000,
	ImageName: `${DOCKER.AI_ENGINE_PREFIX}-text-emotion-detection:1.0.0`,
	ImageContext: {
		context: `${process.cwd()}/.docker/ai-engines/services/text/emotion-detection`,
		src: [".", "./requirements.txt"],
	},
	InternalUrl: "/text-emotion-detection",
	get DockerVolume() {
		return [`${AiEngine.modelsPath}/text:/data`]
	},
}

export const TextFeatureExtractionDockerService: TAiDockerService = {
	Name: "text-feature-extraction",
	Port: 5000,
	ImageName: `${DOCKER.AI_ENGINE_PREFIX}-text-feature-extraction:1.0.0`,
	ImageContext: {
		context: `${process.cwd()}/.docker/ai-engines/services/text/feature-extraction`,
		src: [".", "./requirements.txt"],
	},
	InternalUrl: "/text-feature-extraction",
	get DockerVolume() {
		return [`${AiEngine.modelsPath}/text:/data`]
	},
}

export const TextFillMaskDockerService: TAiDockerService = {
	Name: "text-fill-mask",
	Port: 5000,
	ImageName: `${DOCKER.AI_ENGINE_PREFIX}-text-fill-mask:1.0.0`,
	ImageContext: {
		context: `${process.cwd()}/.docker/ai-engines/services/text/fill-mask`,
		src: [".", "./requirements.txt"],
	},
	InternalUrl: "/text-fill-mask",
	get DockerVolume() {
		return [`${AiEngine.modelsPath}/text:/data`]
	},
}

export const TextKeywordExtractionDockerService: TAiDockerService = {
	Name: "text-keyword-extraction",
	Port: 5000,
	ImageName: `${DOCKER.AI_ENGINE_PREFIX}-text-keyword-extraction:1.0.0`,
	ImageContext: {
		context: `${process.cwd()}/.docker/ai-engines/services/text/keyword-extraction`,
		src: [".", "./requirements.txt"],
	},
	InternalUrl: "/text-keyword-extraction",
	get DockerVolume() {
		return [`${AiEngine.modelsPath}/text:/data`]
	},
}

export const TextLanguageDetectionDockerService: TAiDockerService = {
	Name: "text-language-detection",
	Port: 5000,
	ImageName: `${DOCKER.AI_ENGINE_PREFIX}-text-language-detection:1.0.0`,
	ImageContext: {
		context: `${process.cwd()}/.docker/ai-engines/services/text/language-detection`,
		src: [".", "./requirements.txt"],
	},
	InternalUrl: "/text-language-detection",
	get DockerVolume() {
		return [`${AiEngine.modelsPath}/text:/data`]
	},
}

export const TextParaphraseDetectionDockerService: TAiDockerService = {
	Name: "text-paraphrase-detection",
	Port: 5000,
	ImageName: `${DOCKER.AI_ENGINE_PREFIX}-text-paraphrase-detection:1.0.0`,
	ImageContext: {
		context: `${process.cwd()}/.docker/ai-engines/services/text/paraphrase-detection`,
		src: [".", "./requirements.txt"],
	},
	InternalUrl: "/text-paraphrase-detection",
	get DockerVolume() {
		return [`${AiEngine.modelsPath}/text:/data`]
	},
}

export const TextQuestionAnsweringDockerService: TAiDockerService = {
	Name: "text-question-answering",
	Port: 5000,
	ImageName: `${DOCKER.AI_ENGINE_PREFIX}-text-question-answering:1.0.0`,
	ImageContext: {
		context: `${process.cwd()}/.docker/ai-engines/services/text/question-answering`,
		src: [".", "./requirements.txt"],
	},
	InternalUrl: "/text-question-answering",
	get DockerVolume() {
		return [`${AiEngine.modelsPath}/text:/data`]
	},
}

export const TextSentenceSimilarityDockerService: TAiDockerService = {
	Name: "text-sentence-similarity",
	Port: 5000,
	ImageName: `${DOCKER.AI_ENGINE_PREFIX}-text-sentence-similarity:1.0.0`,
	ImageContext: {
		context: `${process.cwd()}/.docker/ai-engines/services/text/sentence-similarity`,
		src: [".", "./requirements.txt"],
	},
	InternalUrl: "/text-sentence-similarity",
	get DockerVolume() {
		return [`${AiEngine.modelsPath}/text:/data`]
	},
}

export const TextSentimentAnalysisDockerService: TAiDockerService = {
	Name: "text-sentiment-analysis",
	Port: 5000,
	ImageName: `${DOCKER.AI_ENGINE_PREFIX}-text-sentiment-analysis:1.0.0`,
	ImageContext: {
		context: `${process.cwd()}/.docker/ai-engines/services/text/sentiment-analysis`,
		src: [".", "./requirements.txt"],
	},
	InternalUrl: "/text-sentiment-analysis",
	get DockerVolume() {
		return [`${AiEngine.modelsPath}/text:/data`]
	},
}

export const TextSummarizationDockerService: TAiDockerService = {
	Name: "text-summarization",
	Port: 5000,
	ImageName: `${DOCKER.AI_ENGINE_PREFIX}-text-summarization:1.0.0`,
	ImageContext: {
		context: `${process.cwd()}/.docker/ai-engines/services/text/summarization`,
		src: [".", "./requirements.txt"],
	},
	InternalUrl: "/text-summarization",
	get DockerVolume() {
		return [`${AiEngine.modelsPath}/text:/data`]
	},
}

export const TextTextGenerationDockerService: TAiDockerService = {
	Name: "text-text-generation",
	Port: 5000,
	ImageName: `${DOCKER.AI_ENGINE_PREFIX}-text-text-generation:1.0.0`,
	ImageContext: {
		context: `${process.cwd()}/.docker/ai-engines/services/text/text-generation`,
		src: [".", "./requirements.txt"],
	},
	InternalUrl: "/text-text-generation",
	get DockerVolume() {
		return [`${AiEngine.modelsPath}/text:/data`]
	},
}

export const TextTokenClassificationDockerService: TAiDockerService = {
	Name: "text-ner",
	Port: 5000,
	ImageName: `${DOCKER.AI_ENGINE_PREFIX}-text-ner:1.0.0`,
	ImageContext: {
		context: `${process.cwd()}/.docker/ai-engines/services/text/ner`,
		src: [".", "./requirements.txt"],
	},
	InternalUrl: "/text-ner",
	get DockerVolume() {
		return [`${AiEngine.modelsPath}/text:/data`]
	},
}

export const TextToxicityDetectionDockerService: TAiDockerService = {
	Name: "text-toxicity-detection",
	Port: 5000,
	ImageName: `${DOCKER.AI_ENGINE_PREFIX}-text-toxicity-detection:1.0.0`,
	ImageContext: {
		context: `${process.cwd()}/.docker/ai-engines/services/text/toxicity-detection`,
		src: [".", "./requirements.txt"],
	},
	InternalUrl: "/text-toxicity-detection",
	get DockerVolume() {
		return [`${AiEngine.modelsPath}/text:/data`]
	},
}

export const TextTranslationDockerService: TAiDockerService = {
	Name: "text-translation",
	Port: 5000,
	ImageName: `${DOCKER.AI_ENGINE_PREFIX}-text-translation:1.0.0`,
	ImageContext: {
		context: `${process.cwd()}/.docker/ai-engines/services/text/translation`,
		src: [".", "./requirements.txt"],
	},
	InternalUrl: "/text-translation",
	get DockerVolume() {
		return [`${AiEngine.modelsPath}/text:/data`]
	},
}

export const TextZeroShotClassificationDockerService: TAiDockerService = {
	Name: "text-zero-shot-classification",
	Port: 5000,
	ImageName: `${DOCKER.AI_ENGINE_PREFIX}-text-zero-shot-classification:1.0.0`,
	ImageContext: {
		context: `${process.cwd()}/.docker/ai-engines/services/text/zero-shot-classification`,
		src: [".", "./requirements.txt"],
	},
	InternalUrl: "/text-zero-shot-classification",
	get DockerVolume() {
		return [`${AiEngine.modelsPath}/text:/data`]
	},
}
