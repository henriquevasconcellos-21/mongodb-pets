# Stage 1: Build
FROM node:lts-alpine AS builder
# Upgrade packages to fix known vulnerabilities
RUN apk update && apk upgrade --no-cache
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Receive the API base URL at build time so Vite can bake it into the bundle
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

# Stage 2: Serve with Nginx
# Use alpine directly so nginx is apk-managed and fully patchable
FROM alpine:latest
RUN apk update && apk upgrade --no-cache && \
    apk add --no-cache nginx && \
    mkdir -p /usr/share/nginx/html /run/nginx

# Custom nginx config to handle SPA routing
# Alpine's nginx includes /etc/nginx/http.d/*.conf (not conf.d)
RUN printf 'server {\n\
    listen 80;\n\
    location / {\n\
        root /usr/share/nginx/html;\n\
        index index.html;\n\
        try_files $uri $uri/ /index.html;\n\
    }\n\
}\n' > /etc/nginx/http.d/default.conf

COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
