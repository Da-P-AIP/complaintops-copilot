# Cloud Run 向け（「とどける」の担保）。MVPは tsx 直実行で十分。
FROM node:20-slim

WORKDIR /app
RUN npm install -g pnpm@9

# workspace のメタ情報
COPY pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages ./packages
COPY apps/api ./apps/api

RUN pnpm install --no-frozen-lockfile

ENV PORT=8080
EXPOSE 8080
CMD ["pnpm", "--filter", "@complaintops/api", "start"]
