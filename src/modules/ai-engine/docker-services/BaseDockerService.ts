//
//
//
import { TAiDockerService } from '../types/TAiDockerService';
import { DOCKER } from '../consts/DOCKER';


//
export const BaseDockerService: TAiDockerService = {
    Name: 'base-text',
    ImageName: `${DOCKER.AI_ENGINE_PREFIX}-base-text:1.0.0`,
    ImageContext: {
        context: `${process.cwd()}/.docker/ai-engines/services/base/text`,
        src: ['.']
    }
};