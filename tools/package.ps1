$deployrepo = "c:\metal"

copy package.json "$deployrepo\package.json"
copy yarn.lock "$deployrepo\yarn.lock"
copy .yarnrc.yml "$deployrepo\.yarnrc.yml"

# studio
rclone sync "apps\studio\.output" "$deployrepo\apps\studio\.output" -P
rclone sync "apps\studio\.nuxt" "$deployrepo\apps\studio\.nuxt" -P
copy "apps\studio\package.json" "$deployrepo\apps\studio\package.json"
copy "apps\studio\start.mjs" "$deployrepo\apps\studio\start.mjs"
copy "apps\studio\.env" "$deployrepo\apps\studio\.env"

# server
rclone sync "apps\server\.output" "$deployrepo\apps\server\.output" -P
copy "apps\server\package.json" "$deployrepo\apps\server\package.json"
copy "apps\server\openapi.yml" "$deployrepo\apps\server\openapi.yml"

rclone sync "packages\config\.output" "$deployrepo\packages\config\.output" -P
copy "packages\config\package.json" "$deployrepo\packages\config\package.json"

rclone sync "packages\logger\.output" "$deployrepo\packages\logger\.output" -P
copy "packages\logger\package.json" "$deployrepo\packages\logger\package.json"

rclone sync "packages\persistent-map\.output" "$deployrepo\packages\persistent-map\.output" -P
copy "packages\persistent-map\package.json" "$deployrepo\packages\persistent-map\package.json"

rclone sync "packages\types\.output" "$deployrepo\packages\types\.output" -P
copy "packages\types\package.json" "$deployrepo\packages\types\package.json"

rclone sync "packages\utils\.output" "$deployrepo\packages\utils\.output" -P
copy "packages\utils\package.json" "$deployrepo\packages\utils\package.json"