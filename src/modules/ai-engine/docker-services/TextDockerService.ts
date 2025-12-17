//
//
//
import { TAiDockerService } from '../types/TAiDockerService';
import { DOCKER } from '../consts/DOCKER';
import { AI_DOCKER_MODEL_PATH } from '../@consts';


//
export const TextEmotionDetectionDockerService: TAiDockerService = {
    Name: 'text-emotion-detection',
    Port: 5000,
    ImageName: `${DOCKER.AI_ENGINE_PREFIX}-text-emotion-detection:1.0.0`,
    ImageContext: {
        context: `${process.cwd()}/.docker/ai-engines/services/text/emotion-detection`,
        src: ['.', './requirements.txt']
    },
    InternalUrl: '/text-emotion-detection',
    DockerVolume: [`${AI_DOCKER_MODEL_PATH}/text:/data`]
};


export const TextFeatureExtractionDockerService: TAiDockerService = {
    Name: 'text-feature-extraction',
    Port: 5000,
    ImageName: `${DOCKER.AI_ENGINE_PREFIX}-text-feature-extraction:1.0.0`,
    ImageContext: {
        context: `${process.cwd()}/.docker/ai-engines/services/text/feature-extraction`,
        src: ['.', './requirements.txt']
    },
    InternalUrl: '/text-feature-extraction',
    DockerVolume: [`${AI_DOCKER_MODEL_PATH}/text:/data`]
};


export const TextFillMaskDockerService: TAiDockerService = {
    Name: 'text-fill-mask',
    Port: 5000,
    ImageName: `${DOCKER.AI_ENGINE_PREFIX}-text-fill-mask:1.0.0`,
    ImageContext: {
        context: `${process.cwd()}/.docker/ai-engines/services/text/fill-mask`,
        src: ['.', './requirements.txt']
    },
    InternalUrl: '/text-fill-mask',
    DockerVolume: [`${AI_DOCKER_MODEL_PATH}/text:/data`]
};

export const TextKeywordExtractionDockerService: TAiDockerService = {
    Name: 'text-keyword-extraction',
    Port: 5000,
    ImageName: `${DOCKER.AI_ENGINE_PREFIX}-text-keyword-extraction:1.0.0`,
    ImageContext: {
        context: `${process.cwd()}/.docker/ai-engines/services/text/keyword-extraction`,
        src: ['.', './requirements.txt']
    },
    InternalUrl: '/text-keyword-extraction',
    DockerVolume: [`${AI_DOCKER_MODEL_PATH}/text:/data`]
};

export const TextLanguageDetectionDockerService: TAiDockerService = {
    Name: 'text-language-detection',
    Port: 5000,
    ImageName: `${DOCKER.AI_ENGINE_PREFIX}-text-language-detection:1.0.0`,
    ImageContext: {
        context: `${process.cwd()}/.docker/ai-engines/services/text/language-detection`,
        src: ['.', './requirements.txt']
    },
    InternalUrl: '/text-language-detection',
    DockerVolume: [`${AI_DOCKER_MODEL_PATH}/text:/data`]
};

export const TextParaphraseDetectionDockerService: TAiDockerService = {
    Name: 'text-paraphrase-detection',
    Port: 5000,
    ImageName: `${DOCKER.AI_ENGINE_PREFIX}-text-paraphrase-detection:1.0.0`,
    ImageContext: {
        context: `${process.cwd()}/.docker/ai-engines/services/text/paraphrase-detection`,
        src: ['.', './requirements.txt']
    },
    InternalUrl: '/text-paraphrase-detection',
    DockerVolume: [`${AI_DOCKER_MODEL_PATH}/text:/data`]
};

export const TextQuestionAnsweringDockerService: TAiDockerService = {
    Name: 'text-question-answering',
    Port: 5000,
    ImageName: `${DOCKER.AI_ENGINE_PREFIX}-text-question-answering:1.0.0`,
    ImageContext: {
        context: `${process.cwd()}/.docker/ai-engines/services/text/question-answering`,
        src: ['.', './requirements.txt']
    },
    InternalUrl: '/text-question-answering',
    DockerVolume: [`${AI_DOCKER_MODEL_PATH}/text:/data`]
};

export const TextSentenceSimilarityDockerService: TAiDockerService = {
    Name: 'text-sentence-similarity',
    Port: 5000,
    ImageName: `${DOCKER.AI_ENGINE_PREFIX}-text-sentence-similarity:1.0.0`,
    ImageContext: {
        context: `${process.cwd()}/.docker/ai-engines/services/text/sentence-similarity`,
        src: ['.', './requirements.txt']
    },
    InternalUrl: '/text-sentence-similarity',
    DockerVolume: [`${AI_DOCKER_MODEL_PATH}/text:/data`]
};

