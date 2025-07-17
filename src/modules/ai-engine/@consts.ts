
//
//  config types
//

export enum AI_ENGINE2 {
    OCR = "ocr",
//
    TEXT = "text",
    IMAGE = "hf-image",
    DOCUMENT = "hf-document"
}

/////////////
/////////////
/////////////
/////////////
/////////////

export enum AI_ENGINE {
    NLP_JS = "nlpjs",
    TENSORFLOW_JS = "tensorflowjs",
    TESSERACT_JS = "tesseractjs"
}

// nlpjs
export enum NLP_JS_MODEL {
    SENTIMENT = "sentiment",
    GUESS_LANG = "guess-lang"
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
    YID = 'yid'
}

// tensorflowjs
export enum TENSORFLOW_JS_MODEL {
    IMAGE_CLASSIFY = "image-classify"
}

