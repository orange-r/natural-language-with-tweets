FROM amazon/aws-lambda-nodejs:12

COPY package*.json ./
COPY tsconfig.json ./
COPY src/ src/

RUN npm install
RUN ./node_modules/.bin/tsc

CMD [ "dist/index.handler" ]
