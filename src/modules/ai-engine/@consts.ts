
//
//  config types
//

import { StringUtils } from '../../utils/StringUtils';
import { SERVER } from '../core/@consts';

export enum AI_ENGINE {
    OCR = "ocr",
    TEXT = "text",
    IMAGE = "image",
    AUDIO = "audio",
    DOCUMENT = "document"
}

export const AI_DOCKER_MODEL_PATH = StringUtils.Path(SERVER.TEMP_PATH, 'models');
