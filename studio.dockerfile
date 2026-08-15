# Common image version
ARG NODE_IMAGE=node:24.16.0-alpine
ARG METAL_FOLDER=/metal
ARG STUDIO_FOLDER=apps/studio
ARG STUDIO_PORT=5000
ARG PACKAGES_FOLDER=packages

# Build Stage
FROM ${NODE_IMAGE} AS build

ARG METAL_FOLDER
ARG STUDIO_FOLDER

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

# Build only Studio
RUN yarn workspace @metal/studio build
RUN yarn workspace @metal/config build

# Runtime Stage
FROM ${NODE_IMAGE}

ARG METAL_FOLDER
ARG STUDIO_FOLDER
ARG STUDIO_PORT
ARG PACKAGES_FOLDER

# Copy Nuxt production bundle
WORKDIR ${METAL_FOLDER}/${STUDIO_FOLDER}
COPY --from=build ${METAL_FOLDER}/${STUDIO_FOLDER}/.output ./.output
COPY --from=build ${METAL_FOLDER}/${STUDIO_FOLDER}/.env ./
COPY --from=build ${METAL_FOLDER}/${STUDIO_FOLDER}/start.mjs ./

# copy roots files
WORKDIR ${METAL_FOLDER}
COPY --from=build ${METAL_FOLDER}/package.json ./
# start.mjs loads .env from the cwd, so expose the studio env at the container root
COPY --from=build ${METAL_FOLDER}/${STUDIO_FOLDER}/.env ${METAL_FOLDER}/.env

COPY --from=build ${METAL_FOLDER}/${PACKAGES_FOLDER}/config/.output      ${METAL_FOLDER}/${PACKAGES_FOLDER}/config/.output
COPY --from=build ${METAL_FOLDER}/${PACKAGES_FOLDER}/config/package.json ${METAL_FOLDER}/${PACKAGES_FOLDER}/config/package.json

ENV PORT=${STUDIO_PORT}
ENV HOST=0.0.0.0

EXPOSE ${STUDIO_PORT}

CMD ["node", "apps/studio/start.mjs"]
