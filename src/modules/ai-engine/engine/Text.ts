//
//
//
import axios from 'axios'
import _ from "lodash"
//
import { Assert } from '../../../utils/Assert'
import { LangUtils } from '../../../utils/LangUtils'
import { Logger } from '../../../utils/Logger'
import { StringUtils } from "../../../utils/StringUtils"
import { Utils } from '../../../utils/Utils'
import { HttpErrorInternalServerError } from '../../errors/HttpErrors'
import { AI_ENGINE } from '../@consts'
import { TAiRunArguments, TAiRunOutput, TConfigAiEngine } from '../@types'
import { AiDocker } from '../AiDocker'
import { absAiEngine } from '../base/absAiEngine'
import { IAiEngine } from '../base/IAiEngine'
import { LANG_ISO } from "../consts/LANG"
import { TEXT_LANGUAGE_DETECTION, TEXT_LANGUAGE_DETECTION_ISO, TEXT_TASK } from "../consts/TEXT"
import { TextEmotionDetectionDockerService, TextFillMaskDockerService, TextKeywordExtractionDockerService, TextLanguageDetectionDockerService, TextParaphraseDetectionDockerService, TextQuestionAnsweringDockerService, TextSentenceSimilarityDockerService, TextSentimentAnalysisDockerService, TextSummarizationDockerService, TextText2TextGenerationDockerService, TextTextGenerationDockerService, TextTokenClassificationDockerService, TextToxicityDetectionDockerService, TextTranslationDockerService, TextZeroShotClassificationDockerService } from '../docker-services/TextDockerService'
import { TAiDockerService } from '../types/TAiDockerService'
import { TStepRunAiTextEmotionDetectionParams, TStepRunAiTextFillMaskParams, TStepRunAiTextKeywordExtractionParams, TStepRunAiTextParams, TStepRunAiTextParaphraseDetectionParams, TStepRunAiTextQuestionAnsweringParams, TStepRunAiTextSentenceSimilarityParams, TStepRunAiTextSentimentAnalysisParams, TStepRunAiTextSummarizationParams, TStepRunAiTextTextGenerationParams, TStepRunAiTextTokenClassificationParams, TStepRunAiTextToxicityDetectionParams, TStepRunAiTextTranslationParams, TStepRunAiTextZeroShotClassificationParams } from '../types/TStepRunAiTextParam'
import typia from 'typia'


//
const TEXT_DEFAULT_HEADERS = {
    headers: {
        'Content-Type': 'application/json'
    }
}


//
export class Text extends absAiEngine implements IAiEngine {

    AiEngineName = AI_ENGINE.TEXT

    AiDockerService: Record<string, TAiDockerService> = {}
    RunTask: Record<string, (args: TAiRunArguments) => Promise<TAiRunOutput>> = {}

    DEFAULT: TStepRunAiTextParams = {
        task: TEXT_TASK.TRANSLATION,
        params: {
            src_lang: LANG_ISO.en_XX,
            tgt_lang: LANG_ISO.fr_XX
        }
    }

    constructor() {
        super()
    }

