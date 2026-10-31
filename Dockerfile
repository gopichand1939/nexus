FROM node:24-bookworm-slim AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/package.json
COPY frontend/package.json ./frontend/package.json
RUN npm ci --no-audit --no-fund

FROM dependencies AS web-build
COPY frontend ./frontend
RUN npm run build -w frontend

FROM nginx:1.28-alpine AS web
COPY infra/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=web-build /app/frontend/dist /usr/share/nginx/html
EXPOSE 80

FROM dependencies AS api
ENV NODE_ENV=production
COPY --chown=node:node backend ./backend
RUN npm prune --omit=dev --workspace=backend
USER node
EXPOSE 3000
CMD ["node","backend/src/server.js"]
