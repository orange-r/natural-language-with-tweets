FROM amazon/aws-lambda-nodejs:12

# GCP
ENV GOOGLE_APPLICATION_CREDENTIALS /var/task/google_application_credentials.json

COPY package*.json ./
COPY tsconfig.json ./
COPY src/ src/

# GCP
COPY google_application_credentials.json ./

RUN npm install
RUN ./node_modules/.bin/tsc

CMD [ "dist/index.handler" ]
