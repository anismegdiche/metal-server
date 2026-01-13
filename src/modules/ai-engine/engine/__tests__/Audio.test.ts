import axios from 'axios';
import { Audio } from '../Audio';
import type { TAiArguments } from '../../@types';

const spyAxios = vi.spyOn(axios, 'post');

const audio = new Audio();

describe('Audio', () => {
    beforeEach(() => {
        spyAxios.mockClear();
    });

    describe('AudioClassification', () => {
        it('should classify audio emotions', async () => {
            spyAxios.mockImplementationOnce(() => {
                return Promise.resolve({
                    data: {
                        result: [
                            {
                                score: 0.5449946522712708,
                                label: "neu"
                            },
                            {
                                score: 0.2422640025615692,
                                label: "hap"
                            },
                            {
                                score: 0.17592455446720123,
                                label: "ang"
                            },
                            {
                                score: 0.03681683912873268,
                                label: "sad"
                            }
                        ]
                    }
                });
            });

            const result = await audio.AudioClassification(<TAiArguments>{
                data: "base64_audio_data"
            });

            expect(result).toEqual({
                neutral: expect.any(Number),
                happy: expect.any(Number),
                angry: expect.any(Number),
                sad: expect.any(Number)
            });
        });
    });

    describe('AutomaticSpeechRecognition', () => {
        it('should transcribe speech to text', async () => {
            spyAxios.mockImplementationOnce(() => {
                return Promise.resolve({
                    data: {
                        result: {
                            text: " The stale smell of old beer lingers. It takes heat to bring out the odor. A cold dip restores health and zest. A salt pickle tastes fine with ham. Tacos al pastor are my favorite. A zestful food is the hot cross bun."
                        }
                    }
                });
            });

            const result = await audio.AutomaticSpeechRecognition(<TAiArguments>{
                data: "base64_audio_data"
            });

            expect(result).toEqual(expect.any(String));
        });
    });
});
