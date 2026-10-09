FROM node:22-slim
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
RUN npm ci -w @screen-share/api --omit=dev
COPY apps/api apps/api
WORKDIR /app/apps/api
EXPOSE 3000
CMD ["npx", "tsx", "src/index.ts"]
