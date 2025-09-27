import axios from 'axios';
import { Image } from '../Image';
import { TAiRunArguments } from '../../@types';

const spyAxios = jest.spyOn(axios, 'post');

const image = new Image();

describe('Image', () => {
    beforeEach(() => {
        spyAxios.mockClear();
    });

    describe('ImageClassification', () => {
        it('should classify image', async () => {
            spyAxios.mockImplementationOnce(() => {
                return Promise.resolve({
                    data: {
                        result: [
                            {
                                label: "reflex camera",
                                score: 0.20496124029159546
                            },
                            {
                                label: "notebook, notebook computer",
                                score: 0.12176289409399033
                            },
                            {
                                label: "desktop computer",
                                score: 0.10481187701225281
                            },
                            {
                                label: "Polaroid camera, Polaroid Land camera",
                                score: 0.055222440510988235
                            },
                            {
                                label: "screen, CRT screen",
                                score: 0.0461791455745697
                            }
                        ]
                    }
                });
            });

            const result = await image.ImageClassification(<TAiRunArguments>{
                data: "base64_image_data"
            });

            expect(result).toEqual(expect.arrayContaining([
                expect.objectContaining({
                    label: expect.any(String),
                    score: expect.any(Number)
                })
            ]));
        });
    });

    describe('ImageSegmentation', () => {
        it('should segment image', async () => {
            spyAxios.mockImplementationOnce(() => {
                return Promise.resolve({
                    data: {
                        masks: [
                            {
                                score: null,
                                label: "wall",
                                mask: "base64_mask_data"
                            },
                            {
                                score: null,
                                label: "chair",
                                mask: "base64_mask_data"
                            },
                            {
                                score: null,
                                label: "car",
                                mask: "base64_mask_data"
                            }
                        ]
                    }
                });
            });

            const result = await image.ImageSegmentation(<TAiRunArguments>{
                data: "base64_image_data"
            });

            expect(result).toEqual(expect.arrayContaining([
                expect.objectContaining({
                    score: null,
                    label: expect.any(String),
                    mask: expect.any(String)
                })
            ]));
        });
    });

    describe('ImageToText', () => {
        it('should convert image to text', async () => {
            spyAxios.mockImplementationOnce(() => {
                return Promise.resolve({
                    data: {
                        result: [
                            {
                                generated_text: "a person is holding a laptop computer and a camera "
                            }
                        ]
                    }
                });
            });

            const result = await image.ImageToText(<TAiRunArguments>{
                data: "base64_image_data"
            });

            expect(result).toEqual(expect.any(String))
        });
    });

    describe('ObjectDetection', () => {
        it('should detect objects in image', async () => {
            spyAxios.mockImplementationOnce(() => {
                return Promise.resolve({
                    data: {
                        result: [
                            {
                                score: 0.9758986234664917,
                                label: "person",
                                box: {
                                    xmin: 849,
                                    ymin: 298,
                                    xmax: 1343,
                                    ymax: 998
                                }
                            },
                            {
                                score: 0.9996515512466431,
                                label: "laptop",
                                box: {
                                    xmin: 312,
                                    ymin: 118,
                                    xmax: 1223,
                                    ymax: 857
                                }
                            },
                            {
                                score: 0.9554157853126526,
                                label: "dining table",
                                box: {
                                    xmin: 0,
                                    ymin: 194,
                                    xmax: 1343,
                                    ymax: 994
                                }
                            }
                        ]
                    }
                });
            });

            const result = await image.ObjectDetection(<TAiRunArguments>{
                data: "base64_image_data"
            });

            expect(result).toEqual(expect.arrayContaining([
                expect.objectContaining({
                    score: expect.any(Number),
                    label: expect.any(String),
                    box: expect.objectContaining({
                        xmin: expect.any(Number),
                        ymin: expect.any(Number),
                        xmax: expect.any(Number),
                        ymax: expect.any(Number)
                    })
                })
            ]));
        });
    });

    describe('VisualQuestionAnswering', () => {
        it('should answer questions about image', async () => {
            spyAxios.mockImplementationOnce(() => {
                return Promise.resolve({
                    data: {
                        result: [
                            {
                                score: 0.585539698600769,
                                answer: "4"
                            },
                            {
                                score: 0.4101852476596832,
                                answer: "3"
                            },
                            {
                                score: 0.2669353485107422,
                                answer: "5"
                            }
                        ]
                    }
                });
            });

            const result = await image.VisualQuestionAnswering(<TAiRunArguments>{
                data: "base64_image_data",
                params: {
                    question: "How many people?"
                }
            });

            expect(result).toEqual(expect.arrayContaining([
                expect.objectContaining({
                    score: expect.any(Number),
                    answer: expect.any(String)
                })
            ]));
        });
    });
});
