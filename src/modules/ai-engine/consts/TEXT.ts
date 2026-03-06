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
	BG = "bg_BG",
	DE = LANG_ISO.de_DE,
	EL = "el_GR",
	EN = LANG_ISO.en_XX,
	ES = LANG_ISO.es_XX,
	FR = LANG_ISO.fr_XX,
	HI = LANG_ISO.hi_IN,
	IT = LANG_ISO.it_IT,
	JA = LANG_ISO.ja_XX,
	NL = LANG_ISO.nl_XX,
	PL = LANG_ISO.pl_PL,
	PT = LANG_ISO.pt_XX,
	RU = LANG_ISO.ru_RU,
	SW = LANG_ISO.sw_KE,
	TH = LANG_ISO.th_TH,
	TR = LANG_ISO.tr_TR,
	UR = LANG_ISO.ur_PK,
	VI = LANG_ISO.vi_VN,
	ZH = LANG_ISO.zh_CN,
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
