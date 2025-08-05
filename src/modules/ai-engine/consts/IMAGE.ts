/**
 * Image processing pipelines extracted from ai-docker.rest
 * These represent the available image processing endpoints
 */


/**
 * Available image processing tasks
 */
export enum IMAGE_TASK {
    DEPTH_ESTIMATION = "depth-estimation",
    IMAGE_CLASSIFICATION = "image-classification",
    IMAGE_SEGMENTATION = "image-segmentation",
    IMAGE_TO_TEXT = "image-to-text",
    OBJECT_DETECTION = "object-detection",
    VISUAL_QUESTION_ANSWERING = "visual-question-answering"
}
