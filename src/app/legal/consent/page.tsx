// src/app/legal/consent/page.tsx
import { getLegalEntity } from '@/actions/adminActions';
import type { LegalEntity } from '@/ai/genkit-schemas';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

// Function to fetch data on the server
async function getLicensorData(): Promise<LegalEntity> {
  const entity = await getLegalEntity({ logErrors: false });
  // Provide fallback default data if nothing is in the database
  return entity || {
    name: 'ИП [ФАМИЛИЯ ИМЯ ОТЧЕСТВО]',
    legalAddress: '[АДРЕС РЕГИСТРАЦИИ]',
    inn: '[ИНН]',
    checkingAccount: '[РАСЧЕТНЫЙ СЧЕТ]',
    bankName: '[НАЗВАНИЕ БАНКА]',
    correspondentAccount: '[КОРР. СЧЕТ]',
    bik: '[БИК]',
    ceoName: '[ФИО]',
    contactPhone: '[ТЕЛЕФОН]',
    contactEmail: 'support@aismetchik.pro',
  };
}

export default async function ConsentPage() {
  const licensor = await getLicensorData();

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl text-center">Согласие на обработку персональных данных</CardTitle>
        <CardDescription className="text-center">Редакция от {new Date().toLocaleDateString('ru-RU')}</CardDescription>
      </CardHeader>
      <CardContent className="prose prose-sm max-w-none">
        <p>
          Я, субъект персональных данных, в соответствии с Федеральным законом от 27 июля 2006 года № 152-ФЗ «О персональных данных», предоставляю свое согласие Оператору – {licensor.name} (ИНН: {licensor.inn}, адрес: {licensor.legalAddress}) – на обработку моих персональных данных.
        </p>

        <h4>1. Перечень персональных данных, на обработку которых дается согласие:</h4>
        <ul>
          <li>Фамилия, имя, отчество;</li>
          <li>Адрес электронной почты (e-mail);</li>
          <li>Номер контактного телефона;</li>
          <li>Промокод (если применимо).</li>
        </ul>

        <h4>2. Цели обработки персональных данных:</h4>
        <ul>
          <li>Регистрация и аутентификация в сервисе «AI Сметчик».</li>
          <li>Исполнение обязательств по Лицензионному соглашению.</li>
          <li>Предоставление доступа к функциям сервиса.</li>
          <li>Направление уведомлений, связанных с работой сервиса.</li>
          <li>Информирование о новых продуктах, услугах и акциях (при наличии отдельного согласия).</li>
        </ul>

        <h4>3. Перечень действий с персональными данными:</h4>
        <p>
          В ходе обработки с персональными данными будут совершены следующие действия: сбор, запись, систематизация, накопление, хранение, уточнение (обновление, изменение), извлечение, использование, обезличивание, блокирование, удаление, уничтожение. Обработка может быть как автоматизированной, так и неавтоматизированной.
        </p>
        
        <h4>4. Срок действия согласия:</h4>
        <p>
          Настоящее согласие действует с момента его предоставления и в течение всего периода использования сервиса «AI Сметчик», а также в течение 3 (трех) лет после прекращения использования сервиса, либо до момента отзыва настоящего согласия.
        </p>

        <h4>5. Порядок отзыва согласия:</h4>
        <p>
          Согласие может быть отозвано в любое время путем направления письменного заявления Оператору по адресу электронной почты: {licensor.contactEmail}. Отзыв согласия влечет за собой прекращение доступа к сервису и уничтожение персональных данных.
        </p>

        <p className="font-bold mt-6">
          Подтверждаю, что я ознакомлен(а) с положениями Федерального закона от 27.07.2006 № 152-ФЗ «О персональных данных», права и обязанности в области защиты персональных данных мне разъяснены.
        </p>
         <p className="font-bold">
          Подтверждаю, что я ознакомлен(а) с <a href="/legal/privacy-policy" target="_blank" rel="noopener noreferrer">Политикой обработки персональных данных</a>.
        </p>
      </CardContent>
    </Card>
  );
}