export const TextSentimentAnalysisDockerService: TAiDockerService = {
    Name: 'text-sentiment-analysis',
    Port: 5000,
    ImageName: `${DOCKER.AI_ENGINE_PREFIX}-text-sentiment-analysis:1.0.0`,
    ImageContext: {
        context: `${process.cwd()}/.docker/ai-engines/services/text/sentiment-analysis`,
        src: ['.', './requirements.txt']
    },
    InternalUrl: '/text-sentiment-analysis',
    DockerVolume: [`${AI_DOCKER_MODEL_PATH}/text:/data`]
};

export const TextSummarizationDockerService: TAiDockerService = {
    Name: 'text-summarization',
    Port: 5000,
    ImageName: `${DOCKER.AI_ENGINE_PREFIX}-text-summarization:1.0.0`,
    ImageContext: {
        context: `${process.cwd()}/.docker/ai-engines/services/text/summarization`,
        src: ['.', './requirements.txt']
    },
    InternalUrl: '/text-summarization',
    DockerVolume: [`${AI_DOCKER_MODEL_PATH}/text:/data`]
};


export const TextTextGenerationDockerService: TAiDockerService = {
    Name: 'text-text-generation',
    Port: 5000,
    ImageName: `${DOCKER.AI_ENGINE_PREFIX}-text-text-generation:1.0.0`,
    ImageContext: {
        context: `${process.cwd()}/.docker/ai-engines/services/text/text-generation`,
        src: ['.', './requirements.txt']
    },
    InternalUrl: '/text-text-generation',
    DockerVolume: [`${AI_DOCKER_MODEL_PATH}/text:/data`]
};

// export const TextText2TextGenerationDockerService: TAiDockerService = {
//     Name: 'text_text2text_generation',
//     Port: 5000,
//     ImageName: `${DOCKER.AI_ENGINE_PREFIX}_text_text2text_generation:1.0.0`,
//     ImageContext: {
//         context: `${process.cwd()}/.docker/ai-engines/services/text/text2text-generation`,
//         src: ['.', './requirements.txt']
//     },
//     InternalUrl: '/text-text2text-generation'
// };

export const TextTokenClassificationDockerService: TAiDockerService = {
    Name: 'text-ner',
    Port: 5000,
    ImageName: `${DOCKER.AI_ENGINE_PREFIX}-text-ner:1.0.0`,
    ImageContext: {
        context: `${process.cwd()}/.docker/ai-engines/services/text/ner`,
        src: ['.', './requirements.txt']
    },
    InternalUrl: '/text-ner',
    DockerVolume: [`${AI_DOCKER_MODEL_PATH}/text:/data`]
};

export const TextToxicityDetectionDockerService: TAiDockerService = {
    Name: 'text-toxicity-detection',
    Port: 5000,
    ImageName: `${DOCKER.AI_ENGINE_PREFIX}-text-toxicity-detection:1.0.0`,
    ImageContext: {
        context: `${process.cwd()}/.docker/ai-engines/services/text/toxicity-detection`,
        src: ['.', './requirements.txt']
    },
    InternalUrl: '/text-toxicity-detection',
    DockerVolume: [`${AI_DOCKER_MODEL_PATH}/text:/data`]
};

export const TextTranslationDockerService: TAiDockerService = {
    Name: 'text-translation',
    Port: 5000,
    ImageName: `${DOCKER.AI_ENGINE_PREFIX}-text-translation:1.0.0`,
    ImageContext: {
        context: `${process.cwd()}/.docker/ai-engines/services/text/translation`,
        src: ['.', './requirements.txt']
    },
    InternalUrl: '/text-translation',
    DockerVolume: [`${AI_DOCKER_MODEL_PATH}/text:/data`]
};

export const TextZeroShotClassificationDockerService: TAiDockerService = {
    Name: 'text-zero-shot-classification',
    Port: 5000,
    ImageName: `${DOCKER.AI_ENGINE_PREFIX}-text-zero-shot-classification:1.0.0`,
    ImageContext: {
        context: `${process.cwd()}/.docker/ai-engines/services/text/zero-shot-classification`,
        src: ['.', './requirements.txt']
    },
    InternalUrl: '/text-zero-shot-classification',
    DockerVolume: [`${AI_DOCKER_MODEL_PATH}/text:/data`]
};
