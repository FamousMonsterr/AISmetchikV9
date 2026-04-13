# Beget S3: настройка и шаблон переменных

Эта памятка дополняет существующие инструкции по Cloud.ru. Здесь — только специфика Beget S3.

## Базовые параметры Beget S3
- Endpoint: `https://storage.beget.com`
- Region: `ru-msk` (используйте значение из панели Beget, если отличное)
- Access Key / Secret Key: сгенерируйте в панели «Объектное хранилище».
- Bucket: создайте через панель или командой (пример ниже).
- Tenant ID: **не используется**.
- Публичность: по умолчанию бакеты приватные. Включайте публичный режим только если нужно отдавать файлы без подписи.

## Шаблон конфигурации (для админ‑панели)
Используйте этот набор полей при создании шаблона S3:
- `s3Endpoint`: `https://storage.beget.com`
- `s3Region`: `ru-msk`
- `s3AccessKeyId`: ваш ключ
- `s3SecretAccessKey`: ваш секрет
- `s3BucketName`: имя бакета
- `s3BucketIsPublic`: `false` (или `true`, если требуется публичный доступ)
- `s3PresignedUrlExpiration`: `900` (секунд) или другое по требованиям

Tenant ID не заполняйте — он не нужен в Beget.

## Минимальный пример AWS CLI
```bash
export AWS_ACCESS_KEY_ID="<Ваш Access Key>"
export AWS_SECRET_ACCESS_KEY="<Ваш Secret>"
aws s3api list-buckets --endpoint-url https://storage.beget.com --region ru-msk
```

Создать бакет:
```bash
aws s3api create-bucket \
  --bucket my-bucket \
  --endpoint-url https://storage.beget.com \
  --region ru-msk
```

Загрузить файл:
```bash
aws s3api put-object \
  --bucket my-bucket \
  --key test.txt \
  --body ./test.txt \
  --endpoint-url https://storage.beget.com \
  --region ru-msk
```

## CORS (пример)
```xml
<CORSConfiguration>
  <CORSRule>
    <AllowedOrigin>https://your-domain.com</AllowedOrigin>
    <AllowedMethod>GET</AllowedMethod>
    <AllowedMethod>PUT</AllowedMethod>
    <AllowedHeader>*</AllowedHeader>
    <ExposeHeader>ETag</ExposeHeader>
    <MaxAgeSeconds>3000</MaxAgeSeconds>
  </CORSRule>
</CORSConfiguration>
```

## Что учесть в коде/шаблонах
- Не показывать/не требовать Tenant ID для Beget.
- Использовать endpoint/region из выбранного шаблона: админ может сохранять несколько (Beget, Cloud.ru, Yandex) и переключаться.
- При работе с presigned URL подтягивать TTL из шаблона (`s3PresignedUrlExpiration`) и признак публичности (`s3BucketIsPublic`).
