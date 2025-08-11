# PANTOhealth IoT — Producer & Backend (Shared README)

## مروری کوتاه
این مخزن دو بخش دارد:
- `backend` — یک اپلیکیشن **NestJS** که:
  - به RabbitMQ متصل می‌شود و صف `x-ray` را assert و consume می‌کند.
  - پیام‌ها را پردازش کرده و به یک کالکشن `signals` در MongoDB ذخیره می‌کند.
  - API REST برای خواندن/نوشتن/حذف سیگنال‌ها فراهم می‌کند (مستندسازی با Swagger). :contentReference[oaicite:2]{index=2}

- `producer` — ساده‌ترین اپلیکیشن (Node/TypeScript یا JS) که نمونه‌های x-ray را به صف `x-ray` می‌فرستد. نمونه داده در `x-ray.json` موجود است. :contentReference[oaicite:3]{index=3}

---

## پیش‌نیازها (روی ماشین dev / WSL)
- Docker & Docker Compose (برای راحتی می‌توان از کانتینر Mongo و RabbitMQ استفاده کرد)
- Node.js >= 18 (یا نسخه‌ی پروژه)
- npm / npx
- (اختیاری) `ts-node` و `typescript` برای اجرای فایل‌های TS در producer

---

## ساختار پیشنهادی مخزن
```
/
├─ backend/            # NestJS project
│  ├─ src/
│  ├─ package.json
│  └─ .env.example
├─ producer/           # Simple producer app (ts or js)
│  ├─ src/
│  ├─ package.json
│  └─ x-ray.json
└─ README.md
```

---

## متغیرهای محیطی (مثال `.env` در هر پروژه)

**backend/.env**
```
PORT=3000
MONGO_URL=mongodb://localhost:27017/pantodb
RABBITMQ_URL=amqp://guest:guest@localhost:5672
LOG_LEVEL=debug
```

**producer/.env**
```
RABBITMQ_URL=amqp://guest:guest@localhost:5672
SAMPLE_FILE=./x-ray.json
COUNT=1
INTERVAL_MS=0
```

---

## راه‌اندازی سریع با Docker (CLI commands — WSL)

1. راه‌اندازی MongoDB:
```bash
# در صورتی که کانتینر وجود دارد، حذف اجباری
docker rm -f mongo-panto 2>/dev/null || true
# اجرا
docker run -d --rm --name mongo-panto -p 27017:27017 mongo:6
# بررسی وضعیت
docker ps --filter name=mongo-panto --format "table {{.ID}}\t{{.Names}}\t{{.Status}}\t{{.Ports}}"
```

2. راه‌اندازی RabbitMQ (management UI روی پورت 15672):
```bash
docker rm -f rabbitmq-panto 2>/dev/null || true
docker run -d --rm --name rabbitmq-panto -p 5672:5672 -p 15672:15672 rabbitmq:3-management
# بررسی وضعیت
docker ps --filter name=rabbitmq-panto --format "table {{.ID}}\t{{.Names}}\t{{.Status}}\t{{.Ports}}"
# بررسی لاگ‌ها برای اطمینان از بالا آمدن
docker logs --tail 200 rabbitmq-panto
```

> اگر خطای `Conflict: container name ... already in use` دیدی، دستور `docker rm -f rabbitmq-panto` رو اجرا کن (همون کاری که قبلاً انجام دادی).

---

## راه‌اندازی Backend (NestJS) — CLI

1. وارد فولدر backend شو:
```bash
cd ~/panto-backend/backend
```

2. نصب وابستگی‌ها (یکبار):
```bash
npm install
```

3. نمونه `.env` را ایجاد یا ویرایش کن (مطابق بالا).

4. اجرا در حالت توسعه (watch):
```bash
npm run start:dev
# یا اگر اسکریپت متفاوت است:
# npx nest start --watch
```

5. انتظار لاگ‌های مشابه:
```
[Nest] ... LOG [NestFactory] Starting Nest application...
[RabbitmqService] Connected and queue asserted: x-ray
[RabbitmqService] Consumer started for queue: x-ray
[Nest] ... LOG [NestApplication] Nest application successfully started
App listening on http://localhost:3000
Swagger UI: http://localhost:3000/docs
Swagger JSON: http://localhost:3000/docs-json
```
(این لاگ‌ها نشان‌دهنده‌ی اتصال به RabbitMQ و راه‌اندازی consumer هستند). :contentReference[oaicite:4]{index=4}

---

## راه‌اندازی Producer — CLI

(یک نمونه ساده در `producer/src/send.ts` یا `producer/send-sample.js` درج شده است که از `amqplib` استفاده می‌کند.)

1. وارد پوشه producer شو:
```bash
cd ~/panto-backend/producer
npm install
```

2. اگر فایل TypeScript دارید:
```bash
# اجرا با ts-node (یا از قبل npx در npm script تعریف کن)
npx ts-node src/send.ts --file ./x-ray.json --count 1 --interval 0
```

یا اگر جاوااسکریپت:
```bash
node send-sample.js
# خروجی نمونه:
# [send-sample] sent sample to queue x-ray
```

3. اگر می‌خواهی تعداد بیشتری پیام پشت سر هم بفرستی:
```bash
node send-sample.js  # یا با فلگ --count 10
```

---

## بررسی وضعیت صف و consumers (RabbitMQ management HTTP API — CLI)
(همان چیزی که در کار تو تست کردی)

```bash
# بررسی جزئیات صف x-ray
curl -s -u guest:guest http://localhost:15672/api/queues/%2f/x-ray | jq .

# یا بدون jq
curl -s -u guest:guest http://localhost:15672/api/queues/%2f/x-ray
```

