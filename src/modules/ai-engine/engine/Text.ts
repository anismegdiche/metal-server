//
//
//
import axios from 'axios'
import _, { isObject, merge } from "lodash"
//
import { Assert } from '../../../utils/Assert'
import { LangUtils } from '../../../utils/LangUtils'
import { Logger } from '../../../utils/Logger'
import { Utils } from '../../../utils/Utils'
import { HttpErrorInternalServerError } from '../../errors/HttpErrors'
import { AI_ENGINE } from '../@consts'
import { TAiRunArguments, TAiRunOutput, TConfigAiEngine } from '../@types'
import { AiDocker } from '../AiDocker'
import { absAiEngine } from '../base/absAiEngine'
import { IAiEngine } from '../base/IAiEngine'
import { LANG_ISO } from "../consts/LANG"
import { TEXT_LANGUAGE_DETECTION, TEXT_LANGUAGE_DETECTION_ISO, TEXT_TASK } from "../consts/TEXT"
import { TextEmotionDetectionDockerService, TextFillMaskDockerService, TextKeywordExtractionDockerService, TextLanguageDetectionDockerService, TextParaphraseDetectionDockerService, TextQuestionAnsweringDockerService, TextSentenceSimilarityDockerService, TextSentimentAnalysisDockerService, TextSummarizationDockerService, TextTextGenerationDockerService, TextTokenClassificationDockerService, TextToxicityDetectionDockerService, TextTranslationDockerService, TextZeroShotClassificationDockerService } from '../docker-services/TextDockerService'
import { TAiDockerService } from '../types/TAiDockerService'
import { TStepRunAiTextEmotionDetectionParams, TStepRunAiTextParams, TStepRunAiTextParaphraseDetectionParams, TStepRunAiTextQuestionAnsweringParams, TStepRunAiTextSentenceSimilarityParams, TStepRunAiTextSentimentAnalysisParams, TStepRunAiTextSummarizationParams, TStepRunAiTextTextGenerationParams, TStepRunAiTextNerParams, TStepRunAiTextToxicityDetectionParams, TStepRunAiTextTranslationParams, TStepRunAiTextZeroShotClassificationParams } from '../types/TStepRunAiTextParam'
import { StringUtils } from '../../../utils/StringUtils'


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
            source: LANG_ISO.en_XX,
            target: LANG_ISO.fr_XX
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
            [`${AI_ENGINE.TEXT}-${TEXT_TASK.NER}`]: TextTokenClassificationDockerService,
            [`${AI_ENGINE.TEXT}-${TEXT_TASK.PARAPHRASE_DETECTION}`]: TextParaphraseDetectionDockerService,
            [`${AI_ENGINE.TEXT}-${TEXT_TASK.QUESTION_ANSWERING}`]: TextQuestionAnsweringDockerService,
            [`${AI_ENGINE.TEXT}-${TEXT_TASK.SENTENCE_SIMILARITY}`]: TextSentenceSimilarityDockerService,
            [`${AI_ENGINE.TEXT}-${TEXT_TASK.SENTIMENT_ANALYSIS}`]: TextSentimentAnalysisDockerService,
            [`${AI_ENGINE.TEXT}-${TEXT_TASK.SUMMARIZATION}`]: TextSummarizationDockerService,
            // [`${AI_ENGINE.TEXT}-${TEXT_TASK.TEXT2TEXT_GENERATION}`]: TextText2TextGenerationDockerService,
            [`${AI_ENGINE.TEXT}-${TEXT_TASK.TEXT_GENERATION}`]: TextTextGenerationDockerService,
            [`${AI_ENGINE.TEXT}-${TEXT_TASK.TOXICITY_DETECTION}`]: TextToxicityDetectionDockerService,
            [`${AI_ENGINE.TEXT}-${TEXT_TASK.TRANSLATION}`]: TextTranslationDockerService,
            [`${AI_ENGINE.TEXT}-${TEXT_TASK.ZERO_SHOT_CLASSIFICATION}`]: TextZeroShotClassificationDockerService
        }

        this.RunTask = {
            [TEXT_TASK.EMOTION_DETECTION]: async (args: TAiRunArguments) => await this.EmotionDetection(args),
            [TEXT_TASK.FILL_MASK]: async (args: TAiRunArguments) => await this.FillMask(args),
            [TEXT_TASK.KEYWORD_EXTRACTION]: async (args: TAiRunArguments) => await this.KeywordExtraction(args),
            [TEXT_TASK.LANGUAGE_DETECTION]: async (args: TAiRunArguments) => await this.LanguageDetection(args),
            [TEXT_TASK.PARAPHRASE_DETECTION]: async (args: TAiRunArguments) => await this.ParaphraseDetection(args),
            [TEXT_TASK.QUESTION_ANSWERING]: async (args: TAiRunArguments) => await this.QuestionAnswering(args),
            [TEXT_TASK.SENTENCE_SIMILARITY]: async (args: TAiRunArguments) => await this.SentenceSimilarity(args),
            [TEXT_TASK.SENTIMENT_ANALYSIS]: async (args: TAiRunArguments) => await this.SentimentAnalysis(args),
            [TEXT_TASK.SUMMARIZATION]: async (args: TAiRunArguments) => await this.Summarization(args),
            // [TEXT_TASK.TEXT2TEXT_GENERATION]: async (args: TAiRunArguments) => await this.Text2TextGeneration(args),
            [TEXT_TASK.TEXT_GENERATION]: async (args: TAiRunArguments) => await this.TextGeneration(args),
            [TEXT_TASK.NER]: async (args: TAiRunArguments) => await this.Ner(args),
            [TEXT_TASK.TOXICITY_DETECTION]: async (args: TAiRunArguments) => await this.ToxicityDetection(args),
            [TEXT_TASK.TRANSLATION]: async (args: TAiRunArguments) => await this.Translation(args),
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

        Assert.Condition(Object.values(TEXT_TASK).includes(task as TEXT_TASK), `Invalid text task: ${task}`)

        await Utils.Wait(async () => await this.IsHealthy(), AiDocker.ServiceInstance.Sleep, AiDocker.ServiceInstance.Timeout)
        return this.RunTask[task](args)
    }

    @Logger.LogFunction(true)
    async EmotionDetection(args: TAiRunArguments): Promise<TAiRunOutput> {

        const { data } = args;
        const { params } = args as TStepRunAiTextEmotionDetectionParams;

        const _params = {
            top_k: params?.top ?? null
        }

        Assert.Var(data, 'data is required')

        const response = await axios.post(
            StringUtils.Url(this.InstanceApiUrl, 'run'),
            {
                input_data: data,
                params: _params
            },
            TEXT_DEFAULT_HEADERS
        )
            .catch(error => {
                throw new HttpErrorInternalServerError(`Emotion detection failed: ${error.response?.data?.message ?? error.message}`);
            })

        const result = response.data.result[0];

        Assert.Var(isObject(result), 'result is not an object')

        if (!Array.isArray(result))
            return {
                [result.label]: result.score
            }

        const emotion = result.reduce((acc: any, item: any) => {
            acc[item.label] = parseFloat(item.score);
            return acc;
        }, {});

        return {
            emotion
        }
    }

    @Logger.LogFunction(true)
    async FillMask(args: TAiRunArguments): Promise<TAiRunOutput> {

        const { data } = args;

        Assert.Var(data, 'data is required')

        const response = await axios.post(
            StringUtils.Url(this.InstanceApiUrl, 'run'),
            {
                input_data: data
            },
            TEXT_DEFAULT_HEADERS
        )
            .catch(error => {
                throw new HttpErrorInternalServerError(`Fill mask failed: ${error.response?.data?.message ?? error.message}`);
            })

        const fillmask = response.data.result.map((item: any) => {
            return {
                score: item.score,
                word: item.token_str,
                text: item.sequence
            }
        })

        return {
            fillmask
        }
    }

    @Logger.LogFunction(true)
    async KeywordExtraction(args: TAiRunArguments): Promise<TAiRunOutput> {

        const { data } = args;

        Assert.Var(data, 'data is required')

        const response = await axios.post(
            StringUtils.Url(this.InstanceApiUrl, 'run'),
            {
                input_data: data
            },
            TEXT_DEFAULT_HEADERS
        )
            .catch(error => {
                throw new HttpErrorInternalServerError(`Keyword extraction failed: ${error.response?.data?.message ?? error.message}`);
            })

        const keywords = response.data.result[0]

        return {
            keywords
        }
    }

    @Logger.LogFunction(true)
    async LanguageDetection(args: TAiRunArguments): Promise<TAiRunOutput> {

        const { data } = args;

        Assert.Var(data, 'data is required')

        const response = await axios.post(
            StringUtils.Url(this.InstanceApiUrl, 'run'),
            {
                input_data: data
            },
            TEXT_DEFAULT_HEADERS
        )
            .catch(error => {
                throw new HttpErrorInternalServerError(`Language detection failed: ${error.response?.data?.message ?? error.message}`);
            })

        const result = response.data.result[0]

        const language = {
            code: LangUtils.Convert(result.label, TEXT_LANGUAGE_DETECTION, TEXT_LANGUAGE_DETECTION_ISO),
            score: Math.max(0, parseFloat(result.score))
        }

        return { language }
    }

    @Logger.LogFunction(true)
    async ParaphraseDetection(args: TAiRunArguments): Promise<TAiRunOutput> {

        const { data } = args;
        const { params } = args as TStepRunAiTextParaphraseDetectionParams;

        Assert.Var(data, 'data is required')
        Assert.Var(params, 'params is required')
        Assert.Var(params.target, 'params.target is required')

        const response = await axios.post(
            StringUtils.Url(this.InstanceApiUrl, 'run'),
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

        const result = response.data.result

        const paraphrase = {
            source: result.source_sentence,
            target: result.target_sentence,
            score: Math.max(0, parseFloat(result.similarity_score))
        }

        return {
            paraphrase
        }
    }

    @Logger.LogFunction(true)
    async QuestionAnswering(args: TAiRunArguments): Promise<TAiRunOutput> {

        const { data } = args;
        const { params } = args as TStepRunAiTextQuestionAnsweringParams;

        Assert.Var(data, 'data is required')
        Assert.Var(params, 'params is required')
        Assert.Var(params.question, 'params.context is required')

        const response = await axios.post(
            StringUtils.Url(this.InstanceApiUrl, 'run'),
            {
                input_data: {
                    question: params.question,
                    context: data
                }
            },
            TEXT_DEFAULT_HEADERS
        )
            .catch(error => {
                throw new HttpErrorInternalServerError(`Question answering failed: ${error.response?.data?.message ?? error.message}`);
            })

        const result = response.data.result

        const answer = {
            text: result.answer,
            score: result.score,
            start: result.start,
            end: result.end
        }

        return {
            answer
        }
    }

    @Logger.LogFunction(true)
    async SentenceSimilarity(args: TAiRunArguments): Promise<TAiRunOutput> {

        const { data } = args;
        const { params } = args as TStepRunAiTextSentenceSimilarityParams;

        Assert.Var(data, 'data is required')
        Assert.Var(params, 'params is required')
        Assert.Var(params.sentences, 'params.sentences is required')

        const response = await axios.post(
            StringUtils.Url(this.InstanceApiUrl, 'run'),
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

        const similarity = response.data.result.map((item: any) => ({
            sentence: item.sentence2,
            score: Math.max(0, item.similarity),
            rank: parseInt(item.rank, 10)
        }));

        return {
            similarity
        }
    }

    @Logger.LogFunction(true)
    async SentimentAnalysis(args: TAiRunArguments): Promise<TAiRunOutput> {

        const { data } = args;
        const { params } = args as TStepRunAiTextSentimentAnalysisParams;

        Assert.Var(data, 'data is required')

        const _params = {
            top_k: params?.top ?? null
        }

        const response = await axios.post(
            StringUtils.Url(this.InstanceApiUrl, 'run'),
            {
                input_data: data,
                params: _params
            },
            TEXT_DEFAULT_HEADERS
        )
            .catch(error => {
                throw new HttpErrorInternalServerError(`Sentiment analysis failed: ${error.response?.data?.message ?? error.message}`);
            })

        const result = response.data.result[0]

        const sentiment = {
            label: result.label.toLowerCase(),
            score: Math.max(0, result.score)
        }

        return {
            sentiment
        }
    }

    @Logger.LogFunction(true)
    async Summarization(args: TAiRunArguments): Promise<TAiRunOutput> {

        const { data } = args;
        const { params } = args as TStepRunAiTextSummarizationParams;

        Assert.Var(data, 'data is required')
        Assert.Var(params, 'params is required')
        Assert.Var(params['max-length'], 'max-length is required')
        Assert.Var(params['min-length'], 'min-length is required')

        const response = await axios.post(
            StringUtils.Url(this.InstanceApiUrl, 'run'),
            {
                input_data: data,
                params
            },
            TEXT_DEFAULT_HEADERS
        )
            .catch(error => {
                throw new HttpErrorInternalServerError(`Summarization failed: ${error.response?.data?.message ?? error.message}`);
            })

        const result = response.data.result[0]

        const summary = {
            text: result.summary_text
        }

        return {
            summary
        }
    }

    // @Logger.LogFunction(true)
    // async Text2TextGeneration(args: TAiRunArguments): Promise<TAiRunOutput> {

    //     const { data } = args;

    //     Assert.Var(data, 'data is required')

    //     const _url = StringUtils.Url(
    //         this.InstanceApiUrl,
    //         this.InstanceName,
    //         'run'
    //     );

    //     const response = await axios.post(
    //         this.InstanceApiUrl,
    //         {
    //             input_data: data
    //         },
    //         TEXT_DEFAULT_HEADERS
    //     )
    //         .catch(error => {
    //             throw new HttpErrorInternalServerError(`Text2Text generation failed: ${error.response?.data?.message ?? error.message}`);
    //         })

    //     const result = response.data.result[0]

    //     return {
    //         text: result.generated_text
    //     }
    // }

    @Logger.LogFunction(true)
    async TextGeneration(args: TAiRunArguments): Promise<TAiRunOutput> {

        const { data } = args;
        const { params } = args as TStepRunAiTextTextGenerationParams

        Assert.Var(data, 'data is required')

        const response = await axios.post(
            StringUtils.Url(this.InstanceApiUrl, 'run'),
            {
                input_data: data,
                params: {
                    max_legth: params!['max-length'],
                    do_sample: params!['do-sample'],
                    temperature: params!['temperature']
                }
            },
            TEXT_DEFAULT_HEADERS
        )
            .catch(error => {
                throw new HttpErrorInternalServerError(`Text generation failed: ${error.response?.data?.message ?? error.message}`);
            })

        const result = response.data.result[0][0]

        return {
            text: result.generated_text
        }
    }

    @Logger.LogFunction(true)
    async Ner(args: TAiRunArguments): Promise<TAiRunOutput> {

        const { data } = args;
        const { params } = args as TStepRunAiTextNerParams;

        const DEFAULT = {
            grouped: true
        }

        Assert.Var(data, 'data is required')

        const response = await axios.post(
            StringUtils.Url(this.InstanceApiUrl, 'run'),
            {
                input_data: data,
                params: merge(DEFAULT, params)
            },
            TEXT_DEFAULT_HEADERS
        )
            .catch(error => {
                throw new HttpErrorInternalServerError(`Token classification failed: ${error.response?.data?.message ?? error.message}`);
            })

        const result = response.data.result[0]

        const entities = result.reduce((acc: any, item: any) => {
            acc.push({
                group: item.entity_group,
                score: item.score,
                word: item.word,
                start: item.start,
                end: item.end
            })
            return acc
        }, [])

        return {
            entities
        }
    }

    @Logger.LogFunction(true)
    async ToxicityDetection(args: TAiRunArguments): Promise<TAiRunOutput> {

        const { data } = args;
        const { params } = args as TStepRunAiTextToxicityDetectionParams;

        Assert.Var(data, 'data is required')

        const _params = {
            top_k: params?.top ?? null
        }

        const response = await axios.post(
            StringUtils.Url(this.InstanceApiUrl, 'run'),
            {
                input_data: data,
                params: _params
            },
            TEXT_DEFAULT_HEADERS
        )
            .catch(error => {
                throw new HttpErrorInternalServerError(`Toxicity detection failed: ${error.response?.data?.message ?? error.message}`);
            })

        const result = response.data.result[0];

        const toxicity = result.reduce((acc: any, item: any) => {
            acc[item.label] = parseFloat(item.score);
            return acc;
        }, {});

        return {
            toxicity
        }
    }

    @Logger.LogFunction(true)
    async Translation(args: TAiRunArguments): Promise<TAiRunOutput> {

        const { data } = args;
        const { params } = args as TStepRunAiTextTranslationParams;

        const DEFAULT = {
            src_lang: LANG_ISO.en_XX,
            tgt_lang: LANG_ISO.fr_XX
        }

        Assert.Var(data, 'data is required')
        Assert.Var(params, 'params is required')
        Assert.Var(params.source, 'source is required')
        Assert.Var(params.target, 'target is required')

        const _params = merge(DEFAULT, {
            src_lang: params.source,
            tgt_lang: params.target
        })

        const response = await axios.post(
            StringUtils.Url(this.InstanceApiUrl, 'run'),
            {
                input_data: data,
                params: _params
            },
            TEXT_DEFAULT_HEADERS
        )
            .catch(error => {
                throw new HttpErrorInternalServerError(`Translation request failed: ${error.response?.data?.message ?? error.message}`);
            })

        const result = response.data.result[0]

        const translation = {
            text: result.translation_text,
            source: params.source,
            target: params.target
        }

        return {
            translation
        }
    }

    @Logger.LogFunction(true)
    async ZeroShotClassification(args: TAiRunArguments): Promise<TAiRunOutput> {

        const { data } = args;
        const { params } = args as TStepRunAiTextZeroShotClassificationParams;

        Assert.Var(data, 'data is required')
        Assert.Var(params, 'params is required')
        Assert.Var(params.labels, 'labels is required')

        const _params = {
            candidate_labels: params.labels
        }

        const response = await axios.post(
            StringUtils.Url(this.InstanceApiUrl, 'run'),
            {
                input_data: data,
                params: _params
            },
            TEXT_DEFAULT_HEADERS
        )
            .catch(error => {
                throw new HttpErrorInternalServerError(`Zero-shot classification failed: ${error.response?.data?.message ?? error.message}`);
            })

        const result = response.data.result[0]

        const zeroshot = Object.fromEntries(
            result.labels.map((label: string, i: number) => [label, result.scores[i]])
        );

        return {
            zeroshot
        }
    }
}