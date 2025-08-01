import Docker from 'dockerode';
import { TJson } from '../../../types/TJson';


export type TAiDockerService = {
    Name: string;
    InstanceName?: string;
    Port: number;
    ImageName: string;
    ImageContext?: Docker.ImageBuildContext;
    DockerVolume?: string;
    Options?: TJson;
    InternalUrl?: string;
};
