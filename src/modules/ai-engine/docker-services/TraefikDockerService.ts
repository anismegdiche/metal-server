//
//
//
import { TAiDockerService } from '../types/TAiDockerService';
import { DOCKER } from '../consts/DOCKER';


//
export let TraefikDockerService: TAiDockerService = {
    Name: `${DOCKER.AI_ENGINE_PREFIX}_traefik`,
    ImageName: 'traefik:v2.11',
    DockerVolume: '/var/run/docker.sock:/var/run/docker.sock:ro', // '\\\.\\pipe\\docker_engine:\\\.\\pipe\\docker_engine:ro'
    Port: 5000,
    Options: {
        DashboardPort: 8080
    }
};
