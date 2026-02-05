//
//
//
import { isObject, merge } from 'lodash-es'
//
import { Assert } from '../../../utils/Assert'
import { LangUtils } from '../../../utils/LangUtils'
import { Logger } from '../../../utils/Logger'
import { Utils } from '../../../utils/Utils'
import { AI_ENGINE } from '../@consts'
import type { TAiArguments, TAiOutput } from '../@types'
import { AiDocker } from '../AiDocker'
import { absAiEngine } from '../base/absAiEngine'
import type { IAiEngine } from '../base/IAiEngine'
import { LANG_ISO } from "../consts/LANG"
import { TEXT_LANGUAGE_DETECTION, TEXT_LANGUAGE_DETECTION_ISO, TEXT_TASK } from "../consts/TEXT"
import { TextEmotionDetectionDockerService, TextFillMaskDockerService, TextKeywordExtractionDockerService, TextLanguageDetectionDockerService, TextParaphraseDetectionDockerService, TextQuestionAnsweringDockerService, TextSentenceSimilarityDockerService, TextSentimentAnalysisDockerService, TextSummarizationDockerService, TextTextGenerationDockerService, TextTokenClassificationDockerService, TextToxicityDetectionDockerService, TextTranslationDockerService, TextZeroShotClassificationDockerService } from '../docker-services/TextDockerService'
import type { T_config_ai_engines_ai_engine } from "../types/T_config_ai_engines_ai_engine"
import type { TAiDockerService } from '../types/TAiDockerService'
import type {
    U_config_plans_plan_entity_run_ai_text_Params,
    U_config_plans_plan_entity_run_ai_text_emotion_detection_Params,
    U_config_plans_plan_entity_run_ai_text_paraphrase_detection_Params,
    U_config_plans_plan_entity_run_ai_text_question_answering_Params,
    U_config_plans_plan_entity_run_ai_text_sentence_similarity_Params,
    U_config_plans_plan_entity_run_ai_text_sentiment_analysis_Params,
    U_config_plans_plan_entity_run_ai_text_summarization_Params,
    U_config_plans_plan_entity_run_ai_text_text_generation_Params,
    U_config_plans_plan_entity_run_ai_text_toxicity_detection_Params,
    U_config_plans_plan_entity_run_ai_text_translation_Params,
    U_config_plans_plan_entity_run_ai_text_zero_shot_classification_Params
} from '../types/U_config_plans_plan_entity_run_ai_text_Params'


//
export class Text extends absAiEngine implements IAiEngine {

    AiEngineName = AI_ENGINE.TEXT

    AiDockerService: Record<string, TAiDockerService> = {}
    RunTask: Record<string, (args: TAiArguments) => Promise<TAiOutput>> = {}

    DEFAULT: U_config_plans_plan_entity_run_ai_text_Params = {
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
    async Prepare() {
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
            [`${AI_ENGINE.TEXT}-${TEXT_TASK.TEXT_GENERATION}`]: TextTextGenerationDockerService,
            [`${AI_ENGINE.TEXT}-${TEXT_TASK.TOXICITY_DETECTION}`]: TextToxicityDetectionDockerService,
            [`${AI_ENGINE.TEXT}-${TEXT_TASK.TRANSLATION}`]: TextTranslationDockerService,
            [`${AI_ENGINE.TEXT}-${TEXT_TASK.ZERO_SHOT_CLASSIFICATION}`]: TextZeroShotClassificationDockerService
        }

        this.RunTask = {
            [TEXT_TASK.EMOTION_DETECTION]: async (args: TAiArguments) => await this.EmotionDetection(args),
            [TEXT_TASK.FILL_MASK]: async (args: TAiArguments) => await this.FillMask(args),
            [TEXT_TASK.KEYWORD_EXTRACTION]: async (args: TAiArguments) => await this.KeywordExtraction(args),
            [TEXT_TASK.LANGUAGE_DETECTION]: async (args: TAiArguments) => await this.LanguageDetection(args),
            [TEXT_TASK.PARAPHRASE_DETECTION]: async (args: TAiArguments) => await this.ParaphraseDetection(args),
            [TEXT_TASK.QUESTION_ANSWERING]: async (args: TAiArguments) => await this.QuestionAnswering(args),
            [TEXT_TASK.SENTENCE_SIMILARITY]: async (args: TAiArguments) => await this.SentenceSimilarity(args),
            [TEXT_TASK.SENTIMENT_ANALYSIS]: async (args: TAiArguments) => await this.SentimentAnalysis(args),
            [TEXT_TASK.SUMMARIZATION]: async (args: TAiArguments) => await this.Summarization(args),
            [TEXT_TASK.TEXT_GENERATION]: async (args: TAiArguments) => await this.TextGeneration(args),
            [TEXT_TASK.NER]: async (args: TAiArguments) => await this.Ner(args),
            [TEXT_TASK.TOXICITY_DETECTION]: async (args: TAiArguments) => await this.ToxicityDetection(args),
            [TEXT_TASK.TRANSLATION]: async (args: TAiArguments) => await this.Translation(args),
            [TEXT_TASK.ZERO_SHOT_CLASSIFICATION]: async (args: TAiArguments) => await this.ZeroShotClassification(args)
        }
    }

