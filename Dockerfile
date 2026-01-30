# استفاده از نسخه سبک و پایدار Node.js
FROM node:18-alpine

# تنظیم دایرکتوری کاری
WORKDIR /app

# کپی کردن فایل‌های پکیج برای استفاده از کش داکر
COPY package*.json ./

# نصب وابستگی‌ها
RUN npm install

# کپی کردن تمام کدها به داخل کانتینر
COPY . .

# ساخت بیلد نهایی فرانت‌ند
RUN npm run build

# ایجاد پوشه آپلود
RUN mkdir -p uploads

# باز کردن پورت ۴۰۰۰
EXPOSE 4000

# اجرای سرور
CMD ["npm", "start"]
