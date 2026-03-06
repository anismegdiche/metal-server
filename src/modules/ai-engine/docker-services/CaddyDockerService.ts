//
//
//

import { DOCKER } from "../consts/DOCKER"
import type { TAiDockerService } from "../types/TAiDockerService"

//
export const CaddyDockerService: TAiDockerService = {
	Name: `${DOCKER.AI_ENGINE_PREFIX}-caddy`,
	ImageName: "lucaslorentz/caddy-docker-proxy:ci-alpine",
	DockerVolume: ["/var/run/docker.sock:/var/run/docker.sock:ro"],
	Port: 5000,
	Options: {
		DashboardPort: 2019, // Caddy admin API port
	},
}
