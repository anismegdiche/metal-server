 
//
//
//
//
//
import { Logger } from '../lib/Logger'
import { Config } from '../server/Config'
import { Helper } from '../lib/Helper'
import { TJson } from '../types/TJson'
import { IAiEngine } from '../types/IAiEngine'
// AI Engines
import { TesseractJs } from '../ai-engine/TesseractJs'
import { TensorFlowJs } from '../ai-engine/TensorFlowJs'
import { NlpJs } from '../ai-engine/NlpJs'
import { JsonHelper } from '../lib/JsonHelper'

//
//  config types
//
export enum AI_ENGINE {
    NLP_JS = "nlpjs",
    TENSORFLOW_JS = "tensorflowjs",
    TESSERACT_JS = "tesseractjs"
}

// export default AI_ENGINE

export type TConfigAiEngineDefault = {
    engine: AI_ENGINE
    model: string
    options: TJson
}

// nlpjs
export enum NLP_JS_MODEL {
    SENTIMENT = "sentiment",
    GUESS_LANG = "guess-lang"
}

export type TConfigAiEngineNlpJsSentimentOptions = {
    lang: string
}

export type TConfigAiEngineNlpJsGuessLangOptions = {
    accept: string[] | string
    limit: number | undefined
}

export type TConfigAiEngineNlpJs = TConfigAiEngineDefault & {
    model: NLP_JS_MODEL
    options: TConfigAiEngineNlpJsSentimentOptions | TConfigAiEngineNlpJsGuessLangOptions
}

// tesseractjs
export enum TESSERACT_JS_MODEL {
    AFR = 'afr',
    AMH = 'amh',
    ARA = 'ara',
    ASM = 'asm',
    AZE = 'aze',
    AZE_CYRL = 'aze_cyrl',
    BEL = 'bel',
    BEN = 'ben',
    BOD = 'bod',
    BOS = 'bos',
    BUL = 'bul',
    CAT = 'cat',
    CEB = 'ceb',
    CES = 'ces',
    CHI_SIM = 'chi_sim',
    CHI_TRA = 'chi_tra',
    CHR = 'chr',
    CYM = 'cym',
    DAN = 'dan',
    DEU = 'deu',
    DZO = 'dzo',
    ELL = 'ell',
    ENG = 'eng',
    ENM = 'enm',
    EPO = 'epo',
    EST = 'est',
    EUS = 'eus',
    FAS = 'fas',
    FIN = 'fin',
    FRA = 'fra',
    FRK = 'frk',
    FRM = 'frm',
    GLE = 'gle',
    GLG = 'glg',
    GRC = 'grc',
    GUJ = 'guj',
    HAT = 'hat',
    HEB = 'heb',
    HIN = 'hin',
    HRV = 'hrv',
    HUN = 'hun',
    IKU = 'iku',
    IND = 'ind',
    ISL = 'isl',
    ITA = 'ita',
    ITA_OLD = 'ita_old',
    JAV = 'jav',
    JPN = 'jpn',
    KAN = 'kan',
    KAT = 'kat',
    KAT_OLD = 'kat_old',
    KAZ = 'kaz',
    KHM = 'khm',
    KIR = 'kir',
    KOR = 'kor',
    KUR = 'kur',
    LAO = 'lao',
    LAT = 'lat',
    LAV = 'lav',
    LIT = 'lit',
    MAL = 'mal',
    MAR = 'mar',
    MKD = 'mkd',
    MLT = 'mlt',
    MSA = 'msa',
    MYA = 'mya',
    NEP = 'nep',
    NLD = 'nld',
    NOR = 'nor',
    ORI = 'ori',
    PAN = 'pan',
    POL = 'pol',
    POR = 'por',
    PUS = 'pus',
    RON = 'ron',
    RUS = 'rus',
    SAN = 'san',
    SIN = 'sin',
    SLK = 'slk',
    SLV = 'slv',
    SPA = 'spa',
    SPA_OLD = 'spa_old',
    SQI = 'sqi',
    SRP = 'srp',
    SRP_LATN = 'srp_latn',
    SWA = 'swa',
    SWE = 'swe',
    SYR = 'syr',
    TAM = 'tam',
    TEL = 'tel',
    TGK = 'tgk',
    TGL = 'tgl',
    THA = 'tha',
    TIR = 'tir',
    TUR = 'tur',
    UIG = 'uig',
    UKR = 'ukr',
    URD = 'urd',
    UZB = 'uzb',
    UZB_CYRL = 'uzb_cyrl',
    VIE = 'vie',
    YID = 'yid',
}

export type TConfigAiEngineTesseractJs = Partial<TConfigAiEngineDefault> & {
    model: TESSERACT_JS_MODEL
}

// tensorflowjs
export enum TENSORFLOW_JS_MODEL {
    IMAGE_CLASSIFY = "image-classify"
}

export type TConfigAiEngineTensorFlowJsImageClassifyOptions = {
    threshold?: number
}

export type TConfigAiEngineTensorFlowJs = TConfigAiEngineDefault & {
    model: TENSORFLOW_JS_MODEL
    options: TConfigAiEngineTensorFlowJsImageClassifyOptions
}
//
//
//
export class AiEngine {

    static AiEngineConfigurations: Record<string, TConfigAiEngineDefault> = {}
    static AiEngine: Record<string, IAiEngine> = {}

    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    static #NewAiEngineTypeCaseMap: Record<AI_ENGINE, Function> = {
        [AI_ENGINE.TESSERACT_JS]: (aiEngineInstanceName: string, AiEngineConfig: TConfigAiEngineTesseractJs) => new TesseractJs(aiEngineInstanceName, AiEngineConfig),
        [AI_ENGINE.TENSORFLOW_JS]: (aiEngineInstanceName: string, AiEngineConfig: TConfigAiEngineTensorFlowJs) => new TensorFlowJs(aiEngineInstanceName, AiEngineConfig),
        [AI_ENGINE.NLP_JS]: (aiEngineInstanceName: string, AiEngineConfig: TConfigAiEngineNlpJs) => new NlpJs(aiEngineInstanceName, AiEngineConfig)
    }

    static async Init(): Promise<void> {
        AiEngine.AiEngineConfigurations = Config.Get("ai-engines")
    }

    static async CreateAll(): Promise<void> {
        await Promise.all(
            Object.entries(AiEngine.AiEngineConfigurations).map(async ([aiEngineInstanceName, aiEngineParams]) => {
                await AiEngine.Create(aiEngineInstanceName, aiEngineParams)
            })
        )
    }

    static async Create(aiEngineInstanceName: string, AiEngineConfig: TConfigAiEngineDefault): Promise<void> {
        Logger.Debug(`${Logger.In} Starting '${aiEngineInstanceName}' with params '${JsonHelper.Stringify(AiEngineConfig)}'`)
        if (!(AiEngineConfig.engine in AiEngine.#NewAiEngineTypeCaseMap)) {
            Logger.Error(`Unknown engine type: ${AiEngineConfig.engine}`)
            return
        }
        AiEngine.AiEngine[aiEngineInstanceName] = AiEngine.#NewAiEngineTypeCaseMap[AiEngineConfig.engine](aiEngineInstanceName, AiEngineConfig) ?? Helper.CaseMapNotFound(AiEngineConfig.engine)
        await AiEngine.AiEngine[aiEngineInstanceName].Init()
        Logger.Debug(`${Logger.Out} AI Engine '${aiEngineInstanceName}' created`)
    }

    static async Run(aiEngineInstanceName: string, input: string) {
        return await AiEngine.AiEngine[aiEngineInstanceName].Run(input)
    }
}
