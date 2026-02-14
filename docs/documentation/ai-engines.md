---
description: "Metal:Middleware, ETL & AI in One Place. Empower your projects with a free open-source data transformation solution"
---

# AI Engines Configurations

This section outlines the AI engines and their supported tasks in the Metal platform. The AI module provides a unified interface for various AI tasks across different domains including OCR, text processing, image analysis, and audio processing.

## Server Configuration

To enable AI capabilities in your Metal server, configure the following in your server configuration file:

**Exmaple:**

```yaml
server:
  # ... other server configurations ...
  ai-engines:
    docker-url: unix:///var/run/docker.sock
    engines-url: http://127.0.0.1:5000
```

::: tip ℹ️ NOTE
For complete configuration, please see [AI Engines Server Configuration](config-yml#ai-engines)
:::

## Engine Images build

Upon initialization, Metal validates the availability of AI Engine images and automatically provisions any missing image.

To manually pre-build these images before starting the server, execute the following command; this process will generate the required images and exit upon completion.

```bash
npm run prod:build-all-images
```

## Engines

Metal supports multiple AI engines (text, image, audio, ocr) that can be run as separate services.
When using `run` command in plans, you can specify the AI engine using `ai` parameter.

Available AI engines:

| Value   | Description      |
| ------- | ---------------- |
| `text`  | Text Processing  |
| `image` | Image Processing |
| `audio` | Audio Processing |
| `ocr`   | OCR Processing   |

**Example Service Configuration**

Each AI service follows this basic configuration structure:

```yaml
version: "0.5"

server:
  ...
  ai-engines:
    engines-url: http://127.0.0.1:5000
```

## Tasks Configuration

Each AI Engine comes with a set of tasks that can be configured in `task` within the `run` command in plan.

### `ocr` (Optical Character Recognition)

OCR (Optical Character Recognition) is an AI Engine that can be used to extract text from images.

**Tasks**:
| Task Name | Description |
| ----------------- | ------------------------ |
| `image-to-string` | Extract text from images |

#### `image-to-string`

Extract text from images with support for multiple languages.

**Supported Languages:** Arabic (`ar_AR`), Chinese (Simplified) (`zh_CN`), Chinese (Traditional) (`zh_TW`), German (`de_DE`), English (`en_XX`), French (`fr_XX`), Italian (`it_IT`), Japanese (`ja_XX`), Korean (`ko_KR`), Portuguese (`pt_XX`), Russian (`ru_RU`), Spanish (`es_XX`)

**Parameters**:

| Parameter | Type   | Required | Description                        | Default Value |
| --------- | ------ | -------- | ---------------------------------- | ------------- |
| `lang`    | string | Y        | Language to use for OCR processing | `en_XX`       |

**Example:**

> ```yaml
> plans:
>   my-plan:
>     my-entity:
>     ...
>       - run:
>           ai: ocr
>           task: image-to-string
>           params:
>             lang: en_XX
>           input: content
>           output:
>             text: ${{ $result.ocr.text }}
> ```

**Output:**

```json
{
  "ocr": {
    "text": "This is a sample text extracted from the image using OCR technology.",
    "lang": "en_XX"
  }
}
```

`ocr` object contains the following properties:

| Property | Type   | Description                                   |
| -------- | ------ | --------------------------------------------- |
| `text`   | string | The extracted text from the image             |
| `lang`   | string | The language ISO code used for OCR processing |

### `text` (Text Processing)

Text Processing is an AI Engine that provides various natural language processing capabilities.

::: tip ℹ️ NOTE
In the plan, `run.input` is expected to be a string.
:::

**Tasks**:

| Task Name                  | Description                       |
| -------------------------- | --------------------------------- |
| `emotion-detection`        | Detect emotions in text           |
| `feature-extraction`       | Extract features from text        |
| `fill-mask`                | Predict masked words in text      |
| `keyword-extraction`       | Extract important keywords        |
| `language-detection`       | Detect the language of the text   |
| `paraphrase-detection`     | Detect paraphrased text           |
| `question-answering`       | Answer questions based on context |
| `sentence-similarity`      | Compare sentence similarity       |
| `sentiment-analysis`       | Analyze sentiment in text         |
| `summarization`            | Generate text summaries           |
| `text-generation`          | Generate new text                 |
| `token-classification`     | Classify tokens (e.g., NER)       |
| `toxicity-detection`       | Detect toxic content              |
| `translation`              | Text translation                  |
| `zero-shot-classification` | Zero-shot classification          |

#### `emotion-detection`

Detect emotions in text.

**Parameters**

| Parameter | Type         | Default value | Required | Description                      |
| --------- | ------------ | ------------- | -------- | -------------------------------- |
| `top`     | number (1-7) | `7`           | N        | Number of top emotions to return |

**Example**

> ```yaml
> plans:
>   my-plan:
>     my-entity:
>     ...
>       - run:
>           ai: text
>           task: emotion-detection
>           params:
>             top: 7
>           input: content # "I'm not confident with this project!"
>           output:
>             positive: ${{ $result.emotion.joy ?? 0 }}
>             negative: ${{ $result.emotion.anger ?? 0 }}
> ```

**Output**

```json
{
  "emotion": {
    "joy": 0.9658,
    "surprise": 0.0231,
    "neutral": 0.0065,
    "anger": 0.0017,
    "sadness": 0.0013,
    "fear": 0.0011,
    "disgust": 0.0005
  }
}
```

`emotion` object contains the following properties:

| Property   | Type   | Description                    |
| ---------- | ------ | ------------------------------ |
| `joy`      | number | Probability score for joy      |
| `surprise` | number | Probability score for surprise |
| `neutral`  | number | Probability score for neutral  |
| `anger`    | number | Probability score for anger    |
| `sadness`  | number | Probability score for sadness  |
| `fear`     | number | Probability score for fear     |
| `disgust`  | number | Probability score for disgust  |

#### `fill-mask`

Predict words in text using a placeholder `[MASK]`.

**Example**

> ```yaml
> plans:
>   my-plan:
>     my-entity:
>     ...
>       - run:
>           ai: text
>           task: fill-mask
>           input: "${{ $row.content }} [MASK]." # "The capital of France is [MASK]."
>           output:
>             word: ${{ $result.fillmask[0].word }}
>             text: ${{ $result.fillmask[0].text }}
> ```

**Output**

```json
{
  "fillmask": [
    {
      "score": 0.9,
      "word": "paris",
      "text": "the capital of france is paris."
    },
    {
      "score": 0.3,
      "word": "nice",
      "text": "the capital of france is nice."
    }
  ]
}
```

`fillmask` is an array of JSON with the following properties:

| Property | Type   | Description                        |
| -------- | ------ | ---------------------------------- |
| `score`  | number | Confidence score of the prediction |
| `word`   | string | The predicted word                 |
| `text`   | string | The complete text with prediction  |

#### `keyword-extraction`

Extract important keywords from text.

**Example**

> ```yaml
> plans:
>   my-plan:
>     my-entity:
>     ...
>       - run:
>           ai: text
>           task: keyword-extraction
>           input: content # The Importance of Testing in the Medical Field and Product Development
>           output:
>             keywords: ${{ $result.keywords.join(',') }}
> ```

**Output**

```json
{
  "keywords": ["testing", "medical field", "product development"]
}
```

| Property   | Type  | Description                                             |
| ---------- | ----- | ------------------------------------------------------- |
| `keywords` | array | an array of strings representing the extracted keywords |

#### `language-detection`

Detect the language of the text.

**Supported Languages**: Arabic (`ar_AR`), Bulgarian (`bg_BG`), Chinese (Simplified) (`zh_CN`), German (`de_DE`), English (`en_XX`), French (`fr_XX`), Italian (`it_IT`), Japanese (`ja_XX`), Portuguese (`pt_XX`), Russian (`ru_RU`), Spanish (`es_XX`), Greek (`el_GR`), Hindi (`hi_IN`), Dutch (`nl_XX`), Polish (`pl_PL`), Swahili (`sw_KE`), Thai (`th_TH`), Turkish (`tr_TR`), Urdu (`ur_PK`), Vietnamese (`vi_VN`)

**Example**

> ```yaml
> plans:
>   my-plan:
>     my-entity:
>     ...
>       - run:
>           ai: text
>           task: language-detection
>           input: content # "Hallo, wie geht es dir?"
>           output:
>             lang_code: ${{ result.language.code }}
> ```

**Output**

```json
{
  "language": {
    "code": "de_DE",
    "score": 0.9953
  }
}
```

`language` object contains the following properties:

| Property | Type   | Description                       |
| -------- | ------ | --------------------------------- |
| `code`   | string | ISO language code (e.g., 'de_DE') |
| `score`  | number | Confidence score of the detection |

#### `paraphrase-detection`

Detect if two texts are paraphrases.

**Parameters**

| Parameter | Type   | Description                 |
| --------- | ------ | --------------------------- |
| `target`  | string | The text to compare against |

**Example**

> ```yaml
> plans:
>   my-plan:
>     my-entity:
>     ...
>       - run:
>           ai: text
>           task: paraphrase-detection
>           input: content # "The quick brown fox jumps over the lazy dog"
>           params:
>             target: "A fast brown fox leaps over a sleepy dog"
>           output:
>             score: ${{ result.paraphrase.score }}
> ```

**Output**

```json
{
  "paraphrase": {
    "source": "The quick brown fox jumps over the lazy dog",
    "target": "A fast brown fox leaps over a sleepy dog",
    "score": 0.8477
  }
}
```

`paraphrase` object contains the following properties:

| Property | Type   | Description                                 |
| -------- | ------ | ------------------------------------------- |
| `source` | string | The original input text                     |
| `target` | string | The text being compared against             |
| `score`  | number | Numerical score of similarity between texts |

#### `question-answering`

Answer questions based on a given context.

**Parameters**

| Parameter  | Type   | Description            |
| ---------- | ------ | ---------------------- |
| `question` | string | The question to answer |

**Example**

> ```yaml
> plans:
>   my-plan:
>     my-entity:
>     ...
>       - run:
>           ai: text
>           task: question-answering
>           input: question # Paris is the capital of France. It is known for its beautiful architecture and rich history.
>           params:
>             question: What is the capital of France?
>           output:
>             answer: ${{ $result.answer.text }}
>             score: ${{ $result.answer.score }}
> ```

**Output**

```json
{
  "answer": {
    "text": "Paris",
    "score": 0.9995,
    "start": 0,
    "end": 5
  }
}
```

`answer` object contains the following properties:

| Property | Type   | Description                                 |
| -------- | ------ | ------------------------------------------- |
| `text`   | string | The extracted answer from the context       |
| `score`  | number | Confidence score of the answer (0.0 to 1.0) |
| `start`  | number | Start position of the answer in the context |
| `end`    | number | End position of the answer in the context   |

#### `sentence-similarity`

Compare the similarity between a source sentence and a list of target sentences.

**Parameters**

| Parameter   | Type     | Description                                |
| ----------- | -------- | ------------------------------------------ |
| `sentences` | string[] | Array of sentences to compare against      |
| `top`       | number   | (Optional) Number of top results to return |

**Example**

> ```yaml
> plans:
>   my-plan:
>     my-entity:
>     ...
>       - run:
>           ai: text
>           task: sentence-similarity
>           input: source_sentence # "That is a happy person"
>           params:
>             sentences:
>               - That is a happy dog
>               - That is a very happy person
>               - Today is a sunny day
>           output:
>             score1: ${{ $result.similarity[0].score }}
>             score2: ${{ $result.similarity[1].score }}
> ```

**Output**

```json
{
  "similarity": [
    {
      "sentence": "That is a very happy person",
      "score": 0.9429,
      "rank": 1
    },
    {
      "sentence": "That is a happy dog",
      "score": 0.6946,
      "rank": 2
    }
  ]
}
```

The `similarity` output is an array of JSON with the following properties:

| Property   | Type   | Description                                      |
| ---------- | ------ | ------------------------------------------------ |
| `sentence` | string | The target sentence being compared against       |
| `score`    | number | Similarity score between sentences (0.0 to 1.0)  |
| `rank`     | number | Rank of the similarity compared to other matches |

#### `sentiment-analysis`

Analyze sentiment in text.

**Example**

> ```yaml
> plans:
>   my-plan:
>     my-entity:
>     ...
>       - run:
>           ai: text
>           task: sentiment-analysis
>           input: content  # I love using this service!
>           output:
>             sentiment_label: ${{ $result.sentiment.label }}
>             sentiment_score: ${{ $result.sentiment.score }}
> ```

**Output**

```json
{
  "sentiment": {
    "label": "positive",
    "score": 0.6533908843994141
  }
}
```

**Output Data**

`sentiment` object contains the following properties:

| Key     | Type   | Description                                                                           |
| ------- | ------ | ------------------------------------------------------------------------------------- |
| `label` | string | The sentiment label (`very negative`,`negative`,`neutral`,`positive`,`very positive`) |
| `score` | number | Confidence score of the sentiment                                                     |

#### `summarization`

Generate text summaries.

**Parameters**

| Parameter    | Type   | Description                   |
| ------------ | ------ | ----------------------------- |
| `min-length` | number | Minimum length of the summary |
| `max-length` | number | Maximum length of the summary |

**Example**

> ```yaml
> plans:
>   my-plan:
>     my-entity:
>     ...
>       - run:
>           ai: text
>           task: summarization
>           params:
>             min-length: 10
>             max-length: 20
>           input: long_text_content # "Artificial intelligence is intelligence demonstrated by machines, as opposed to natural intelligence displayed by animals including humans. AI research has been defined as the field of study of intelligent agents, which refers to any system that perceives its environment and takes actions that maximize its chance of achieving its goals."
>           output:
>             summary: ${{ $result.summary.text }}
> ```

**Output**

```json
{
  "summary": {
    "text": "AI is intelligence demonstrated by machines, as opposed to natural intelligence displayed by animals including humans."
  }
}
```

**Output Data**

`summary` object contains the following properties:

| Key    | Type   | Description                |
| ------ | ------ | -------------------------- |
| `text` | string | The generated summary text |

#### `text-generation`

Generate new text.

**Parameters**

| Parameter     | Type    | Description                                               |
| ------------- | ------- | --------------------------------------------------------- |
| `max-length`  | number  | Maximum length of generated text (in tokens)              |
| `do-sample`   | boolean | Whether to use sampling (true) or greedy decoding (false) |
| `temperature` | float   | Controls randomness in generation (> 0.0 to 2.0)          |

**Typical guidelines for `temperature`:**

- **Low temperature (e.g., 0.2–0.5):** very focused, predictable, and fact‑like outputs; good for code, summaries, or technical content.
- **Medium temperature (e.g., 0.5–0.9):** good balance between coherence and creativity; usually “best” for general writing and chat.
- **High temperature (≥1.0-2.0):** much more random and creative, but also more likely to be incoherent, off‑topic, or nonsensical.

**Example**

> ```yaml
> plans:
>   my-plan:
>     my-entity:
>     ...
>       - run:
>           ai: text
>           task: text-generation
>           params:
>             max-length: 50
>             do-sample: true
>             temperature: 0.9
>           input: content # "The capital of France is"
>           output:
>             generated: text
> ```

**Output**

```json
{
  "generated": {
    "text": "The capital of France is Paris, a beautiful city known for its iconic Eiffel Tower and rich cultural heritage."
  }
}
```

**Output Data**

| Key    | Type   | Description        |
| ------ | ------ | ------------------ |
| `text` | string | The generated text |

#### `ner`

Multilingual Named Entity Recognition (NER) identifies and classifies specific entities within text.

**Supported languages**: German (`de_XX`), English (`en_XX`), Spanish (`es_XX`), French (`fr_XX`), Italian (`it_XX`), Dutch (`nl_XX`), Polish (`pl_XX`), Portuguese (`pt_XX`), and Russian (`ru_XX`).

**Parameters**

| Parameter | Type    | Description                                               |
| --------- | ------- | --------------------------------------------------------- |
| `grouped` | boolean | Whether to group entities that are part of the same token |

**Example**

```yaml
plans:
  my-plan:
    my-entity:
    ...
      - run:
          ai: text
          task: ner
          params:
            grouped: true
          input: content # "My name is John and I work at Google in New York."
          output:
            entities: entities
```

**Output**

```json
[
  {
    "group": "PER",
    "score": 0.998,
    "word": "John",
    "start": 11,
    "end": 15
  },
  {
    "group": "ORG",
    "score": 0.995,
    "word": "Google",
    "start": 30,
    "end": 36
  },
  {
    "group": "LOC",
    "score": 0.999,
    "word": "New York",
    "start": 40,
    "end": 48
  }
]
```

**Output Data**

| Key     | Type   | Description                           |
| ------- | ------ | ------------------------------------- |
| `group` | string | The entity type (e.g., PER, ORG, LOC) |
| `score` | number | Confidence score of the prediction    |
| `word`  | string | The extracted entity text             |
| `start` | number | Start position in the original text   |
| `end`   | number | End position in the original text     |

`group` tags can be :

- if `grouped` = `true`
  - `PER`: Person
  - `ORG`: Organization
  - `LOC`: Geographical location
  - `MISC`: Miscellaneous

- if `grouped` = `false`
  - `B-PER`: Beginning of a person name
  - `I-PER`: Inside (continuation) of a person name
  - `B-ORG`: Beginning of an organization name
  - `I-ORG`: Inside an organization name
  - `B-LOC`: Beginning of a location name
  - `I-LOC`: Inside a location name
  - `B-MISC`: Beginning of a miscellaneous entity
  - `I-MISC`: Inside a miscellaneous entity
  - `O`: Outside any named entity

#### `toxicity-detection`

Detect toxic content in text with the following types of toxicity:

- `toxic`: Content that is generally rude, disrespectful, or unreasonable, likely to make someone leave a discussion
- `severe_toxic`: Extremely hostile or hateful language that goes beyond general toxicity, often involving intense aggression or dehumanization
- `obscene`: Use of profanity, curse words, or vulgar language that may be offensive in formal or public contexts
- `threat`: Statements that convey intent to cause harm or danger to an individual or group, whether direct or indirect
- `insult`: Personal attacks, mockery, or derogatory remarks aimed at belittling someone
- `identity_hate`: Hostile content targeting individuals or groups based on attributes such as race, religion, gender, sexual orientation, or other protected characteristics

**Parameters**

| Parameter | Type   | Description                                  |
| --------- | ------ | -------------------------------------------- |
| `top`     | number | Number of top toxicity predictions to return |

**Example**

```yaml
plans:
  my-plan:
    my-entity:
    ...
      - run:
          ai: text
          task: toxicity-detection
          params:
            top: 3
          input: content
          output:
            toxicity: toxicity
```

**Output**

```json
{
  "toxicity": {
    "toxic": 0.9961523413658142,
    "insult": 0.9055920839309692,
    "obscene": 0.9740362763404846,
    "identity_hate": 0.7695426940917969,
    "threat": 0.7240217924118042,
    "severe_toxic": 0.6533908843994141
  }
}
```

**Output Data**

`toxicity` object contains the following properties:

| Key             | Type   | Description             |
| --------------- | ------ | ----------------------- |
| `toxic`         | number | The toxicity score      |
| `insult`        | number | The insult score        |
| `obscene`       | number | The obscene score       |
| `identity_hate` | number | The identity hate score |
| `threat`        | number | The threat score        |
| `severe_toxic`  | number | The severe toxic score  |

#### `translation`

Translate text between languages.

**Supported Language**: Arabic (`ar_AR`), Bulgarian (`bg_BG`), Chinese (Simplified) (`zh_CN`), Chinese (Traditional) (`zh_TW`), German (`de_DE`), English (`en_XX`), French (`fr_XX`), Japanese (`ja_XX`), Korean (`ko_KR`), Portuguese (`pt_XX`), Russian (`ru_RU`), Spanish (`es_XX`)

**Parameters**

| Parameter | Type   | Description                          |
| --------- | ------ | ------------------------------------ |
| `source`  | string | Source language code (e.g., 'en_XX') |
| `target`  | string | Target language code (e.g., 'fr_XX') |

**Example**

```yaml
plans:
  my-plan:
    my-entity:
    ...
      - run:
          ai: text
          task: translation
          params:
            source: en_XX
            target: ar_AR
          input: content # "Hello, how are you?"
          output:
            translated: ${{ $result.translation.text }}
```

**Output**

```json
{
  "translation": {
    "text": "مرحبا كيف حالك؟",
    "source": "en_XX",
    "target": "ar_AR"
  }
}
```

**Output Data**

`translation` object contains the following properties:

| Key      | Type   | Description              |
| -------- | ------ | ------------------------ |
| `text`   | string | The translated text      |
| `source` | string | The source language code |
| `target` | string | The target language code |

#### `zero-shot-classification`

Zero-shot text classification.

**Parameters**

| Parameter | Type     | Description                                         |
| --------- | -------- | --------------------------------------------------- |
| `labels`  | string[] | Array of possible class labels to classify the text |

**Example**

```yaml
plans:
  my-plan:
    my-entity:
    ...
      - run:
          ai: text
          task: zero-shot-classification
          params:
            labels: ["refund", "technical support", "billing"]
          input: content # "I have a problem with my order"
          output:
            category: text_category
```

**Output**

```json
{
  "zeroshot": {
    "billing": 0.8,
    "refund": 0.15,
    "technical support": 0.05
  }
}
```

**Output Data**

`zeroshot` object contains the labels and the scores sorted by score:

| Key       | Type   | Description           |
| --------- | ------ | --------------------- |
| `<label>` | number | The probability score |

### `image` (Image Processing)

Analyze and process images using computer vision models.

::: tip ℹ️ NOTE
In the plan, `run.input` is expected to be a Base 64 string.
:::

**Tasks**:

| Task Name                   | Description                          |
| --------------------------- | ------------------------------------ |
| `image-classification`      | Classify images into categories      |
| `image-segmentation`        | Segment images into regions          |
| `image-to-text`             | Generate text descriptions of images |
| `object-detection`          | Detect objects in images             |
| `visual-question-answering` | Answer questions about images        |

#### `image-classification`

Classify images into various categories.

**Example**

> ```yaml
> plans:
>   my-plan:
>     my-entity:
>       - run:
>           ai: image
>           task: image-classification
>           input: image_data # Base64-encoded image
>           output:
>             objects: ${{ $result.objects }}
> ```

**Output**

```json
{
  "objects": [
    {
      "label": "reflex camera",
      "score": 0.2049
    },
    {
      "label": "notebook, notebook computer",
      "score": 0.1218
    }
  ]
}
```

`objects` is an array of objects with the following properties:

| Property | Type   | Description                        |
| -------- | ------ | ---------------------------------- |
| `label`  | string | The predicted object               |
| `score`  | number | Confidence score of the prediction |

#### `image-segmentation`

Perform semantic segmentation on images.

**Example**

> ```yaml
> plans:
>   my-plan:
>     my-entity:
>       - run:
>           ai: image
>           task: image-segmentation
>           input: image_data # Base64-encoded image
>           output:
>             masks: ${{ $result.masks }}
> ```

**Output**

```json
{
  "masks": [
    {
      "score": null,
      "label": "wall",
      "mask": "<base64>"
    },
    {
      "score": null,
      "label": "chair",
      "mask": "<base64>"
    }
  ],
  "model": "nvidia/segformer-b0-finetuned-ade-512-512"
}
```

`masks` is an array of objects with the following properties:

| Property | Type   | Description                                      |
| -------- | ------ | ------------------------------------------------ |
| `score`  | number | Confidence score (if available)                  |
| `label`  | string | The label of the segmented region                |
| `mask`   | string | Base64-encoded binary mask of the segmented area |

#### `image-to-text`

Generate text descriptions of images.

**Example**

> ```yaml
> plans:
>   my-plan:
>     my-entity:
>       - run:
>           ai: image
>           task: image-to-text
>           input: image_data # Base64-encoded image
>           output:
>             description: ${{ $result.result[0].generated_text }}
> ```

**Output**

```json
{
  "result": [
    {
      "generated_text": "a person is holding a laptop computer and a camera"
    }
  ]
}
```

`result` is an array of objects with the following properties:

| Property         | Type   | Description                    |
| ---------------- | ------ | ------------------------------ |
| `generated_text` | string | The generated text description |

#### `object-detection`

Detect and locate objects in images.

**Example**

> ```yaml
> plans:
>   my-plan:
>     my-entity:
>       - run:
>           ai: image
>           task: object-detection
>           input: image_data # Base64-encoded image
>           output:
>             objects: ${{ $result.result }}
> ```

**Output**

```json
{
  "result": [
    {
      "score": 0.9759,
      "label": "person",
      "box": {
        "xmin": 849,
        "ymin": 298,
        "xmax": 1343,
        "ymax": 998
      }
    },
    {
      "score": 0.9997,
      "label": "laptop",
      "box": {
        "xmin": 312,
        "ymin": 118,
        "xmax": 1223,
        "ymax": 857
      }
    }
  ]
}
```

`result` is an array of detected objects with the following properties:

| Property | Type   | Description                                                             |
| -------- | ------ | ----------------------------------------------------------------------- |
| `score`  | number | Confidence score of the detection                                       |
| `label`  | string | The detected object category                                            |
| `box`    | object | Bounding box coordinates with `xmin`, `ymin`, `xmax`, `ymax` properties |

#### `visual-question-answering`

Answer questions about image content.

**Parameters**

| Parameter  | Type   | Required | Description                  |
| ---------- | ------ | -------- | ---------------------------- |
| `question` | string | Yes      | The question about the image |

**Example**

> ```yaml
> plans:
>   my-plan:
>     my-entity:
>       - run:
>           ai: image
>           task: visual-question-answering
>           params:
>             question: "How many people are in the image?"
>           input: image_data # Base64-encoded image
>           output:
>             answer: ${{ $result.result[0].answer }}
>             confidence: ${{ $result.result[0].score }}
> ```

**Output**

```json
{
  "result": [
    {
      "score": 0.5855,
      "answer": "4"
    },
    {
      "score": 0.4102,
      "answer": "3"
    }
  ]
}
```

`result` is an array of possible answers with the following properties:

| Property | Type   | Description                    |
| -------- | ------ | ------------------------------ |
| `answer` | string | The predicted answer           |
| `score`  | number | Confidence score of the answer |

---

---

---

---

<!-- // TODO: to fix -->

## Audio Processing

Process and analyze audio data using machine learning models.

::: tip ℹ️ NOTE
In the plan, `run.input` is expected to be a Base 64 string.
:::

**Tasks**:

| Task Name                      | Description                     |
| ------------------------------ | ------------------------------- |
| `audio-classification`         | Classify audio clips by emotion |
| `automatic-speech-recognition` | Transcribe speech to text       |

#### `audio-classification`

Classify audio clips by emotion.

**Example**

> ```yaml
> plans:
>   my-plan:
>     my-entity:
>     ...
>       - run:
>           ai: audio
>           task: audio-classification
>           input: audio_data # Base64-encoded audio
>           output:
>             happy: ${{ $result.happy ?? 0 }}
>             sad: ${{ $result.sad ?? 0 }}
>             neutral: ${{ $result.neutral ?? 0 }}
>             angry: ${{ $result.angry ?? 0 }}
> ```

**Output**

```json
{
  "neutral": 0.5449906587600708,
  "happy": 0.24226616322994232,
  "angry": 0.17592576146125793,
  "sad": 0.03681737929582596
}
```

`audio-classification` object contains emotion probabilities:

| Property  | Type   | Description                     |
| --------- | ------ | ------------------------------- |
| `happy`   | number | Probability score for happiness |
| `sad`     | number | Probability score for sadness   |
| `neutral` | number | Probability score for neutral   |
| `angry`   | number | Probability score for anger     |

#### `automatic-speech-recognition`

Transcribe speech to text.

**Example**

> ```yaml
> plans:
>   my-plan:
>     my-entity:
>     ...
>       - run:
>           ai: audio
>           task: automatic-speech-recognition
>           input: audio_data # Base64-encoded audio
>           output:
>             transcription: ${{ $result }}
> ```

**Output**

```json
"Hello, how are you today?"
```

The output is a string containing the transcribed text from the audio.

## Usage Example

Here's an example of how to use the AI engines in your Metal pipeline:

```yaml
pipeline:
  - name: "Process Document"
    type: "ai"
    engine: "ocr-image-to-string"
    input: "{{steps.download-file.output.filepath}}"
    output: "extracted-text"

  - name: "Analyze Sentiment"
    type: "ai"
    engine: "text-sentiment-analysis"
    input: "{{steps['Process Document'].output}}"
    output: "sentiment-analysis"
```
