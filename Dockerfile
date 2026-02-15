# مرحله ۱: بیلد کردن فرانت‌ند
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# مرحله ۲: آماده‌سازی محیط اجرا برای سرور Node.js
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --only=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.js ./
RUN mkdir -p uploads
EXPOSE 4000
CMD ["node", "server.js"]
