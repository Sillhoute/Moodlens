FROM node:22-alpine

ENV NODE_ENV=production
WORKDIR /app

# package*.json disalin lebih dulu agar layer dependency tetap ter-cache
# selama dependency tidak berubah.
COPY package*.json ./
RUN npm ci --omit=dev

COPY src ./src

USER node
EXPOSE 3000

CMD ["node", "src/server.js"]
