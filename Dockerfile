# استفاده از نسخه سبک و پایدار Node.js
FROM node:18-alpine

# تنظیم پوشه کاری
WORKDIR /app

# کپی کردن فایل تنظیمات پکیج
COPY package.json ./

# نصب پکیج‌ها (بدون کپی کردن فایل قفل معیوب)
RUN npm install

# کپی کردن تمام فایل‌های پروژه
COPY . .

# ساخت بیلد نهایی پروژه (Front-end)
RUN npm run build

# پورت برنامه
EXPOSE 4000

# دستور اجرا
CMD ["node", "server.js"]
