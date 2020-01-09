FROM node:lts-alpine

ENV YARN_VERSION=latest

# Install yarn
# libc6-compat => in case of `process.dlopen`
RUN apk add --no-cache libc6-compat curl bash gnupg && touch $HOME/.profile && curl -o- -L https://yarnpkg.com/install.sh | bash

ARG NODE_ENV=production
ENV NODE_ENV $NODE_ENV

WORKDIR /app
COPY package.json .
RUN cd /app && yarn install && yarn build
COPY . .

# CMD [ "npm", "start" ]
