//
//
//
import { LANG_ISO } from "./LANG"

//
export enum TEXT_LANGUAGE_DETECTION {
	AR = "ar",
	BG = "bg",
	DE = "de",
	EL = "el",
	EN = "en",
	ES = "es",
	FR = "fr",
	HI = "hi",
	IT = "it",
	JA = "ja",
	NL = "nl",
	PL = "pl",
	PT = "pt",
	RU = "ru",
	SW = "sw",
	TH = "th",
	TR = "tr",
	UR = "ur",
	VI = "vi",
	ZH = "zh",
}

export enum TEXT_LANGUAGE_DETECTION_ISO {
	AR = LANG_ISO.ar_AR,
	BG = LANG_ISO.bg_BG,
	DE = LANG_ISO.de_DE,
	EL = LANG_ISO.el_GR,
	EN = LANG_ISO.en_EN,
	ES = LANG_ISO.es_ES,
	FR = LANG_ISO.fr_FR,
	HI = LANG_ISO.hi_IN,
	IT = LANG_ISO.it_IT,
	JA = LANG_ISO.ja_JP,
	NL = LANG_ISO.nl_NL,
	PL = LANG_ISO.pl_PL,
	PT = LANG_ISO.pt_PT,
	RU = LANG_ISO.ru_RU,
	SW = LANG_ISO.sw_KE,
	TH = LANG_ISO.th_TH,
	TR = LANG_ISO.tr_TR,
	UR = LANG_ISO.ur_PK,
	VI = LANG_ISO.vi_VN,
	ZH = LANG_ISO.zh_CN,
}

export enum TEXT_TRANSLATION {
	ar_AR = LANG_ISO.ar_AR,
	bg_BG = LANG_ISO.bg_BG,
	zh_CN = LANG_ISO.zh_CN,
	zh_TW = LANG_ISO.zh_TW,
	de_DE = LANG_ISO.de_DE,
	en_XX = LANG_ISO.en_XX,
	fr_XX = LANG_ISO.fr_XX,
	ja_XX = LANG_ISO.ja_XX,
	ko_KR = LANG_ISO.ko_KR,
	pt_XX = LANG_ISO.pt_XX,
	ru_RU = LANG_ISO.ru_RU,
	es_XX = LANG_ISO.es_XX,
}

export enum TEXT_TRANSLATION_ISO {
	ar_AR = LANG_ISO.ar_AR,
	bg_BG = LANG_ISO.bg_BG,
	zh_CN = LANG_ISO.zh_CN,
	zh_TW = LANG_ISO.zh_TW,
	de_DE = LANG_ISO.de_DE,
	en_XX = LANG_ISO.en_EN,
	fr_XX = LANG_ISO.fr_FR,
	ja_XX = LANG_ISO.ja_JP,
	ko_KR = LANG_ISO.ko_KR,
	pt_XX = LANG_ISO.pt_PT,
	ru_RU = LANG_ISO.ru_RU,
	es_XX = LANG_ISO.es_ES,
}

/**
 * Available text processing tasks
 */
export enum TEXT_TASK {
	/** Emotion detection */
	EMOTION_DETECTION = "emotion-detection",

	/** Feature extraction */
	FEATURE_EXTRACTION = "feature-extraction",

	/** Fill in the blank/masked language modeling */
	FILL_MASK = "fill-mask",

	/** Keyword extraction */
	KEYWORD_EXTRACTION = "keyword-extraction",

	/** Language detection */
	LANGUAGE_DETECTION = "language-detection",

	/** Paraphrase detection */
	PARAPHRASE_DETECTION = "paraphrase-detection",

	/** Question answering */
	QUESTION_ANSWERING = "question-answering",

	/** Sentence similarity */
	SENTENCE_SIMILARITY = "sentence-similarity",

	/** Sentiment analysis of text */
	SENTIMENT_ANALYSIS = "sentiment-analysis",

	/** Text summarization */
	SUMMARIZATION = "summarization",

	/** Text generation */
	TEXT_GENERATION = "text-generation",

	/** Named Entity Recognition (NER) */
	NER = "ner",

	/** Toxicity detection */
	TOXICITY_DETECTION = "toxicity-detection",

	/** Text translation */
	TRANSLATION = "translation",

	/** Zero-shot classification */
	ZERO_SHOT_CLASSIFICATION = "zero-shot-classification",
	SUMMARIZE = "summarize",
}
