/* eslint-disable security/detect-non-literal-regexp */
import axios from 'axios';
import { Ocr } from '../Ocr';
import { TAiRunArguments } from '../../@types';
import { OCR_LANG_ISO, OCR_TASK } from '../../consts/OCR';

const spyAxios = jest.spyOn(axios, 'post');

const ocr = new Ocr();

describe('Ocr', () => {
    beforeEach(() => {
        spyAxios.mockClear();
    });

    describe('ImageToString', () => {
        it('should extract text from image', async () => {
            spyAxios.mockImplementationOnce(() => {
                return Promise.resolve({
                    data: {
                        text: "This is a sample text extracted from the image using OCR technology.",
                        language: "eng",
                        language_name: {
                            downloaded: true,
                            name: "English"
                        }
                    }
                });
            });

            const result = await ocr.ImageToString(<TAiRunArguments>{
                data: "base64_image_data",
                task: OCR_TASK.IMAGE_TO_STRING,
                params: {
                    lang: OCR_LANG_ISO.ENG
                }
            });

            expect(result).toEqual({
                text: expect.any(String),
                lang: expect.stringMatching(
                    new RegExp(`^(${Object.values(OCR_LANG_ISO).join("|")})$`)
                )
            });
        });
    });
});
