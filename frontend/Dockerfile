# Frontend Dockerfile: build with npm/vite then serve with nginx
FROM node:22-alpine as build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
# default API base; can be overridden at build time with --build-arg VITE_API_BASE
ARG VITE_API_BASE=http://localhost:3000/api
ENV VITE_API_BASE=$VITE_API_BASE
RUN npm run build

FROM nginx:stable-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
# Custom nginx config enables SPA routing fallback to index.html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
