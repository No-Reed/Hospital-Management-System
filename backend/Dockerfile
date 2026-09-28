FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY index.js firebase.js authorization.js audit.js ./
COPY middleware ./middleware
COPY models ./models
COPY scripts ./scripts

ENV NODE_ENV=production
EXPOSE 4000

CMD ["node", "index.js"]
