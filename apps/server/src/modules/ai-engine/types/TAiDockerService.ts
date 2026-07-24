//
//
//
import type { ImageBuildContext } from "dockerode"
//
import type { TJson } from "@metal/types"
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
