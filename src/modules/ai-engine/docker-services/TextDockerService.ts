//
//
//
import { TAiDockerService } from '../types/TAiDockerService';
import { DOCKER } from '../consts/DOCKER';


//
export let TextEmotionDetectionDockerService: TAiDockerService = {
    Name: 'text_emotion_detection',
    Port: 5000,
    ImageName: `${DOCKER.AI_ENGINE_PREFIX}_text_emotion_detection:v1.0.0`,
    ImageContext: {
        context: `${__dirname}/services/text/emotion-detection`,
        src: ['.', './requirements.txt']
    },
    InternalUrl: '/text-emotion-detection'
};


export let TextFeatureExtractionDockerService: TAiDockerService = {
    Name: 'text_feature_extraction',
    Port: 5000,
    ImageName: `${DOCKER.AI_ENGINE_PREFIX}_text_feature_extraction:v1.0.0`,
    ImageContext: {
        context: `${__dirname}/services/text/feature-extraction`,
        src: ['.', './requirements.txt']
    },
    InternalUrl: '/text-feature-extraction'
};


export let TextFillMaskDockerService: TAiDockerService = {
    Name: 'text_fill_mask',
    Port: 5000,
    ImageName: `${DOCKER.AI_ENGINE_PREFIX}_text_fill_mask:v1.0.0`,
    ImageContext: {
        context: `${__dirname}/services/text/fill-mask`,
        src: ['.', './requirements.txt']
    },
    InternalUrl: '/text-fill-mask'
};

export let TextKeywordExtractionDockerService: TAiDockerService = {
    Name: 'text_keyword_extraction',
    Port: 5000,
    ImageName: `${DOCKER.AI_ENGINE_PREFIX}_text_keyword_extraction:v1.0.0`,
    ImageContext: {
        context: `${__dirname}/services/text/keyword-extraction`,
        src: ['.', './requirements.txt']
    },
    InternalUrl: '/text-keyword-extraction'
};

export let TextLanguageDetectionDockerService: TAiDockerService = {
    Name: 'text_language_detection',
    Port: 5000,
    ImageName: `${DOCKER.AI_ENGINE_PREFIX}_text_language_detection:v1.0.0`,
    ImageContext: {
        context: `${__dirname}/services/text/language-detection`,
        src: ['.', './requirements.txt']
    },
    InternalUrl: '/text-language-detection'
};

export let TextParaphraseDetectionDockerService: TAiDockerService = {
    Name: 'text_paraphrase_detection',
    Port: 5000,
    ImageName: `${DOCKER.AI_ENGINE_PREFIX}_text_paraphrase_detection:v1.0.0`,
    ImageContext: {
        context: `${__dirname}/services/text/paraphrase-detection`,
        src: ['.', './requirements.txt']
    },
    InternalUrl: '/text-paraphrase-detection'
};

export let TextQuestionAnsweringDockerService: TAiDockerService = {
    Name: 'text_question_answering',
    Port: 5000,
    ImageName: `${DOCKER.AI_ENGINE_PREFIX}_text_question_answering:v1.0.0`,
    ImageContext: {
        context: `${__dirname}/services/text/question-answering`,
        src: ['.', './requirements.txt']
    },
    InternalUrl: '/text-question-answering'
};

export let TextSentenceSimilarityDockerService: TAiDockerService = {
    Name: 'text_sentence_similarity',
    Port: 5000,
    ImageName: `${DOCKER.AI_ENGINE_PREFIX}_text_sentence_similarity:v1.0.0`,
    ImageContext: {
        context: `${__dirname}/services/text/sentence-similarity`,
        src: ['.', './requirements.txt']
    },
    InternalUrl: '/text-sentence-similarity'
};

export let TextSentimentAnalysisDockerService: TAiDockerService = {
    Name: 'text_sentiment_analysis',
    Port: 5000,
    ImageName: `${DOCKER.AI_ENGINE_PREFIX}_text_sentiment_analysis:v1.0.0`,
    ImageContext: {
        context: `${__dirname}/services/text/sentiment-analysis`,
        src: ['.', './requirements.txt']
    },
    InternalUrl: '/text-sentiment-analysis'
};

export let TextSummarizationDockerService: TAiDockerService = {
    Name: 'text_summarization',
    Port: 5000,
    ImageName: `${DOCKER.AI_ENGINE_PREFIX}_text_summarization:v1.0.0`,
    ImageContext: {
        context: `${__dirname}/services/text/summarization`,
        src: ['.', './requirements.txt']
    },
    InternalUrl: '/text-summarization'
};


export let TextTextGenerationDockerService: TAiDockerService = {
    Name: 'text_text_generation',
    Port: 5000,
    ImageName: `${DOCKER.AI_ENGINE_PREFIX}_text_text_generation:v1.0.0`,
    ImageContext: {
        context: `${__dirname}/services/text/text-generation`,
        src: ['.', './requirements.txt']
    },
    InternalUrl: '/text-text-generation'
};

export let TextText2TextGenerationDockerService: TAiDockerService = {
    Name: 'text_text2text_generation',
    Port: 5000,
    ImageName: `${DOCKER.AI_ENGINE_PREFIX}_text_text2text_generation:v1.0.0`,
    ImageContext: {
        context: `${__dirname}/services/text/text2text-generation`,
        src: ['.', './requirements.txt']
    },
    InternalUrl: '/text-text2text-generation'
};

export let TextTokenClassificationDockerService: TAiDockerService = {
    Name: 'text_token_classification',
    Port: 5000,
    ImageName: `${DOCKER.AI_ENGINE_PREFIX}_text_token_classification:v1.0.0`,
    ImageContext: {
        context: `${__dirname}/services/text/token-classification`,
        src: ['.', './requirements.txt']
    },
    InternalUrl: '/text-token-classification'
};

export let TextToxicityDetectionDockerService: TAiDockerService = {
    Name: 'text_toxicity_detection',
    Port: 5000,
    ImageName: `${DOCKER.AI_ENGINE_PREFIX}_text_toxicity_detection:v1.0.0`,
    ImageContext: {
        context: `${__dirname}/services/text/toxicity-detection`,
        src: ['.', './requirements.txt']
    },
    InternalUrl: '/text-toxicity-detection'
};

export let TextTranslationDockerService: TAiDockerService = {
    Name: 'text_translation',
    Port: 5000,
    ImageName: `${DOCKER.AI_ENGINE_PREFIX}_text_translation:v1.0.0`,
    ImageContext: {
        context: `${__dirname}/services/text/translation`,
        src: ['.', './requirements.txt']
    },
    InternalUrl: '/text-translation'
};

export let TextZeroShotClassificationDockerService: TAiDockerService = {
    Name: 'text_zero_shot_classification',
    Port: 5000,
    ImageName: `${DOCKER.AI_ENGINE_PREFIX}_text_zero_shot_classification:v1.0.0`,
    ImageContext: {
        context: `${__dirname}/services/text/zero-shot-classification`,
        src: ['.', './requirements.txt']
    },
    InternalUrl: '/text-zero-shot-classification'
};