    @Logger.LogFunction()
    async Init(aiName: string, aiConfig: TConfigAiEngine): Promise<void> {
        await super.Init(aiName, aiConfig)

        this.AiDockerService = {
            [`${AI_ENGINE.TEXT}-${TEXT_TASK.EMOTION_DETECTION}`]: TextEmotionDetectionDockerService,
            [`${AI_ENGINE.TEXT}-${TEXT_TASK.FILL_MASK}`]: TextFillMaskDockerService,
            [`${AI_ENGINE.TEXT}-${TEXT_TASK.KEYWORD_EXTRACTION}`]: TextKeywordExtractionDockerService,
            [`${AI_ENGINE.TEXT}-${TEXT_TASK.LANGUAGE_DETECTION}`]: TextLanguageDetectionDockerService,
            [`${AI_ENGINE.TEXT}-${TEXT_TASK.PARAPHRASE_DETECTION}`]: TextParaphraseDetectionDockerService,
            [`${AI_ENGINE.TEXT}-${TEXT_TASK.QUESTION_ANSWERING}`]: TextQuestionAnsweringDockerService,
            [`${AI_ENGINE.TEXT}-${TEXT_TASK.SENTENCE_SIMILARITY}`]: TextSentenceSimilarityDockerService,
            [`${AI_ENGINE.TEXT}-${TEXT_TASK.SENTIMENT_ANALYSIS}`]: TextSentimentAnalysisDockerService,
            [`${AI_ENGINE.TEXT}-${TEXT_TASK.SUMMARIZATION}`]: TextSummarizationDockerService,
            [`${AI_ENGINE.TEXT}-${TEXT_TASK.TEXT2TEXT_GENERATION}`]: TextText2TextGenerationDockerService,
            [`${AI_ENGINE.TEXT}-${TEXT_TASK.TEXT_GENERATION}`]: TextTextGenerationDockerService,
            [`${AI_ENGINE.TEXT}-${TEXT_TASK.TOKEN_CLASSIFICATION}`]: TextTokenClassificationDockerService,
            [`${AI_ENGINE.TEXT}-${TEXT_TASK.TOXICITY_DETECTION}`]: TextToxicityDetectionDockerService,
            [`${AI_ENGINE.TEXT}-${TEXT_TASK.ZERO_SHOT_CLASSIFICATION}`]: TextZeroShotClassificationDockerService,
            [`${AI_ENGINE.TEXT}-${TEXT_TASK.TRANSLATION}`]: TextTranslationDockerService
        }

        this.RunTask = {
            [TEXT_TASK.TRANSLATION]: async (args: TAiRunArguments) => await this.Translation(args),
            [TEXT_TASK.EMOTION_DETECTION]: async (args: TAiRunArguments) => await this.EmotionDetection(args),
            [TEXT_TASK.FILL_MASK]: async (args: TAiRunArguments) => await this.FillMask(args),
            [TEXT_TASK.KEYWORD_EXTRACTION]: async (args: TAiRunArguments) => await this.KeywordExtraction(args),
            [TEXT_TASK.LANGUAGE_DETECTION]: async (args: TAiRunArguments) => await this.LanguageDetection(args),
            [TEXT_TASK.PARAPHRASE_DETECTION]: async (args: TAiRunArguments) => await this.ParaphraseDetection(args),
            [TEXT_TASK.QUESTION_ANSWERING]: async (args: TAiRunArguments) => await this.QuestionAnswering(args),
            [TEXT_TASK.SENTENCE_SIMILARITY]: async (args: TAiRunArguments) => await this.SentenceSimilarity(args),
            [TEXT_TASK.SENTIMENT_ANALYSIS]: async (args: TAiRunArguments) => await this.SentimentAnalysis(args),
            [TEXT_TASK.SUMMARIZATION]: async (args: TAiRunArguments) => await this.Summarization(args),
            [TEXT_TASK.TEXT2TEXT_GENERATION]: async (args: TAiRunArguments) => await this.Text2TextGeneration(args),
            [TEXT_TASK.TEXT_GENERATION]: async (args: TAiRunArguments) => await this.TextGeneration(args),
            [TEXT_TASK.TOKEN_CLASSIFICATION]: async (args: TAiRunArguments) => await this.TokenClassification(args),
            [TEXT_TASK.TOXICITY_DETECTION]: async (args: TAiRunArguments) => await this.ToxicityDetection(args),
            [TEXT_TASK.ZERO_SHOT_CLASSIFICATION]: async (args: TAiRunArguments) => await this.ZeroShotClassification(args)
        }

        await AiDocker.StartService({
            InstanceName: aiName,
            ...this.AiDockerService[this.InstanceName]
        })

        Logger.Debug(`${Logger.Out} Successfully initialized Text instance '${this.InstanceName}'`)
    }

