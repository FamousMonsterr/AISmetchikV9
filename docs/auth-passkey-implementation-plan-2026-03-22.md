# Auth And Passkey Plan

## Цель

Свести авторизацию к понятному пользовательскому сценарию:

1. Быстрый вход через Google или passkey.
2. Резервный вход через email и пароль.
3. Явное подключение Google-аккаунта и passkey после первого успешного входа.
4. Нормальный passkey UX с проверкой возможностей устройства, системным диалогом, входом с телефона по QR и внешним ключом безопасности.

## Что уже есть

- `NextAuth` с `credentials`, `google`, `telegram`, `passkey`.
- Mongo-sync пользователя при Google и Telegram входе.
- Серверный `WebAuthn` flow:
  - challenge generation
  - registration verification
  - authentication verification
  - sign-in ticket для открытия NextAuth-сессии
- Базовый browser-side `navigator.credentials.create/get`.

## Главные пробелы

- Нет отдельного UX для "подключить Google к текущему аккаунту".
- Нет passkey-first conditional UX на форме логина.
- Нет явного branching:
  - локальный passkey на устройстве
  - телефон по QR
  - внешний security key
  - неподдерживаемый браузер
- Регистрация passkey не вшита как обязательный следующий шаг после регистрации или первого входа.

## План реализации

### Этап 1. Дожать текущий auth UX

- Оставить на `/auth/login` порядок:
  - Google
  - passkey
  - email/password fallback
- Оставить на `/auth/register`:
  - Google как быстрый сценарий
  - email/password как ручной сценарий
- После входа показывать отдельный onboarding-block:
  - "Подключить Google"
  - "Подключить ключ доступа"

### Этап 2. Нормальное подключение Google к существующему аккаунту

- Добавить в профиль или настройки безопасности отдельную кнопку `Подключить Google`.
- При старте flow передавать режим `intent=link`.
- В `jwt/signIn` callback различать:
  - новый вход через Google
  - linking к уже активной сессии
- Если в системе уже есть другой пользователь с тем же Google account id, блокировать linking и показывать понятную ошибку.
- Хранить в пользователе:
  - `googleId`
  - `googleLinkedAt`
  - `authProviders: ['credentials', 'google', ...]`

### Этап 3. Conditional passkey login

- Добавить проверку:
  - `PublicKeyCredential.isConditionalMediationAvailable()`
  - `PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()`
- Если conditional mediation доступен:
  - включать пассивный passkey prompt на экране логина
  - ставить `autocomplete="username webauthn"` на email input
- Если conditional mediation недоступен:
  - оставлять явную кнопку `Найти ключ доступа`

### Этап 4. Cross-device и QR сценарий

- В auth copy явно объяснить:
  - локальный ключ на устройстве
  - вход с телефона по QR
  - внешний security key
- Не рисовать собственный QR, пока нативный browser flow справляется сам.
- Для браузеров/ОС, где hybrid transport работает нативно, опираться на системный диалог.
- Если потребуется кастомный QR flow:
  - выделить это как отдельный проект
  - не смешивать с базовым WebAuthn flow

### Этап 5. Post-registration passkey enrollment

- После регистрации и первого логина открывать onboarding modal:
  - шаг 1: аккаунт создан
  - шаг 2: предложить сохранить ключ доступа
- На этом шаге использовать текущий `/api/auth/passkey/register/options` и `/verify`.
- Если пользователь пропустил шаг, сохранять флаг и мягко напоминать позже из настроек безопасности.

### Этап 6. Account security screen

- Добавить экран `Настройки -> Безопасность`.
- Вынести туда:
  - подключённые Google/Telegram providers
  - список passkey
  - удаление passkey
  - создание нового passkey
  - последнее успешное использование

## Рекомендуемый порядок разработки

1. Доделать linking flow для Google.
2. Включить conditional passkey login.
3. Добавить post-registration onboarding для passkey.
4. Собрать единый экран безопасности.
5. Уже потом решать, нужен ли кастомный QR flow сверх нативного браузерного.

## Критерии готовности

- Пользователь может войти через Google без ручного выбора сложного сценария.
- Пользователь понимает, что Google можно не только использовать для входа, но и подключить к уже существующему аккаунту.
- Passkey экран умеет объяснить, что произойдёт на этом устройстве.
- Если passkey локально нет, пользователь видит нормальный путь через телефон или внешний ключ.
- После регистрации пользователь получает явное предложение подключить passkey.
