FROM node:22-bookworm-slim

WORKDIR /app

# Public Vite configuration is embedded into the client bundle at build time.
# Only the Supabase publishable key belongs here; never expose a secret/service-role key.
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ARG VITE_ANALYTICS_ENDPOINT
ARG VITE_ANALYTICS_WEBSITE_ID
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY
ENV VITE_ANALYTICS_ENDPOINT=$VITE_ANALYTICS_ENDPOINT
ENV VITE_ANALYTICS_WEBSITE_ID=$VITE_ANALYTICS_WEBSITE_ID

COPY . .

RUN tar -xzf source.tgz \
  && if [ -d patches-live ]; then cp -a patches-live/. .; fi \
  && corepack enable \
  && corepack prepare pnpm@10.15.1 --activate \
  && pnpm install --no-frozen-lockfile \
  && pnpm build

ENV NODE_ENV=production

EXPOSE 10000

CMD ["node", "scripts/start.mjs"]
