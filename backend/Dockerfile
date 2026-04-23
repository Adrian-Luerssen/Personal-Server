# Backend Dockerfile - builds and runs the Nest.js application
FROM node:22-alpine AS build
WORKDIR /usr/src/app
COPY package.json package-lock.json* ./
RUN npm install --production=false
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /usr/src/app
COPY --from=build /usr/src/app/dist ./dist
COPY --from=build /usr/src/app/docs ./docs
COPY --from=build /usr/src/app/docs ./docs
COPY package.json package-lock.json* ./
RUN npm install --production 
ENV PORT=3000
EXPOSE 3000
CMD ["npm", "run", "start:prod"]
