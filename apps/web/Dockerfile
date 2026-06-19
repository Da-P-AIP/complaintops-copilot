# Cloud Run デプロイ用（ビルドコンテキスト = apps/web。Webは単体で完結）
FROM node:20-slim

WORKDIR /app
COPY package.json ./
RUN npm install

COPY . ./

# ブラウザが叩くAPIのURL（ビルド時に埋め込まれる）。デプロイ時に --build-env で上書き可。
ARG NEXT_PUBLIC_API_BASE=https://complaintops-api-554218173303.asia-northeast1.run.app
ENV NEXT_PUBLIC_API_BASE=$NEXT_PUBLIC_API_BASE
RUN npm run build

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080
CMD ["npm", "run", "start"]
