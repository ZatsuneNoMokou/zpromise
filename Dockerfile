FROM node:lts-alpine

# Install yarn
# libc6-compat => in case of `process.dlopen`
apk add --no-cache libc6-compat yarn

ARG NODE_ENV=production
ENV NODE_ENV $NODE_ENV

WORKDIR /usr/src/app
COPY package.json .
RUN yarn install
RUN yarn build
COPY . .

# CMD [ "npm", "start" ]
