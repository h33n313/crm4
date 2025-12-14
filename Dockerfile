# استفاده از نسخه سبک Node
FROM node:18-alpine

# تنظیم دایرکتوری کار
WORKDIR /app

# کپی کردن فقط package.json (بدون package-lock.json برای جلوگیری از ارور ورژن)
COPY package.json ./

# نصب پکیج‌ها
# این دستور حالا آخرین نسخه @google/genai را دانلود می‌کند چون در پکیج json ستاره گذاشتیم
RUN npm install

# کپی کردن بقیه فایل‌ها
COPY . .

# ساخت بیلد فرانت‌اند
RUN npm run build

# ساخت پوشه‌های مورد نیاز برای دیتابیس لوکال و آپلودها
RUN mkdir -p uploads

# پورت
EXPOSE 4000

# دستور اجرا
CMD ["node", "server.js"]
