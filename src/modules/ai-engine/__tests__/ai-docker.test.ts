import axios from 'axios';

// Configuration
const BASE_URL = 'http://localhost:5001';
const TEST_TIMEOUT = 300000; // 5 minutes

describe('AI Docker Service', () => {
    // Text tasks
    describe('Text Tasks', () => {
        it('should perform sentiment analysis', async () => {
            const response = await axios.post(
                `${BASE_URL}/text-sentiment-analysis`,
                {
                    input_data: 'I love using this service!',
                    params: { top_k: null }
                }
            );
            expect(response.status).toBe(200);
            expect(response.data).toEqual({
                result: expect.arrayContaining([
                    expect.objectContaining({
                        label: expect.any(String),
                        score: expect.any(Number)
                    })
                ])
            });
        }, TEST_TIMEOUT);

        it('should generate text', async () => {
            const response = await axios.post(
                `${BASE_URL}/text-generation`,
                {
                    input_data: 'Once upon a time in a land far away,',
                    params: {
                        max_length: 50,
                        do_sample: true,
                        temperature: 0.9
                    }
                }
            );
            expect(response.status).toBe(200);
            expect(response.data).toEqual({
                result: [
                    {
                        generated_text: expect.any(String)
                    }
                ]
            });
        }, TEST_TIMEOUT);

        it('should answer questions', async () => {
            const response = await axios.post(
                `${BASE_URL}/question-answering`,
                {
                    input_data: {
                        question: 'What is the capital of France?',
                        context: 'Paris is the capital of France. It is known for its beautiful architecture and rich history.'
                    }
                }
            );
            expect(response.status).toBe(200);
            expect(response.data).toEqual({
                result: [
                    {
                        answer: expect.any(String),
                        score: expect.any(Number),
                        start: expect.any(Number),
                        end: expect.any(Number)
                    }
                ]
            });
        }, TEST_TIMEOUT);

        it('should summarize text', async () => {
            const response = await axios.post(
                `${BASE_URL}/summarization`,
                {
                    input_data: 'Artificial intelligence is intelligence demonstrated by machines, as opposed to natural intelligence displayed by animals including humans. AI research has been defined as the field of study of intelligent agents, which refers to any system that perceives its environment and takes actions that maximize its chance of achieving its goals.',
                    params: {
                        max_length: 20,
                        min_length: 10
                    }
                }
            );
            expect(response.status).toBe(200);
            expect(response.data).toEqual({
                result: [
                    {
                        summary_text: expect.any(String)
                    }
                ]
            });
        }, TEST_TIMEOUT);

        it('should fill in masked text', async () => {
            const response = await axios.post(
                `${BASE_URL}/fill-mask`,
                {
                    input_data: 'The capital of France is [MASK].',
                    params: {
                        top_k: 1
                    }
                }
            );
            expect(response.status).toBe(200);
            expect(response.data).toEqual({
                result: [
                    expect.objectContaining({
                        score: expect.any(Number),
                        token: expect.any(Number),
                        token_str: expect.any(String),
                        sequence: expect.any(String)
                    })
                ]
            });
        }, TEST_TIMEOUT);

        it('should translate text', async () => {
            const response = await axios.post(
                `${BASE_URL}/translation`,
                {
                    input_data: 'Hello, how are you?',
                    params: {
                        src_lang: 'en_XX',
                        tgt_lang: 'ar_AR'
                    }
                }
            );
            expect(response.status).toBe(200);
            expect(response.data).toEqual({
                result: [
                    {
                        translation_text: expect.any(String)
                    }
                ]
            });
        }, TEST_TIMEOUT);

        it('should perform zero-shot classification', async () => {
            const response = await axios.post(
                `${BASE_URL}/zero-shot-classification`,
                {
                    input_data: 'I have a problem with my order',
                    params: {
                        candidate_labels: ['refund', 'technical support', 'billing']
                    }
                }
            );
            expect(response.status).toBe(200);
            expect(response.data).toEqual({
                result: expect.objectContaining({
                    sequence: 'I have a problem with my order',
                    labels: expect.arrayContaining(['billing', 'refund', 'technical support']),
                    scores: expect.arrayContaining([expect.any(Number)])
                })
            });
        }, TEST_TIMEOUT);

        it('should perform token classification', async () => {
            const response = await axios.post(
                `${BASE_URL}/token-classification`,
                {
                    input_data: 'My name is John and I work at Google in New York.',
                    params: { grouped_entities: true }
                }
            );
            expect(response.status).toBe(200);
            expect(response.data).toEqual({
                result: expect.arrayContaining([
                    expect.objectContaining({
                        entity_group: expect.any(String),
                        score: expect.any(Number),
                        word: expect.any(String),
                        start: expect.any(Number),
                        end: expect.any(Number)
                    })
                ])
            });
        }, TEST_TIMEOUT);

        it('should perform text2text generation', async () => {
            const response = await axios.post(
                `${BASE_URL}/text2text-generation`,
                {
                    input_data: 'question: What is 42 ? context: 42 is the answer to life, the universe and everything',
                    model: 'google/flan-t5-base'
                }
            );
            expect(response.status).toBe(200);
            expect(response.data).toEqual({
                result: [
                    {
                        generated_text: expect.any(String)
                    }
                ]
            });
        }, TEST_TIMEOUT);

        it('should detect toxicity', async () => {
            const response = await axios.post(
                `${BASE_URL}/toxicity-detection`,
                {
                    input_data: 'you bastard, i hate you so much!are you fucked up! i will kill you',
                    params: { top_k: 10 }
                }
            );
            expect(response.status).toBe(200);
            expect(response.data).toEqual({
                result: [
                    expect.arrayContaining([
                        expect.objectContaining({
                            label: expect.any(String),
                            score: expect.any(String)
                        })
                    ])
                ]
            });
        }, TEST_TIMEOUT);

        it('should detect emotion', async () => {
            const response = await axios.post(
                `${BASE_URL}/emotion-detection`,
                {
                    input_data: ",I'm not confident with this project!",
                    params: { top_k: 10 }
                }
            );
            expect(response.status).toBe(200);
            expect(response.data).toEqual({
                result: [
                    expect.arrayContaining([
                        expect.objectContaining({
                            label: expect.any(String),
                            score: expect.any(String)
                        })
                    ])
                ]
            });
        }, TEST_TIMEOUT);

        it('should compute sentence similarity', async () => {
            const response = await axios.post(
                `${BASE_URL}/sentence-similarity`,
                {
                    input_data: {
                        source_sentence: 'That is a happy person',
                        sentences: [
                            'That is a happy dog',
                            'That is a very happy person',
                            'Today is a sunny day'
                        ]
                    }
                }
            );
            expect(response.status).toBe(200);
            expect(response.data).toEqual({
                result: expect.arrayContaining([
                    expect.objectContaining({
                        sentence1: expect.any(String),
                        sentence2: expect.any(String),
                        similarity: expect.any(String),
                        rank: expect.any(String)
                    })
                ])
            });
        }, TEST_TIMEOUT);

        it('should detect paraphrase', async () => {
            const response = await axios.post(
                `${BASE_URL}/paraphrase-detection`,
                {
                    input_data: {
                        source_sentence: 'The quick brown fox jumps over the lazy dog',
                        target_sentence: 'A fast brown fox leaps over a sleepy dog'
                    }
                }
            );
            expect(response.status).toBe(200);
            expect(response.data).toEqual({
                result: expect.objectContaining({
                    text1: expect.any(String),
                    text2: expect.any(String),
                    is_paraphrase: expect.any(Boolean),
                    similarity_score: expect.any(String),
                    confidence: expect.any(String),
                    label: expect.any(String),
                    model: expect.any(String)
                })
            });
        }, TEST_TIMEOUT);

        it('should detect language', async () => {
            const response = await axios.post(
                `${BASE_URL}/language-detection`,
                {
                    input_data: 'Hallo, wie geht es dir?'
                }
            );
            expect(response.status).toBe(200);
            expect(response.data).toEqual({
                result: expect.arrayContaining([
                    expect.objectContaining({
                        label: expect.any(String),
                        score: expect.any(String)
                    })
                ])
            });
        }, TEST_TIMEOUT);

        it('should extract keywords', async () => {
            const response = await axios.post(
                `${BASE_URL}/keyword-extraction`,
                {
                    input_data: `Title: The Importance of Testing\r\rTesting plays a critical role in many aspects of life, from education and technology to medicine and product development. At its core, testing is a method of evaluating performance, reliability, or understanding. It helps ensure that systems, individuals, or products meet specific standards and function as intended.\r\rIn education, testing allows teachers to assess students’ knowledge and identify areas that need improvement. It provides feedback for both learners and educators, helping to guide instruction and learning strategies.\r\rIn technology, testing is essential for building reliable software and hardware. Before a product is released, it undergoes various stages of testing—such as unit testing, integration testing, and user acceptance testing—to catch bugs and improve performance.\r\rIn the medical field, testing is crucial for diagnosing diseases, monitoring patient health, and determining the effectiveness of treatments. Accurate testing can save lives and prevent the spread of illnesses.\r\rOverall, testing is not just about finding faults—it's about improvement, validation, and progress. Whether in classrooms, laboratories, or development teams, testing helps us move forward with confidence.`,
                    params: { top_k: 10 }
                }
            );
            expect(response.status).toBe(200);
            expect(response.data).toEqual({
                result: expect.arrayContaining([expect.any(String)])
            });
        }, TEST_TIMEOUT);
    });
});
