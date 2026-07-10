//
//
//
import type { ImageBuildContext } from "dockerode"
//
import type { TJson } from "../../../types/TJson"
import type { Mutex } from "../../../utils/Mutex"

//
export type TAiDockerService = {
	Name: string
	InstanceName?: string
	Port?: number
	ImageName: string
	ImageContext?: ImageBuildContext
	DockerVolume?: string[]
	Options?: TJson
	InternalUrl?: string
	Lock?: Mutex
	PipeLoaded?: boolean
	IdleSince?: number
}
