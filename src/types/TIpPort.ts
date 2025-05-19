//
//
//
//
import { tags } from 'typia'

//
export type TIpPort =
    & number
    & tags.Type<'uint32'>
    & tags.Minimum<1>
    & tags.Maximum<65_535>
