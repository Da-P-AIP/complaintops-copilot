# Cloud Run デプロイ用（ビルドコンテキスト = リポジトリroot）
# gcloud run deploy --source . がこのDockerfileを使う
FROM node:20-slim

WORKDIR /app
RUN npm install -g pnpm@9

# workspace メタ + 必要パッケージのみ
COPY pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages ./packages
COPY apps/api ./apps/api

# api と shared だけ解決（tsx等のdevDepも含めて入れる = 本番でtsx実行）
RUN pnpm install --no-frozen-lockfile --filter "@complaintops/api..."

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

CMD ["pnpm", "--filter", "@complaintops/api", "start"]
