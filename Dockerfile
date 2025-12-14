# استفاده از نسخه سبک و پایدار Alpine
FROM node:18-alpine

# تنظیم پوشه کاری
WORKDIR /app

# فقط فایل تنظیمات پکیج کپی می‌شود (بدون فایل قفل برای جلوگیری از تضاد)
COPY package.json ./

# نصب پکیج‌ها به صورت استاندارد
RUN npm install

# کپی کردن تمام فایل‌های پروژه
COPY . .

# ساخت بیلد نهایی پروژه
RUN npm run build

# ساخت پوشه آپلود (اختیاری ولی برای اطمینان خوب است)
RUN mkdir -p uploads

# پورت برنامه
EXPOSE 4000

# دستور اجرا
CMD ["node", "server.js"]

