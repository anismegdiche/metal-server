import z from "zod"
import { z_U__storage_azblob } from "./U__storage_azblob"
import { z_U__storage_azdatalake } from "./U__storage_azdatalake"
import { z_U__storage_azfs } from "./U__storage_azfs"
import { z_U__storage_fs } from "./U__storage_fs"
import { z_U__storage_ftp } from "./U__storage_ftp"
import { z_U__storage_s3 } from "./U__storage_s3"
import { z_U__storage_sftp } from "./U__storage_sftp"

export const z_U__storage = z.discriminatedUnion("storage-type", [
	z_U__storage_fs,
	z_U__storage_ftp,
	z_U__storage_azblob,
	z_U__storage_azfs,
	z_U__storage_azdatalake,
	z_U__storage_s3,
	z_U__storage_sftp,
])

export type U__storage = z.infer<typeof z_U__storage>
