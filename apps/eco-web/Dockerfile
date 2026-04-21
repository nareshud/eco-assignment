FROM node:22-alpine

WORKDIR /app

COPY package.json ./
COPY server.js ./
COPY scripts ./scripts
COPY public ./public

RUN node scripts/build.cjs

RUN mkdir -p /data && chown node:node /data

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

USER node

CMD ["node", "server.js"]