    @Logger.LogFunction()
    async Init(aiName: string, aiConfig: T_config_ai_engines_ai_engine): Promise<void> {
        await super.Init(aiName, aiConfig)
        await this.Prepare()
        await AiDocker.StartService({
            InstanceName: aiName,
            ...this.AiDockerService[this.InstanceName] as TAiDockerService
        })

        Logger.Debug(`${Logger.Out} Successfully initialized Text instance '${this.InstanceName}'`)
    }

    @Logger.LogFunction(true)
    async Run(args: TAiArguments): Promise<TAiOutput> {
        const _sleep = AiDocker.Config['sleep']
        const _timeout = AiDocker.Config['timeout']

        Assert.Var<number>(_sleep, "server.ai-engines.sleep is not defined")
        Assert.Var<number>(_timeout, "server.ai-engines.timeout is not defined")

        const _args: U_config_plans_plan_entity_run_ai_text_Params = merge(this.DEFAULT, args)
        const { task } = _args

        Assert.Condition(Object.values(TEXT_TASK).includes(task as TEXT_TASK), `Invalid text task: ${task}`)

        await Utils.Wait(async () => await this.IsHealthy(), _sleep, _timeout)
        return this.RunTask[task]!(args)
    }

    @Logger.LogFunction(true)
    async EmotionDetection(args: TAiArguments): Promise<TAiOutput> {

        const { data } = args
        const { params } = args as U_config_plans_plan_entity_run_ai_text_emotion_detection_Params

        const _params = {
            top_k: params?.top ?? null
        }

        Assert.Var(data, 'data is required')

        const DEFAULT = {
            joy: 0,
            surprise: 0,
            neutral: 0,
            anger: 0,
            sadness: 0,
            fear: 0,
            disgust: 0
        }

        return this._postData(data, _params)
            .then((response) => {
                const result = response.data.result[0]
                Assert.Var(isObject(result), 'result is not an object')

                let emotion: any = {}

                if (!Array.isArray(result)) {
                    emotion = {
                        [result.label]: Number.parseFloat(result.score)
                    }
                }
                else {
                    emotion = result.reduce((acc: any, item: any) => {
                        acc[item.label] = Number.parseFloat(item.score)
                        return acc
                    }, {})
                }

                return {
                    emotion: merge(DEFAULT, emotion)
                }
            })
    }

    @Logger.LogFunction(true)
    async FillMask(args: TAiArguments): Promise<TAiOutput> {

        const { data } = args

        Assert.Var(data, 'data is required')

        return this._postData(data)
            .then((response) => {
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
            })
    }

    @Logger.LogFunction(true)
    async KeywordExtraction(args: TAiArguments): Promise<TAiOutput> {

        const { data } = args

        Assert.Var(data, 'data is required')

        return this._postData(data)
            .then((response) => {
                const keywords = response.data.result[0]
                return {
                    keywords
                }
            })
    }

    @Logger.LogFunction(true)
    async LanguageDetection(args: TAiArguments): Promise<TAiOutput> {

        const { data } = args

        Assert.Var(data, 'data is required')

        return this._postData(data)
            .then((response) => {
                const result = response.data.result[0]

                const language = {
                    code: LangUtils.Convert(result.label, TEXT_LANGUAGE_DETECTION, TEXT_LANGUAGE_DETECTION_ISO),
                    score: Math.max(0, Number.parseFloat(result.score))
                }

                return { language }
            })
    }

    @Logger.LogFunction(true)
    async ParaphraseDetection(args: TAiArguments): Promise<TAiOutput> {

        const { data } = args
        const { params } = args as U_config_plans_plan_entity_run_ai_text_paraphrase_detection_Params

        Assert.Var(data, 'data is required')
        Assert.Var(params, 'params is required')
        Assert.Var(params.target, 'params.target is required')

        const _data = {
            source_sentence: data,
            target_sentence: params.target
        }

        return this._postData(_data)
            .then((response) => {
                const { result } = response.data

                const paraphrase = {
                    source: result.source_sentence,
                    target: result.target_sentence,
                    score: Math.max(0, Number.parseFloat(result.similarity_score))
                }

                return {
                    paraphrase
                }
            })
    }

    @Logger.LogFunction(true)
    async QuestionAnswering(args: TAiArguments): Promise<TAiOutput> {

        const { data } = args
        const { params } = args as U_config_plans_plan_entity_run_ai_text_question_answering_Params

        Assert.Var(data, 'data is required')
        Assert.Var(params, 'params is required')
        Assert.Var(params.question, 'params.question is required')

        const _data = {
            question: params.question,
            context: data
        }

        return this._postData(_data)
            .then((response) => {
                const { result } = response.data

                const answer = {
                    text: result.answer,
                    score: result.score,
                    start: result.start,
                    end: result.end
                }

                return {
                    answer
                }
            })
    }

