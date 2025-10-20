/* eslint-disable security/detect-non-literal-regexp */
import axios from 'axios';
import { Text } from '../Text';
import { TAiRunArguments } from '../../@types';
import { TEXT_LANGUAGE_DETECTION_ISO } from '../../consts/TEXT';

const spyAxios = jest.spyOn(axios, 'post');

const text = new Text();

describe('Text', () => {
    beforeEach(() => {
        spyAxios.mockClear();
    });

    // Text tasks
    describe('EmotionDetection', () => {

        it('should detect emotion', async () => {
            spyAxios.mockImplementationOnce(() => {
                return Promise.resolve({
                    data: {
                        result: [
                            [
                                {
                                    "label": "joy",
                                    "score": "0.9658117294311523"
                                },
                                {
                                    "label": "surprise",
                                    "score": "0.02311941795051098"
                                },
                                {
                                    "label": "neutral",
                                    "score": "0.006501524709165096"
                                },
                                {
                                    "label": "anger",
                                    "score": "0.0017172531224787235"
                                },
                                {
                                    "label": "sadness",
                                    "score": "0.0012625681702047586"
                                },
                                {
                                    "label": "fear",
                                    "score": "0.001110117882490158"
                                },
                                {
                                    "label": "disgust",
                                    "score": "0.0004773985710926354"
                                }
                            ]
                        ]
                    }
                });
            });

            const result = await text.EmotionDetection(<TAiRunArguments>{
                data: "I'm not confident with this project!",
                params: {
                    top: 10
                }
            });

            expect(result).toEqual({
                emotion: expect.objectContaining({
                    joy: expect.any(Number),
                    surprise: expect.any(Number),
                    neutral: expect.any(Number),
                    anger: expect.any(Number),
                    sadness: expect.any(Number),
                    fear: expect.any(Number),
                    disgust: expect.any(Number),
                })
            });
        });
    });

    describe('FillMask', () => {
        it('should fill in masked text', async () => {
            spyAxios.mockImplementationOnce(() => {
                return Promise.resolve({
                    data: {
                        result: [
                            {
                                score: 0.9,
                                token: 3000,
                                token_str: 'paris',
                                sequence: 'the capital of france is paris.'
                            }
                        ]
                    }
                });
            });

            const result = await text.FillMask(<TAiRunArguments>{
                data: 'The capital of France is [MASK].'
            });

            expect(result).toEqual({
                fillmask: expect.arrayContaining([
                    expect.objectContaining({
                        score: expect.any(Number),
                        word: expect.any(String),
                        text: expect.any(String)
                    })
                ])
            });
        });
    });

    describe('KeywordExtraction', () => {

        it('should extract keywords', async () => {
            spyAxios.mockImplementationOnce(() => {
                return Promise.resolve({
                    data: {
                        result: [
                            [
                                "cedric",
                                "englishman",
                                "mamma",
                                "blue eyes",
                                "long mustache"
                            ]
                        ]
                    }
                });
            });

            const result = await text.KeywordExtraction(<TAiRunArguments>{
                data: "Title: The Importance of Testing\r\rTesting plays a critical role in many aspects of life, from education and technology to medicine and product development. At its core, testing is a method of evaluating performance, reliability, or understanding. It helps ensure that systems, individuals, or products meet specific standards and function as intended.\r\rIn education, testing allows teachers to assess students’ knowledge and identify areas that need improvement. It provides feedback for both learners and educators, helping to guide instruction and learning strategies.\r\rIn technology, testing is essential for building reliable software and hardware. Before a product is released, it undergoes various stages of testing—such as unit testing, integration testing, and user acceptance testing—to catch bugs and improve performance.\r\rIn the medical field, testing is crucial for diagnosing diseases, monitoring patient health, and determining the effectiveness of treatments. Accurate testing can save lives and prevent the spread of illnesses.\r\rOverall, testing is not just about finding faults—it's about improvement, validation, and progress. Whether in classrooms, laboratories, or development teams, testing helps us move forward with confidence.",
            });

            expect(result).toEqual({
                keywords: expect.arrayContaining([
                    expect.any(String)
                ])
            });
        });
    });

    describe('LanguageDetection', () => {

        it('should detect language', async () => {
            spyAxios.mockImplementationOnce(() => {
                return Promise.resolve({
                    data: {
                        result: [
                            {
                                "label": "de",
                                "score": "0.9953383207321167"
                            }
                        ]
                    }
                });
            });

            const result = await text.LanguageDetection(<TAiRunArguments>{
                data: "Hallo, wie geht es dir?"
            });

            expect(result).toEqual({
                language: {
                    code: expect.stringMatching(
                        new RegExp(`^(${Object.values(TEXT_LANGUAGE_DETECTION_ISO).join("|")})$`)
                    ),
                    score: expect.any(Number)
                }
            });
        });
    });

    describe('ParaphraseDetection', () => {

        it('should detect paraphrase', async () => {
            spyAxios.mockImplementationOnce(() => {
                return Promise.resolve({
                    data: {
                        result: {
                            "source_sentence": "The quick brown fox jumps over the lazy dog",
                            "target_sentence": "A fast brown fox leaps over a sleepy dog",
                            "similarity_score": 0.8476852774620056
                        }
                    }
                });
            });

            const result = await text.ParaphraseDetection(<TAiRunArguments>{
                data: "The quick brown fox jumps over the lazy dog",
                params: {
                    target: "A fast brown fox leaps over a sleepy dog"
                }
            });

            expect(result).toEqual(expect.objectContaining({
                paraphrase: {
                    source: expect.any(String),
                    target: expect.any(String),
                    score: expect.any(Number)
                }
            }));
        });
    });

    describe('QuestionAnswering', () => {
        it('should answer questions', async () => {
            spyAxios.mockImplementationOnce(() => {
                return Promise.resolve({
                    data: {
                        result: {
                            answer: 'Paris',
                            score: 0.998,
                            start: 0,
                            end: 5
                        }
                    }
                });
            });

            const result = await text.QuestionAnswering(<TAiRunArguments>{
                data: 'Paris is the capital of France. It is known for its beautiful architecture and rich history.',
                params: {
                    question: 'What is the capital of France?'
                }
            });

            expect(result).toEqual(expect.objectContaining({
                answer: {
                    text: expect.any(String),
                    score: expect.any(Number),
                    start: expect.any(Number),
                    end: expect.any(Number)
                }
            }));
        });
    });

    describe('SentenceSimilarity', () => {

        it('should compute sentence similarity', async () => {
            spyAxios.mockImplementationOnce(() => {
                return Promise.resolve({
                    data: {
                        result: [
                            {
                                "sentence1": "That is a happy person",
                                "sentence2": "That is a very happy person",
                                "similarity": "0.942915141582489",
                                "rank": "1"
                            },
                            {
                                "sentence1": "That is a happy person",
                                "sentence2": "That is a happy dog",
                                "similarity": "0.6945775151252747",
                                "rank": "2"
                            },
                            {
                                "sentence1": "That is a happy person",
                                "sentence2": "Today is a sunny day",
                                "similarity": "0.2568761706352234",
                                "rank": "3"
                            }
                        ]
                    }
                });
            });

            const result = await text.SentenceSimilarity(<TAiRunArguments>{
                data: "That is a happy person",
                params: {
                    sentences: [
                        "That is a happy dog",
                        "That is a very happy person",
                        "Today is a sunny day"
                    ]
                }
            });

            expect(result).toEqual({
                similarity: expect.arrayContaining([
                    expect.objectContaining({
                        sentence: expect.any(String),
                        score: expect.any(Number),
                        rank: expect.any(Number)
                    })
                ])
            });
        });
    });

    describe('SentimentAnalysis', () => {
        it('should perform sentiment analysis', async () => {
            spyAxios.mockImplementationOnce(() => {
                return Promise.resolve({
                    data: {
                        result: [{
                            "label": "Positive",
                            "score": 0.6533908843994141
                        }]
                    }
                });
            });

            const result = await text.SentimentAnalysis(<TAiRunArguments>{
                data: 'I love using this service!'
            });

            expect(result).toEqual({
                sentiment: {
                    label: expect.stringMatching(new RegExp(`^(${['very negative', 'negative', 'neutral', 'positive', 'very positive'].join('|')})$`)),
                    score: expect.any(Number)
                }
            });
        });
    });

    describe('Summarization', () => {
        it('should summarize text', async () => {
            spyAxios.mockImplementationOnce(() => {
                return Promise.resolve({
                    data: {
                        result: [
                            {
                                summary_text: "AI is intelligence demonstrated by machines, as opposed to natural intelligence displayed by animals including humans."
                            }
                        ]
                    }
                });
            });

            const result = await text.Summarization(<TAiRunArguments>{
                data: 'Artificial intelligence is intelligence demonstrated by machines, as opposed to natural intelligence displayed by animals including humans. AI research has been defined as the field of study of intelligent agents, which refers to any system that perceives its environment and takes actions that maximize its chance of achieving its goals.',
                params: {
                    "min-length": 10,
                    "max-length": 20
                }
            });

            expect(result).toEqual({
                summary: {
                    text: expect.any(String)
                }
            });
        });
    });

    // describe('Text2TextGeneration', () => {
    //     it('should perform text2text generation', async () => {
    //         spyAxios.mockImplementationOnce(() => {
    //             return Promise.resolve({
    //                 data: {
    //                     result: [
    //                         {
    //                             generated_text: '42 is the answer to life, the universe and everything'
    //                         }
    //                     ]
    //                 }
    //             });
    //         });

    //         const result = await text.Text2TextGeneration(<TAiRunArguments>{
    //             data: 'question: What is 42 ? context: 42 is the answer to life, the universe and everything'
    //         });

    //         expect(result).toEqual(expect.any(String));
    //     });
    // });

    describe('TextGeneration', () => {
        it('should generate text', async () => {
            spyAxios.mockImplementationOnce(() => {
                return Promise.resolve({
                    data: {
                        result: [
                            [
                                {
                                    "generated_text": "Once upon a time in a land far away, there were many people who lived as a living legend.\n\nThe story of a small village in the north of England, named \"Humberland,\" began more than a century ago. The story was told by a poor peasant, who could no longer afford a house, and who had only a few possessions. He was so poor that he was unable to afford his own food, the only source of food for his family. He was forced to work as a labourer, and could not earn enough to feed his family.\n\nIn 1735, the king of England, Thomas I, granted the local lord, the Earl of York, permission to build a castle on the edge of the English Channel, at what was then known as St. John's. It was called St. John's, and it was built by the very same people who had built St. John's. The castle built by the local lord was called St. John's Castle, and the castle was called St. John's Castle.\n\nThe king granted the castle to two local lords, the Earl of Warwick, who were both local lords of the town of St. John's. Warwick was the lord of the castle, and the Earl of St. John's was the lord of"
                                }
                            ]
                        ]
                    }
                });
            });

            const result = await text.TextGeneration(<TAiRunArguments>{
                data: 'The capital of France is',
                params: {
                    "max-length": 50,
                    "do-sample": true,
                    temperature: 0.9
                }
            });

            expect(result).toEqual({
                text: expect.any(String)
            });
        });
    });

    describe('Ner', () => {
        it('should perform ner', async () => {
            spyAxios.mockImplementationOnce(() => {
                return Promise.resolve({
                    data: {
                        result: [
                            [
                                {
                                    "entity_group": "PER",
                                    "score": 0.7927860021591187,
                                    "word": "John",
                                    "start": 11,
                                    "end": 15
                                },
                                {
                                    "entity_group": "ORG",
                                    "score": 0.9791768193244934,
                                    "word": "Google",
                                    "start": 30,
                                    "end": 36
                                },
                                {
                                    "entity_group": "LOC",
                                    "score": 0.9997129440307617,
                                    "word": "New York",
                                    "start": 40,
                                    "end": 48
                                }
                            ]
                        ]
                    }
                });
            });

            const result = await text.Ner(<TAiRunArguments>{
                data: 'My name is John and I work at Google in New York.',
                params: { grouped: true }
            });

            expect(result).toEqual({
                entities: expect.arrayContaining([
                    expect.objectContaining({
                        group: expect.any(String),
                        score: expect.any(Number),
                        word: expect.any(String),
                        start: expect.any(Number),
                        end: expect.any(Number)
                    })
                ])
            });
        });
    });

    describe('ToxicityDetection', () => {
        it('should perform toxicity detection', async () => {
            spyAxios.mockImplementationOnce(() => {
                return Promise.resolve({
                    data: {
                        result: [
                            [
                                {
                                    "label": "toxic",
                                    "score": "0.9961523413658142"
                                },
                                {
                                    "label": "obscene",
                                    "score": "0.9740362763404846"
                                },
                                {
                                    "label": "insult",
                                    "score": "0.9055920839309692"
                                },
                                {
                                    "label": "threat",
                                    "score": "0.7695426940917969"
                                },
                                {
                                    "label": "severe_toxic",
                                    "score": "0.7240217924118042"
                                },
                                {
                                    "label": "identity_hate",
                                    "score": "0.08210677653551102"
                                }
                            ]
                        ]
                    }
                });
            });

            const result = await text.ToxicityDetection(<TAiRunArguments>{
                data: "you bastard, i hate you so much!are you fucked up! i will kill you",
                params: {
                    top: 10
                }
            });

            expect(result).toEqual({
                toxicity: {
                    identity_hate: expect.any(Number),
                    insult: expect.any(Number),
                    obscene: expect.any(Number),
                    severe_toxic: expect.any(Number),
                    threat: expect.any(Number),
                    toxic: expect.any(Number)
                }
            });
        });
    });

    describe('Translation', () => {
        it('should translate text', async () => {
            spyAxios.mockImplementationOnce(() => {
                return Promise.resolve({
                    data: {
                        result: [
                            {
                                translation_text: 'مرحبا كيف حالك؟'
                            }
                        ]
                    }
                });
            });

            const result = await text.Translation(<TAiRunArguments>{
                data: 'Hello, how are you?',
                params: {
                    source: 'en_XX',
                    target: 'ar_AR'
                }
            });

            expect(result).toEqual({
                translation: {
                    text: expect.any(String),
                    source: expect.stringMatching(
                        new RegExp(`^(${Object.values(TEXT_LANGUAGE_DETECTION_ISO).join("|")})$`)
                    ),
                    target: expect.stringMatching(
                        new RegExp(`^(${Object.values(TEXT_LANGUAGE_DETECTION_ISO).join("|")})$`)
                    )
                }
            });
        });
    });

    describe('ZeroShotClassification', () => {
        it('should perform zero-shot classification', async () => {
            spyAxios.mockImplementationOnce(() => {
                return Promise.resolve({
                    data: {
                        result: {
                            "sequence": "I have a problem with my order",
                            "labels": [
                                "billing",
                                "refund",
                                "technical support"
                            ],
                            "scores": [
                                0.4180431663990021,
                                0.3394615352153778,
                                0.24249528348445892
                            ]
                        }
                    }
                });
            });

            const result = await text.ZeroShotClassification(<TAiRunArguments>{
                data: 'I have a problem with my order',
                params: {
                    labels: ['refund', 'technical support', 'billing']
                }
            });

            expect(result).toEqual({
                zeroshot: expect.objectContaining(
                    Object.fromEntries(
                        Object.entries((result as any).zeroshot ?? {}).map(([k]) => [k, expect.any(Number)])
                    )
                ),
            });

        });
    });
})
