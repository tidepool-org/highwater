FROM node:10.4-2-alpine

RUN apk --no-cache update && \
    apk --no-cache upgrade

WORKDIR /app

COPY package.json package.json

RUN yarn install && \
    yarn cache clean

USER node

COPY . .

CMD ["npm", "start"]