خروجی باید نشان دهد `consumers: 1` و `state: "running"` و آمار publish/deliver. مثال خروجی مورد انتظار در تست‌های تو نمایش داده شد.

---

## بررسی ذخیره‌سازی در MongoDB (با mongo shell یا یک اسکریپت node)

1. با استفاده از `mongosh` در کانتینر:
```bash
docker exec -it mongo-panto mongosh --eval 'db.signals.find().sort({createdAt:-1}).limit(5).pretty()'
```

2. یا با یک اسکریپت node ساده (`check-mongo.js`) که در پروژه backend قرار دادیم:
```bash
node check-mongo.js
# خروجی مثال:
# found 2 documents:
# [ { deviceId: '66bb584d4ae73e488c30a072', time: 1735683480000, dataLength: 563, ... }, ... ]
```

---

## API (مستندات Swagger)
پس از اجرای backend، به آدرس‌ها مراجعه کن:
- Swagger UI: `http://localhost:3000/docs`
- Swagger JSON: `http://localhost:3000/docs-json`

در مستندات API باید эндپوینت‌های زیر وجود داشته باشند:
- `GET /signals` — لیست سیگنال‌ها (قابلیت فیلتر اختیاری).
- `GET /signals/:id` — دریافت یک سیگنال.
- `POST /signals` — ایجاد سیگنال (اگر لازم باشد).
- `DELETE /signals/:id` — حذف یک سیگنال.

(پیاده‌سازی دقیق مطابق دستورالعمل‌های Part 3 در تکلیف). :contentReference[oaicite:5]{index=5}

---

## تست پذیرفتنی (Acceptance / Quick checks)
اجرای این فرمان‌ها و ارسال لاگ‌ها به من برای تایید مرحله 1 کافی است:

1. اجرا کن: `docker ps` — مطمئن شو `mongo-panto` و `rabbitmq-panto` در حال اجرا هستند.
```bash
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

2. لاگ RabbitMQ:
```bash
docker logs --tail 200 rabbitmq-panto
# انتظار: management plugin و listen on ports 5672/15672
```

3. لاگ backend (در ترمینالت که `npm run start:dev` رو اجرا کردی): کپی از خطوطی که شامل:
- `RabbitmqService Connected and queue asserted: x-ray`
- `RabbitmqService Consumer started for queue: x-ray`
- `Nest application successfully started`

(چون اینها مبنای Part 1 هستند). :contentReference[oaicite:6]{index=6}

4. اجرای producer و خروجی آن:
```bash
# در پوشه producer
npx ts-node src/send.ts --file ./x-ray.json --count 2
# یا node send-sample.js
# بررسی خروجی: "[send-sample] sent sample to queue x-ray"
```

5. بررسی صف بعد از ارسال پیام‌ها:
```bash
curl -s -u guest:guest http://localhost:15672/api/queues/%2f/x-ray | jq .
# انتظار: publish count افزایش یافته، (در صورت consume فوری ممکن است queue خالی شود)
```

6. بررسی Mongo (که consumer پیام‌ها را ذخیره کرده):
```bash
# در backend
node check-mongo.js
# خروجی: تعداد اسناد recent (0 یا >0 بسته به اینکه consumer پیام‌ها را پردازش کرده باشد)
```

لطفاً خروجیِ این فرمان‌ها (متن کامل لاگ‌های مرتبط) رو اینجا paste کن؛ من بررسی می‌کنم که مرحله 1 با موفقیت انجام شده یا اگر نکته‌ای هست راهنمایی دقیق می‌کنم.

---

## نکات و «توصیه‌های خطا» که ممکنه باهاش روبرو بشی
- خطای `Conflict. The container name "/rabbitmq-panto" is already in use` → `docker rm -f rabbitmq-panto` سپس دوباره run. (همون کاری که خودت انجام دادی.)
- اگر consumer به صف وصل نمی‌شود: چک کن `RABBITMQ_URL` در `.env` درست باشد و backend قبل از RabbitMQ بالا نیامده باشد.
- اگر `mongosh` داخل کانتینر خطا داد که `mongo` پیدا نشد: از `mongosh` (نسخه جدید) استفاده کن یا از اسکریپت node برای اتصال مستقیم به `MONGO_URL`.

---

## نکته در مورد گیت و کامیت (پیشنهاد commit message برای تغییرات اخیر)
برای تغییرات اخیر (اضافه شدن producer/send script و RabbitMQ consumer) این message پیشنهادی دقیق و حرفه‌ای است:

```
feat: add RabbitMQ consumer & producer sample + Mongo persistence

- Implement RabbitMQ module in backend: connect, assert 'x-ray' queue and start consumer.
- Add Signals schema & service to persist processed x-ray messages to MongoDB.
- Add producer script (producer/src/send.ts / send-sample.js) to publish sample x-ray messages (uses x-ray.json).
- Add check-mongo.js helper for quick DB verification.
- Add Swagger docs exposure at /docs and /docs-json.
- Update README with setup and verification steps.
```

---

اگر بخواهی، من الآن:
1. همین README را در یک فایل `README.md` برات می‌سازم (متن بالا) — و/یا  
2. یک **commit message** آماده و دقیق همراه با `git` commands برای push به گیت‌هاب می‌نویسم (مثلاً `git add . && git commit -m "..." && git push origin branch`)، یا  
3. ادامه مرحله‌ اول را با چک خروجی‌هایی که فرستادی بررسی کنم و تأیید نهایی بدم.

کدوم‌شو می‌خوای انجام بدم؟
