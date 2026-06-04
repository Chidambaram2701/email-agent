# Stage 1: Build the React application
FROM node:18-alpine AS build

WORKDIR /app

COPY package.json package-lock.json* ./

RUN npm install

COPY . .

# Build production bundle
RUN npm run build

# Stage 2: Serve using Nginx
FROM nginx:stable-alpine

COPY --from=build /app/dist /usr/share/nginx/html

# Copy custom nginx config if we want to support React Router routing fallbacks (standard SPA)
RUN echo 'server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
