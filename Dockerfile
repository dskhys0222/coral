FROM node:22-alpine

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci

COPY . .

RUN npm run build
RUN npm ci --omit=dev

CMD ["node", "dist/app.js"]
