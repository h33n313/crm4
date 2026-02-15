# مرحله اول: بیلد کردن فرانت‌ند
FROM node:20-alpine as build-stage
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# مرحله دوم: آماده‌سازی محیط اجرا (Production)
FROM node:20-alpine
WORKDIR /app

# نصب فقط نیازمندی‌های سمت سرور
COPY package*.json ./
RUN npm install --only=production

# کپی فایل‌های بیلد شده از مرحله قبل به پوشه dist
COPY --from=build-stage /app/dist ./dist
# کپی فایل سرور اصلی
COPY --from=build-stage /app/server.js ./

# ایجاد پوشه آپلودها برای جلوگیری از خطا
RUN mkdir -p uploads

# باز کردن پورت ۴۰۰۰ (پورت پیش‌فرض شما)
EXPOSE 4000

# اجرای سرور
CMD ["node", "server.js"]
