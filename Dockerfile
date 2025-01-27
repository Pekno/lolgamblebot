FROM node:latest
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
RUN npm run build
COPY ./dist .
CMD [ "node", "./main/main.js" ]