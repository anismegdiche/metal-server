//
//
//
import { TAiDockerService } from '../types/TAiDockerService';
import { DOCKER } from '../consts/DOCKER';


//
export const ImageImageDepthEstimationDockerService: TAiDockerService = {
    Name: 'image-depth-estimation',
    Port: 5000,
    ImageName: `${DOCKER.AI_ENGINE_PREFIX}-image-depth-estimation:v1.0.0`,
    ImageContext: {
        context: `${process.cwd()}/.docker/ai-engines/services/image/depth-estimation`,
        src: ['.', './requirements.txt']
    },
    InternalUrl: '/image-depth-estimation'
};

export const ImageImageClassificationDockerService: TAiDockerService = {
    Name: 'image-image-classification',
    Port: 5000,
    ImageName: `${DOCKER.AI_ENGINE_PREFIX}-image-image-classification:v1.0.0`,
    ImageContext: {
        context: `${process.cwd()}/.docker/ai-engines/services/image/image-classification`,
        src: ['.', './requirements.txt']
    },
    InternalUrl: '/image-image-classification'
};

export const ImageImageSegmentationDockerService: TAiDockerService = {
    Name: 'image-image-segmentation',
    Port: 5000,
    ImageName: `${DOCKER.AI_ENGINE_PREFIX}-image-image-segmentation:v1.0.0`,
    ImageContext: {
        context: `${process.cwd()}/.docker/ai-engines/services/image/image-segmentation`,
        src: ['.', './requirements.txt']
    },
    InternalUrl: '/image-image-segmentation'
};

export const ImageImageToTextDockerService: TAiDockerService = {
    Name: 'image-image-to-text',
    Port: 5000,
    ImageName: `${DOCKER.AI_ENGINE_PREFIX}-image-image-to-text:v1.0.0`,
    ImageContext: {
        context: `${process.cwd()}/.docker/ai-engines/services/image/image-to-text`,
        src: ['.', './requirements.txt']
    },
    InternalUrl: '/image-image-to-text'
};

export const ImageObjectDetectionDockerService: TAiDockerService = {
    Name: 'image-object-detection',
    Port: 5000,
    ImageName: `${DOCKER.AI_ENGINE_PREFIX}-image-object-detection:v1.0.0`,
    ImageContext: {
        context: `${process.cwd()}/.docker/ai-engines/services/image/object-detection`,
        src: ['.', './requirements.txt']
    },
    InternalUrl: '/image-object-detection'
};

export const ImageVisualQuestionAnsweringDockerService: TAiDockerService = {
    Name: 'image-visual-question-answering',
    Port: 5000,
    ImageName: `${DOCKER.AI_ENGINE_PREFIX}-image-visual-question-answering:v1.0.0`,
    ImageContext: {
        context: `${process.cwd()}/.docker/ai-engines/services/image/visual-question-answering`,
        src: ['.', './requirements.txt']
    },
    InternalUrl: '/image-visual-question-answering'
};

