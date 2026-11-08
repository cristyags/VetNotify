FROM node:24.22.2-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY tsconfig.json ./
COPY apps apps
COPY clients clients
COPY packages packages
COPY scripts/build-api.mjs scripts/migrate.ts scripts/seed.ts scripts/probe.mjs scripts/
RUN node scripts/build-api.mjs && npm prune --omit=dev --ignore-scripts --no-audit --no-fund

FROM node:24.22.2-bookworm-slim
ARG REVISION=local
LABEL org.opencontainers.image.title="VetNotify backend" org.opencontainers.image.revision=$REVISION
WORKDIR /app
ENV NODE_ENV=production REVISION=$REVISION
RUN apt-get update \
 && apt-get install -y --no-install-recommends --only-upgrade apt libapt-pkg6.0 libpcre2-8-0 perl-base \
 && rm -rf /var/lib/apt/lists/* /usr/local/lib/node_modules /opt/yarn-v* \
 && rm -f /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack /usr/local/bin/yarn /usr/local/bin/yarnpkg
COPY --from=build --chown=node:node /app/package.json ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist-api ./dist-api
COPY --from=build --chown=node:node /app/scripts/probe.mjs ./scripts/probe.mjs
USER node
EXPOSE 8080
CMD ["node", "dist-api/apps/api/src/index.js"]
