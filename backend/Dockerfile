# Stage 1: Build
FROM node:lts-alpine AS builder
# Upgrade packages to fix known vulnerabilities
RUN apk update && apk upgrade --no-cache
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Production
FROM node:lts-alpine
RUN apk update && apk upgrade --no-cache
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
# Only install production dependencies to keep the image small
RUN npm ci --omit=dev

# Security: Don't run as root
USER node
EXPOSE 3000
CMD ["node", "dist/main"]