    @Logger.LogFunction(true)
    async SentenceSimilarity(args: TAiArguments): Promise<TAiOutput> {

        const { data } = args
        const { params } = args as U_config_plans_plan_entity_run_ai_text_sentence_similarity_Params

        Assert.Var(data, 'data is required')
        Assert.Var(params, 'params is required')
        Assert.Var(params.sentences, 'params.sentences is required')

        const _data = {
            source_sentence: data,
            sentences: params.sentences
        }

        return this._postData(_data)
            .then((response) => {
                const similarity = response.data.result.map((item: any) => ({
                    sentence: item.sentence2,
                    score: Math.max(0, item.similarity),
                    rank: Number.parseInt(item.rank, 10)
                }))

                return {
                    similarity
                }
            })
    }

    @Logger.LogFunction(true)
    async SentimentAnalysis(args: TAiArguments): Promise<TAiOutput> {

        const { data } = args
        const { params } = args as U_config_plans_plan_entity_run_ai_text_sentiment_analysis_Params

        Assert.Var(data, 'data is required')

        const _params = {
            top_k: params?.top ?? null
        }

        return this._postData(data, _params)
            .then((response) => {
                const result = response.data.result[0]

                const sentiment = {
                    label: result.label.toLowerCase(),
                    score: Math.max(0, result.score)
                }

                return {
                    sentiment
                }
            })
    }

    @Logger.LogFunction(true)
    async Summarization(args: TAiArguments): Promise<TAiOutput> {

        const { data } = args
        const { params } = args as U_config_plans_plan_entity_run_ai_text_summarization_Params

        Assert.Var(data, 'data is required')
        Assert.Var(params, 'params is required')
        Assert.Var(params['max-length'], 'max-length is required')
        Assert.Var(params['min-length'], 'min-length is required')

        return this._postData(data, params)
            .then((response) => {
                const result = response.data.result[0]

                const summary = {
                    text: result.summary_text
                }

                return {
                    summary
                }
            })
    }

    @Logger.LogFunction(true)
    async TextGeneration(args: TAiArguments): Promise<TAiOutput> {

        const { data } = args
        const { params } = args as U_config_plans_plan_entity_run_ai_text_text_generation_Params

        Assert.Var(data, 'data is required')

        const _params = {
            max_legth: params!['max-length'],
            do_sample: params!['do-sample'],
            temperature: params!.temperature
        }

        return this._postData(data, _params)
            .then((response) => {
                const result = response.data.result[0][0]

                return {
                    text: result.generated_text
                }
            })
    }

    @Logger.LogFunction(true)
    async Ner(args: TAiArguments): Promise<TAiOutput> {

        const { data } = args
        const { params } = args as U_config_plans_plan_entity_run_ai_text_Params

        const DEFAULT = {
            grouped: true
        }

        Assert.Var(data, 'data is required')

        const _params = merge(DEFAULT, params)

        return this._postData(data, _params)
            .then((response) => {
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
            })
    }

    @Logger.LogFunction(true)
    async ToxicityDetection(args: TAiArguments): Promise<TAiOutput> {

        const { data } = args
        const { params } = args as U_config_plans_plan_entity_run_ai_text_toxicity_detection_Params

        Assert.Var(data, 'data is required')

        const _params = {
            top_k: params?.top ?? null
        }

        return this._postData(data, _params)
            .then((response) => {
                const result = response.data.result[0]

                const toxicity = result.reduce((acc: any, item: any) => {
                    acc[item.label] = Number.parseFloat(item.score)
                    return acc
                }, {})

                return {
                    toxicity
                }
            })
    }

    @Logger.LogFunction(true)
    async Translation(args: TAiArguments): Promise<TAiOutput> {

        const { data } = args
        const { params } = args as U_config_plans_plan_entity_run_ai_text_translation_Params

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

        return this._postData(data, _params)
            .then((response) => {
                const result = response.data.result[0]

                const translation = {
                    text: result.translation_text,
                    source: params.source,
                    target: params.target
                }

                return {
                    translation
                }
            })
    }

    @Logger.LogFunction(true)
    async ZeroShotClassification(args: TAiArguments): Promise<TAiOutput> {

        const { data } = args
        const { params } = args as U_config_plans_plan_entity_run_ai_text_zero_shot_classification_Params

        Assert.Var(data, 'data is required')
        Assert.Var(params, 'params is required')
        Assert.Var(params.labels, 'labels is required')

        const _params = {
            candidate_labels: params.labels
        }

        return this._postData(data, _params)
            .then((response) => {
                const result = response.data.result[0]

                const zeroshot = Object.fromEntries(
                    result.labels.map((label: string, i: number) => [label, result.scores[i]])
                )

                return {
                    zeroshot
                }
            })
    }
}