    @Logger.LogFunction(true)
    async Run(args: TAiRunArguments): Promise<TAiRunOutput> {

        const _args: TStepRunAiTextParams = _.merge(this.DEFAULT, args)
        const { task } = _args

        if (Object.values(TEXT_TASK).includes(task)) {
            await Utils.Wait(async () => await this.IsHealthy())
            return await this.RunTask[task](args)
        }

        throw new HttpErrorInternalServerError(`Invalid model: ${task}`)
    }

    @Logger.LogFunction(true)
    async Translation(args: TAiRunArguments): Promise<TAiRunOutput> {

        const { data } = args;
        const { params } = args as TStepRunAiTextTranslationParams;

        Assert.Var(data, 'data is required')
        Assert.Var(params, 'params is required')
        Assert.Var(params.src_lang, 'params.src_lang is required')
        Assert.Var(params.tgt_lang, 'params.tgt_lang is required')

        const _url = StringUtils.Url(
            this.InstanceApiUrl,
            this.InstanceName,
            'run'
        );

        const response = await axios.post(
            _url,
            {
                input_data: data,
                params
            },
            TEXT_DEFAULT_HEADERS
        )
            .catch(error => {
                throw new HttpErrorInternalServerError(`Translation request failed: ${error.response?.data?.message ?? error.message}`);
            })
        return response.data.result[0];
    }

    @Logger.LogFunction(true)
    async EmotionDetection(args: TAiRunArguments): Promise<TAiRunOutput> {

        const { data } = args;
        const { params } = args as TStepRunAiTextEmotionDetectionParams;

        Assert.Var(data, 'data is required')

        const _url = StringUtils.Url(
            this.InstanceApiUrl,
            this.InstanceName,
            'run'
        );

        const response = await axios.post(
            _url,
            {
                input_data: data,
                params
            },
            TEXT_DEFAULT_HEADERS
        )
            .catch(error => {
                throw new HttpErrorInternalServerError(`Emotion detection failed: ${error.response?.data?.message ?? error.message}`);
            })

        return response.data.result[0];
    }

    @Logger.LogFunction(true)
    async FillMask(args: TAiRunArguments): Promise<TAiRunOutput> {

        const { data } = args;
        const { params } = args as TStepRunAiTextFillMaskParams;

        Assert.Var(data, 'data is required')

        const _url = StringUtils.Url(
            this.InstanceApiUrl,
            this.InstanceName,
            'run'
        );

        const response = await axios.post(
            _url,
            {
                input_data: data,
                params
            },
            TEXT_DEFAULT_HEADERS
        )
            .catch(error => {
                throw new HttpErrorInternalServerError(`Fill mask failed: ${error.response?.data?.message ?? error.message}`);
            })

        return response.data.result[0];
    }

    @Logger.LogFunction(true)
    async KeywordExtraction(args: TAiRunArguments): Promise<TAiRunOutput> {

        const { data } = args;
        const { params } = args as TStepRunAiTextKeywordExtractionParams;

        Assert.Var(data, 'data is required')

        const _url = StringUtils.Url(
            this.InstanceApiUrl,
            this.InstanceName,
            'run'
        );

        const response = await axios.post(
            _url,
            {
                input_data: data,
                params
            },
            TEXT_DEFAULT_HEADERS
        )
            .catch(error => {
                throw new HttpErrorInternalServerError(`Keyword extraction failed: ${error.response?.data?.message ?? error.message}`);
            })

        return response.data.result;
    }

    @Logger.LogFunction(true)
    async LanguageDetection(args: TAiRunArguments): Promise<TAiRunOutput> {

        const { data } = args;

        Assert.Var(data, 'data is required')

        const _url = StringUtils.Url(
            this.InstanceApiUrl,
            this.InstanceName,
            'run'
        );

        const response = await axios.post(
            _url,
            {
                input_data: data
            },
            TEXT_DEFAULT_HEADERS
        )
            .catch(error => {
                throw new HttpErrorInternalServerError(`Language detection failed: ${error.response?.data?.message ?? error.message}`);
            })

        const result = response.data.result[0]

        return {
            label: LangUtils.Convert(result.label, TEXT_LANGUAGE_DETECTION, TEXT_LANGUAGE_DETECTION_ISO),
            score: result.score
        };
    }

