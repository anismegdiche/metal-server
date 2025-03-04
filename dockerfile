##
# Docker testing image for Metal
##

FROM node:22.10.0
LABEL org.opencontainers.image.authors="Anis Megdiche <anis.megdiche@gmail.com>"

# Create app directory
RUN mkdir -p /app
WORKDIR /app

COPY package.json /app
COPY tsconfig.json /app
COPY *.md /app
COPY jest* /app

RUN npm install
# RUN npm install -g bcrypt
# typia
RUN npm run _typia-prepare || npm run typia-prepare

# Run tests
# CMD ["npm", "run", "test"]
