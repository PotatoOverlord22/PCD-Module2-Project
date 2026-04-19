FROM node:20-bookworm-slim
WORKDIR /app
COPY package*.json ./
RUN npm install --only=production
COPY index.js analytics.proto ./
EXPOSE 8080
CMD ["node", "index.js"]
