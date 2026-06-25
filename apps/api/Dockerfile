FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
RUN npm ci --workspace=apps/api --include-workspace-root
COPY apps/api ./apps/api
COPY node_modules ./node_modules
RUN cd apps/api && node --max-old-space-size=4096 node_modules/.bin/nest build
EXPOSE 3000
CMD ["node", "apps/api/dist/src/main.js"]
