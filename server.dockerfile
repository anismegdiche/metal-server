# Common image version
ARG NODE_IMAGE=node:24.16.0-alpine
ARG METAL_FOLDER=/metal
ARG SERVER_FOLDER=apps/server
ARG SERVER_PORT=3000
ARG PACKAGES_FOLDER=packages

# Build Stage
FROM ${NODE_IMAGE} AS build

ARG METAL_FOLDER
ARG SERVER_FOLDER

WORKDIR ${METAL_FOLDER}

RUN corepack enable

# Copy workspace manifests for dependency resolution
COPY package.json yarn.lock .yarnrc.yml ./
COPY tsconfig.common.json ./
COPY .yarn ./.yarn
COPY apps ./apps
COPY packages ./packages

# Install dependencies (all workspaces)
RUN yarn install

# Build only the server
RUN yarn workspaces foreach \
  --from @metal/server \
  -Rt \
  run build

# Prune node_modules to the server production dependencies only
# RUN yarn workspaces focus @metal/server --production

# Runtime Stage
FROM ${NODE_IMAGE}

ARG METAL_FOLDER
ARG SERVER_FOLDER
ARG SERVER_PORT
ARG PACKAGES_FOLDER

# Copy production dependencies
COPY --from=build ${METAL_FOLDER}/node_modules ${METAL_FOLDER}/node_modules

# Copy server production bundle
COPY --from=build ${METAL_FOLDER}/${SERVER_FOLDER}/.output ${METAL_FOLDER}/${SERVER_FOLDER}/.output
COPY --from=build ${METAL_FOLDER}/${SERVER_FOLDER}/package.json ${METAL_FOLDER}/${SERVER_FOLDER}/package.json
COPY --from=build ${METAL_FOLDER}/${SERVER_FOLDER}/openapi.yml ${METAL_FOLDER}/${SERVER_FOLDER}/openapi.yml

COPY --from=build ${METAL_FOLDER}/${PACKAGES_FOLDER}/config/.output      ${METAL_FOLDER}/${PACKAGES_FOLDER}/config/.output
COPY --from=build ${METAL_FOLDER}/${PACKAGES_FOLDER}/config/package.json ${METAL_FOLDER}/${PACKAGES_FOLDER}/config/package.json

COPY --from=build ${METAL_FOLDER}/${PACKAGES_FOLDER}/logger/.output      ${METAL_FOLDER}/${PACKAGES_FOLDER}/logger/.output
COPY --from=build ${METAL_FOLDER}/${PACKAGES_FOLDER}/logger/package.json ${METAL_FOLDER}/${PACKAGES_FOLDER}/logger/package.json

COPY --from=build ${METAL_FOLDER}/${PACKAGES_FOLDER}/persistent-map/.output      ${METAL_FOLDER}/${PACKAGES_FOLDER}/persistent-map/.output
COPY --from=build ${METAL_FOLDER}/${PACKAGES_FOLDER}/persistent-map/package.json ${METAL_FOLDER}/${PACKAGES_FOLDER}/persistent-map/package.json

COPY --from=build ${METAL_FOLDER}/${PACKAGES_FOLDER}/types/.output      ${METAL_FOLDER}/${PACKAGES_FOLDER}/types/.output
COPY --from=build ${METAL_FOLDER}/${PACKAGES_FOLDER}/types/package.json ${METAL_FOLDER}/${PACKAGES_FOLDER}/types/package.json

COPY --from=build ${METAL_FOLDER}/${PACKAGES_FOLDER}/utils/.output      ${METAL_FOLDER}/${PACKAGES_FOLDER}/utils/.output
COPY --from=build ${METAL_FOLDER}/${PACKAGES_FOLDER}/utils/package.json ${METAL_FOLDER}/${PACKAGES_FOLDER}/utils/package.json

# Copy root config and environment
COPY .env.example ${METAL_FOLDER}/

# Server resolves paths relative to its cwd (apps/server) and the workspace root (../..)
WORKDIR ${METAL_FOLDER}/${SERVER_FOLDER}

EXPOSE ${SERVER_PORT}

CMD ["node", "./.output/index.js"]
