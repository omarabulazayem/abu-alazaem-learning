FROM node:22-bookworm-slim

WORKDIR /app

COPY . .

RUN tar -xzf source.tgz \
  && if [ -d patches-live ]; then cp -a patches-live/. .; fi \
  && corepack enable \
  && corepack prepare pnpm@10.15.1 --activate \
  && pnpm install --no-frozen-lockfile \
  && pnpm build

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "scripts/start.mjs"]
