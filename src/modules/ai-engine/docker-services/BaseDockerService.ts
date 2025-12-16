//
//
//
import { TAiDockerService } from '../types/TAiDockerService';
import { DOCKER } from '../consts/DOCKER';


//
export const BaseDockerService: TAiDockerService = {
    Name: 'base',
    ImageName: `${DOCKER.AI_ENGINE_PREFIX}-base:v1.0.0`,
    ImageContext: {
        context: `${process.cwd()}/.docker/ai-engines/services/base`,
        src: ['.']
    }
};