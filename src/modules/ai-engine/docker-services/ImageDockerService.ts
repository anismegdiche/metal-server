//
//
//
import { TAiDockerService } from '../types/TAiDockerService';
import { DOCKER } from '../consts/DOCKER';


//
export let ImageImageDepthEstimationDockerService: TAiDockerService = {
    Name: 'image_depth_estimation',
    Port: 5000,
    ImageName: `${DOCKER.AI_ENGINE_PREFIX}_image_depth_estimation:v1.0.0`,
    ImageContext: {
        context: `${process.cwd()}/.docker/ai-engines/services/image/depth-estimation`,
        src: ['.', './requirements.txt']
    },
    InternalUrl: '/image-depth-estimation'
};

export let ImageImageClassificationDockerService: TAiDockerService = {
    Name: 'image_image_classification',
    Port: 5000,
    ImageName: `${DOCKER.AI_ENGINE_PREFIX}_image_classification:v1.0.0`,
    ImageContext: {
        context: `${process.cwd()}/.docker/ai-engines/services/image/image-classification`,
        src: ['.', './requirements.txt']
    },
    InternalUrl: '/image-image-classification'
};

export let ImageImageSegmentationDockerService: TAiDockerService = {
    Name: 'image_image_segmentation',
    Port: 5000,
    ImageName: `${DOCKER.AI_ENGINE_PREFIX}_image_segmentation:v1.0.0`,
    ImageContext: {
        context: `${process.cwd()}/.docker/ai-engines/services/image/image-segmentation`,
        src: ['.', './requirements.txt']
    },
    InternalUrl: '/image-image-segmentation'
};

export let ImageImageToTextDockerService: TAiDockerService = {
    Name: 'image_image_to_text',
    Port: 5000,
    ImageName: `${DOCKER.AI_ENGINE_PREFIX}_image_to_text:v1.0.0`,
    ImageContext: {
        context: `${process.cwd()}/.docker/ai-engines/services/image/image-to-text`,
        src: ['.', './requirements.txt']
    },
    InternalUrl: '/image-image-to-text'
};

export let ImageObjectDetectionDockerService: TAiDockerService = {
    Name: 'image_object_detection',
    Port: 5000,
    ImageName: `${DOCKER.AI_ENGINE_PREFIX}_image_object_detection:v1.0.0`,
    ImageContext: {
        context: `${process.cwd()}/.docker/ai-engines/services/image/object-detection`,
        src: ['.', './requirements.txt']
    },
    InternalUrl: '/image-object-detection'
};

export let ImageVisualQuestionAnsweringDockerService: TAiDockerService = {
    Name: 'image_visual_question_answering',
    Port: 5000,
    ImageName: `${DOCKER.AI_ENGINE_PREFIX}_image_visual_question_answering:v1.0.0`,
    ImageContext: {
        context: `${process.cwd()}/.docker/ai-engines/services/image/visual-question-answering`,
        src: ['.', './requirements.txt']
    },
    InternalUrl: '/image-visual-question-answering'
};

