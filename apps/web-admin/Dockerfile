FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
COPY apps/web-admin/package*.json ./apps/web-admin/
RUN npm ci --ignore-scripts

COPY apps/web-admin ./apps/web-admin

ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_TELEMETRY_DISABLED=1

RUN cd apps/web-admin && npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /app/apps/web-admin/.next/standalone ./
COPY --from=builder /app/apps/web-admin/.next/static ./apps/web-admin/.next/static
COPY --from=builder /app/apps/web-admin/public ./apps/web-admin/public

EXPOSE 3001
ENV PORT=3001
ENV HOSTNAME=0.0.0.0

CMD ["node", "apps/web-admin/server.js"]