    @Logger.LogFunction(true)
    async ParaphraseDetection(args: TAiRunArguments): Promise<TAiRunOutput> {

        const { data } = args;
        const { params } = args as TStepRunAiTextParaphraseDetectionParams;

        Assert.Var(data, 'data is required')
        Assert.Var(params, 'params is required')
        Assert.Var(params.target, 'params.target is required')

        const _url = StringUtils.Url(
            this.InstanceApiUrl,
            this.InstanceName,
            'run'
        );

        const response = await axios.post(
            _url,
            {
                input_data: {
                    source_sentence: data,
                    target_sentence: params.target
                }
            },
            TEXT_DEFAULT_HEADERS
        )
            .catch(error => {
                throw new HttpErrorInternalServerError(`Paraphrase detection failed: ${error.response?.data?.message ?? error.message}`);
            })

        return response.data.result;
    }

    @Logger.LogFunction(true)
    async QuestionAnswering(args: TAiRunArguments): Promise<TAiRunOutput> {

        const { data } = args;
        const { params } = args as TStepRunAiTextQuestionAnsweringParams;

        Assert.Var(data, 'data is required')
        Assert.Var(params, 'params is required')
        Assert.Var(params.context, 'params.context is required')

        const _url = StringUtils.Url(
            this.InstanceApiUrl,
            this.InstanceName,
            'run'
        );

        const response = await axios.post(
            _url,
            {
                input_data: {
                    question: data,
                    context: params.context
                }
            },
            TEXT_DEFAULT_HEADERS
        )
            .catch(error => {
                throw new HttpErrorInternalServerError(`Question answering failed: ${error.response?.data?.message ?? error.message}`);
            })

        return response.data.result[0];
    }

    @Logger.LogFunction(true)
    async SentenceSimilarity(args: TAiRunArguments): Promise<TAiRunOutput> {

        const { data } = args;
        const { params } = args as TStepRunAiTextSentenceSimilarityParams;

        Assert.Var(data, 'data is required')
        Assert.Var(params, 'params is required')
        Assert.Var(params.sentences, 'params.sentences is required')

        const _url = StringUtils.Url(
            this.InstanceApiUrl,
            this.InstanceName,
            'run'
        );

        const response = await axios.post(
            _url,
            {
                input_data: {
                    source_sentence: data,
                    sentences: params.sentences
                }
            },
            TEXT_DEFAULT_HEADERS
        )
            .catch(error => {
                throw new HttpErrorInternalServerError(`Sentence similarity failed: ${error.response?.data?.message ?? error.message}`);
            })

        return response.data.result;
    }

    @Logger.LogFunction(true)
    async SentimentAnalysis(args: TAiRunArguments): Promise<TAiRunOutput> {

        const { data } = args;
        const { params } = args as TStepRunAiTextSentimentAnalysisParams;

        Assert.Var(data, 'data is required')

        const _url = StringUtils.Url(
            this.InstanceApiUrl,
            this.InstanceName,
            'run'
        );

        const response = await axios.post(
            _url,
            {
                input_data: data,
                params
            },
            TEXT_DEFAULT_HEADERS
        )
            .catch(error => {
                throw new HttpErrorInternalServerError(`Sentiment analysis failed: ${error.response?.data?.message ?? error.message}`);
            })

        return response.data.result;
    }

    @Logger.LogFunction(true)
    async Summarization(args: TAiRunArguments): Promise<TAiRunOutput> {

        const { data } = args;
        const { params } = args as TStepRunAiTextSummarizationParams;

        Assert.Var(data, 'data is required')
        Assert.Var(params, 'params is required')
        Assert.Var(params.max_length, 'params.max_length is required')
        Assert.Var(params.min_length, 'params.min_length is required')

        const _url = StringUtils.Url(
            this.InstanceApiUrl,
            this.InstanceName,
            'run'
        );

        const response = await axios.post(
            _url,
            {
                input_data: data,
                params
            },
            TEXT_DEFAULT_HEADERS
        )
            .catch(error => {
                throw new HttpErrorInternalServerError(`Summarization failed: ${error.response?.data?.message ?? error.message}`);
            })

        return response.data.result[0];
    }

