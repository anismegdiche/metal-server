//
//
//
import { DOCKER } from '../consts/DOCKER';
import type { TAiDockerService } from '../types/TAiDockerService';


//
export const OcrDockerService: TAiDockerService = {
    Name: 'ocr',
    Port: 5000,
    ImageName: `${DOCKER.AI_ENGINE_PREFIX}-ocr:1.0.0`,
    ImageContext: {
        context: `${process.cwd()}/.docker/ai-engines/services/ocr`,
        src: ['.', './requirements.txt']
    },
    InternalUrl: '/ocr'
};
