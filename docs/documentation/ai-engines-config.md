---
description: "Metal:Middleware, ETL & AI in One Place. Empower your projects with a free open-source data transformation solution"
---

# AI Engines Configurations

This section outlines the setup requirements for various AI engines, including Tesseract.js, TensorFlow.js, and NLP.js. Each configuration specifies the necessary parameters to enable the models managed by the respective AI engines.

## Tesseract.js

Tesseract.js is a JavaScript library that brings the capabilities of the Tesseract OCR engine to the web by compiling it from C to JavaScript using WebAssembly. This enables optical character recognition (OCR) to be performed directly in the browser, facilitating faster text recognition and minimizing the need for server-side processing.

Tesseract.js supports over 100 languages, automatic text orientation, and script detection, making it a versatile tool for extracting text from images and videos in various languages and formats.

**Primary Parameters:**

| Parameter | Type   | Required | Description                                                                                                                                                                            | Metal Version                        |
| --------- | ------ | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| `engine`  | String | Y        | Set to `tesseractjs` for Tesseract.js                                                                                                                                                  | <Badge type="default" text="v0.1+" /> |
| `model`   | String | N        | Language to use for OCR, defaults to `eng` (see Lang Code: [Tesseract OCR Data Files](https://tesseract-ocr.github.io/tessdoc/Data-Files#data-files-for-version-400-november-29-2016)) | <Badge type="default" text="v0.1+" /> |

**Example Configuration:**

```yaml
ai-engines:
  my-ocr:
    engine: tesseractjs
    model: eng
```

**Output Object:**

| Key          | Type               | Description                                           |
| ------------ | ------------------ | ----------------------------------------------------- |
| `blocks`     | Array\<Block\>     | An array of text blocks detected in the image.        |
| `confidence` | Number             | The overall confidence level of the recognized text.  |
| `html`       | String             | The recognized text formatted as HTML.                |
| `lines`      | Array\<Line\>      | An array of lines detected in the image.              |
| `oem`        | String             | OCR engine mode used during OCR processing.           |
| `paragraphs` | Array\<Paragraph\> | An array of paragraphs detected in the image.         |
| `psm`        | String             | Page segmentation mode used during OCR processing.    |
| `symbols`    | Array\<Symbol\>    | An array of individual symbols detected in the image. |
| `text`       | String             | The recognized text from the image.                   |
| `version`    | String             | The version of the OCR engine.                        |
| `words`      | Array\<Word\>      | An array of individual words detected in the image.   |

## TensorFlow.js

TensorFlow.js is an open-source JavaScript library that allows you to develop machine learning and deep learning models directly in the browser. It is part of the TensorFlow ecosystem and enables running machine learning models, including neural networks, in JavaScript.

**Primary Parameters:**

| Parameter | Type   | Required | Description                             | Metal Version                        |
| --------- | ------ | -------- | --------------------------------------- | ------------------------------------ |
| `engine`  | String | Yes      | Set to `tensorflowjs` for TensorFlow.js | <Badge type="default" text="v0.1+" /> |
| `model`   | String | Yes      | Model to use (see: Models table)        | <Badge type="default" text="v0.1+" /> |

**Models:**

| Model Value      | Description       | Metal Version                        |
| ---------------- | ----------------- | ------------------------------------ |
| `image-classify` | To classify image | <Badge type="default" text="v0.1+" /> |

### `image-classify`

Image classification involves identifying and categorizing images into predefined classes.

**Example Configuration:**

```yaml
ai-engines:
  my-image-classifier:
    engine: tensorflowjs
    model: image-classify
```

**Output Object:**

```json
{
  "class": [
    {
      "className": "screw",
      "probability": 0.6480134725570679
    },
    {
      "className": "acoustic guitar",
      "probability": 0.31899121403694153
    },
    {
      "className": "electric guitar",
      "probability": 0.014988371171057224
    }
  ]
}
```

| Key                   | Type   | Description                              |
| --------------------- | ------ | ---------------------------------------- |
| `class`               | Array  | An array of classification results       |
| `class[].className`   | String | The name of the classified object        |
| `class[].probability` | Float  | The probability of the classified object |

## NLP.js

NLP.js is an open-source JavaScript library for natural language processing (NLP) and natural language understanding (NLU). It provides tools for various NLP tasks such as tokenization, part-of-speech tagging, named entity recognition, and sentiment analysis.

**Primary Parameters:**

| Parameter | Type   | Required | Description                      | Metal Version                        |
| --------- | ------ | -------- | -------------------------------- | ------------------------------------ |
| `engine`  | String | Yes      | Set to `nlpjs` for NLP.js        | <Badge type="default" text="v0.1+" /> |
| `model`   | String | Yes      | Model to use (see: Models table) | <Badge type="default" text="v0.1+" /> |

**Models:**

| Model Value  | Description               | Metal Version                        |
| ------------ | ------------------------- | ------------------------------------ |
| `sentiment`  | For sentiment analysis    | <Badge type="default" text="v0.1+" /> |
| `lang-guess` | For guessing the language | <Badge type="default" text="v0.1+" /> |

### `sentiment`

Sentiment analysis determines the sentiment expressed in a given text, typically categorizing sentiments as positive, negative, or neutral. This process is essential for understanding customer feedback, monitoring social media, and analyzing opinions and emotions in various applications.

**Optional Parameters:**

| Parameter | Type   | Required | Description                                                                                                                                                                                                           | Metal Version                        |
| --------- | ------ | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| `lang`    | String | No       | Defines the language of the text to be analyzed, defaults to `en`. For supported languages, see [NLP.js Sentiment Analysis Languages](https://github.com/axa-group/nlp.js/blob/master/docs/v3/sentiment-analysis.md). | <Badge type="default" text="v0.1+" /> |

**Example Configuration:**

```yaml
ai-engines:
  my-sentiment-analyzer:
    engine: nlpjs
    model: sentiment
    options:
      lang: en
```

**Output Object:**

```json
{
  "score": 1.125,
  "numWords": 4,
  "numHits": 3,
  "comparative": 0.28125,
  "type": "senticon",
  "language": "en"
}
```

| Key         | Type    | Description                                                  |
| ----------- | ------- | ------------------------------------------------------------ |
| score       | Float   | The overall sentiment score                                  |
| numWords    | Integer | The total number of words analyzed                           |
| numHits     | Integer | The number of words that were found in the sentiment lexicon |
| comparative | Float   | The comparative score, calculated as score/numWords          |
| type        | String  | The type of sentiment analysis method used                   |
| language    | String  | The language of the analyzed text                            |

### `lang-guess`

Language guessing can identify the language of a given text. This feature is useful for applications requiring language detection before processing text, such as multilingual chatbots, content categorization, and automatic language selection. It ensures that the appropriate language models and processing techniques are applied, enhancing the accuracy and relevance of the application's responses.

**Optional Parameters:**

| Parameter | Type   | Required | Description                                                                                                                                                                                                       | Metal Version                        |
| --------- | ------ | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| `accept`  | String | No       | Defines a list of languages to guess, separated by commas, defaults to `en`. For supported languages, see [NLP.js Language Support](https://github.com/axa-group/nlp.js/blob/master/docs/v3/language-support.md). | <Badge type="default" text="v0.1+" /> |

**Example Configuration:**

```yaml
ai-engines:
  my-language-guesser:
    engine: nlpjs
    model: guess-lang
    options:
      accept: en,fr
```

**Output Object:**

The returned object is an array of guessed languages with their respective scores:

```json
[
  {
    "alpha3": "eng",
    "alpha2": "en",
    "language": "English",
    "score": 1
  }
]
```

| Key      | Type   | Description                                      |
| -------- | ------ | ------------------------------------------------ |
| alpha3   | String | The three-letter ISO 639-2 code for the language |
| alpha2   | String | The two-letter ISO 639-1 code for the language   |
| language | String | The name of the language                         |
| score    | Float  | The confidence score for the language guess      |