    @Logger.LogFunction(true)
    async Text2TextGeneration(args: TAiRunArguments): Promise<TAiRunOutput> {

        const { data } = args;

        Assert.Var(data, 'data is required')

        const _url = StringUtils.Url(
            this.InstanceApiUrl,
            this.InstanceName,
            'run'
        );

        const response = await axios.post(
            _url,
            {
                input_data: data
            },
            TEXT_DEFAULT_HEADERS
        )
            .catch(error => {
                throw new HttpErrorInternalServerError(`Text2Text generation failed: ${error.response?.data?.message ?? error.message}`);
            })

        return response.data.result[0];
    }

    @Logger.LogFunction(true)
    async TextGeneration(args: TAiRunArguments): Promise<TAiRunOutput> {

        const { data } = args;
        const { params } = args as TStepRunAiTextTextGenerationParams;

        Assert.Var(data, 'data is required')
        Assert.Var<TStepRunAiTextTextGenerationParams>(
            params, typia.is<TStepRunAiTextTextGenerationParams>(params), 'params is required')

        const _url = StringUtils.Url(
            this.InstanceApiUrl,
            this.InstanceName,
            'run'
        );

        const response = await axios.post(
            _url,
            {
                input_data: data,
                params
            },
            TEXT_DEFAULT_HEADERS
        )
            .catch(error => {
                throw new HttpErrorInternalServerError(`Text generation failed: ${error.response?.data?.message ?? error.message}`);
            })

        return response.data.result[0];
    }

    @Logger.LogFunction(true)
    async TokenClassification(args: TAiRunArguments): Promise<TAiRunOutput> {

        const { data } = args;
        const { params } = args as TStepRunAiTextTokenClassificationParams;

        Assert.Var(data, 'data is required')

        const _url = StringUtils.Url(
            this.InstanceApiUrl,
            this.InstanceName,
            'run'
        );

        const response = await axios.post(
            _url,
            {
                input_data: data,
                params
            },
            TEXT_DEFAULT_HEADERS
        )
            .catch(error => {
                throw new HttpErrorInternalServerError(`Token classification failed: ${error.response?.data?.message ?? error.message}`);
            })

        return response.data.result;
    }

    @Logger.LogFunction(true)
    async ToxicityDetection(args: TAiRunArguments): Promise<TAiRunOutput> {

        const { data } = args;
        const { params } = args as TStepRunAiTextToxicityDetectionParams;

        Assert.Var(data, 'data is required')

        const _url = StringUtils.Url(
            this.InstanceApiUrl,
            this.InstanceName,
            'run'
        );

        const response = await axios.post(
            _url,
            {
                input_data: data,
                params
            },
            TEXT_DEFAULT_HEADERS
        )
            .catch(error => {
                throw new HttpErrorInternalServerError(`Toxicity detection failed: ${error.response?.data?.message ?? error.message}`);
            })

        return response.data.result[0];
    }

    @Logger.LogFunction(true)
    async ZeroShotClassification(args: TAiRunArguments): Promise<TAiRunOutput> {

        const { data } = args;
        const { params } = args as TStepRunAiTextZeroShotClassificationParams;

        Assert.Var(data, 'data is required')
        Assert.Var(params, 'params is required')
        Assert.Var(params.candidate_labels, 'params.candidate_labels is required')

        const _url = StringUtils.Url(
            this.InstanceApiUrl,
            this.InstanceName,
            'run'
        );

        const response = await axios.post(
            _url,
            {
                input_data: data,
                params
            },
            TEXT_DEFAULT_HEADERS
        )
            .catch(error => {
                throw new HttpErrorInternalServerError(`Zero-shot classification failed: ${error.response?.data?.message ?? error.message}`);
            })

        return response.data.result;
    }
}