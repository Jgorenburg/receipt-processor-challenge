FROM node:alpine3.10

WORKDIR /app

COPY package*.json ./

RUN npm install
RUN npm install body-parser

COPY . .
EXPOSE 8080

CMD ["node", "app.js"]