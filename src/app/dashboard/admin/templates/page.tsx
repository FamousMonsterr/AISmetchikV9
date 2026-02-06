// src/app/dashboard/admin/templates/page.tsx
// @ts-nocheck
"use client";

import { useState, useMemo, useTransition } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import templateCatalog from '@/lib/quote-templates.json';
import { demoPreviewData, getTemplateConfig, getTemplatesByType, type DocTemplateKind } from '@/lib/document-constructor';
import DocumentTemplate from '@/components/pdf/DocumentTemplate';
import InvoiceTemplate from '@/components/pdf/InvoiceTemplate';
import ContractTemplate from '@/components/pdf/ContractTemplate';
import { pdf } from '@react-pdf/renderer';
import { saveAs } from 'file-saver';
import { Loader2, Play, Star } from 'lucide-react';

const allowed = ['free', 'pro', 'business'] as const;

export default function TemplatesAdminPage() {
  const { toast } = useToast();
  const [activeTemplateId, setActiveTemplateId] = useState<string>(templateCatalog[0]?.id || '');
  const [isExporting, startExport] = useTransition();

  const groupedTemplates = useMemo(() => ({
    proposal: getTemplatesByType('proposal', allowed),
    invoice: getTemplatesByType('invoice', allowed),
    contract: getTemplatesByType('contract', allowed),
  }), []);

  const activeConfig = getTemplateConfig(activeTemplateId);

  const handleExportPdf = (kind: DocTemplateKind) => {
    startExport(async () => {
      try {
        let blob: Blob;
        const { contractor, client, specifications, quoteConfig, objectName } = demoPreviewData;
        if (kind === 'invoice') {
          const doc = (
            <InvoiceTemplate
              invoiceNumber={'TEST-001'}
              invoiceDate={new Date()}
              seller={contractor}
              buyer={client}
              items={[{ name: 'Демо позиция', quantity: 1, unit: 'усл', price: 50000 }]}
              signatureUrl={null}
              stampUrl={null}
              templateId={activeTemplateId}
            />
          );
          blob = await pdf(doc).toBlob();
        } else if (kind === 'contract') {
          const doc = (
            <ContractTemplate
              contractNumber={'ДОГ-ТЕСТ'}
              contractDate={new Date()}
              contractor={contractor as any}
              client={client}
              objectAddress={objectName}
              totalAmount={95000}
              advanceAmount={30000}
              workStartDate={new Date()}
              workEndDate={new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)}
              specifications={specifications}
              quoteConfig={quoteConfig}
              signatureUrl={null}
              stampUrl={null}
              templateId={activeTemplateId}
            />
          );
          blob = await pdf(doc).toBlob();
        } else {
          const doc = (
            <DocumentTemplate
              company={contractor}
              specifications={specifications}
              analysisDetails={{ objectName } as any}
              quoteConfig={quoteConfig}
              totals={{
                subtotalBeforeTax: 100000,
                taxAmount: 0,
                finalTotal: 100000,
                taxLabel: '',
                specItemsTotalSum: 100000,
                servicesSubtotal: 0,
              }}
              templateId={activeTemplateId}
            />
          );
          blob = await pdf(doc).toBlob();
        }
        saveAs(blob, `template-preview-${activeTemplateId}.pdf`);
        toast({ title: 'Готово', description: 'PDF с предпросмотром выгружен.' });
      } catch (error: any) {
        toast({ title: 'Ошибка', description: error.message || 'Не удалось экспортировать PDF', variant: 'destructive' });
      }
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <Card>
          <CardHeader>
            <CardTitle>Конструктор шаблонов</CardTitle>
            <CardDescription>Выберите шаблон и экспортируйте предпросмотр. Пользовательский конструктор доступен в профиле.</CardDescription>
          </CardHeader>
        </Card>
      </div>

      <Tabs defaultValue="proposal" className="space-y-4">
        <TabsList>
          <TabsTrigger value="proposal">КП</TabsTrigger>
          <TabsTrigger value="invoice">Счета</TabsTrigger>
          <TabsTrigger value="contract">Договоры</TabsTrigger>
        </TabsList>

        {(['proposal', 'invoice', 'contract'] as DocTemplateKind[]).map((kind) => (
          <TabsContent key={kind} value={kind} className="space-y-4">
            <ScrollArea className="h-[320px] rounded-md border p-3">
              <div className="grid gap-3 md:grid-cols-2">
                {groupedTemplates[kind].map((tpl) => (
                  <Card key={tpl.id} className={tpl.id === activeTemplateId ? 'border-primary' : ''}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                          <button
                            type="button"
                            className="text-amber-500"
                            onClick={() => setActiveTemplateId(tpl.id)}
                            title="Сделать основным"
                          >
                            {tpl.id === activeTemplateId ? <Star className="h-4 w-4 fill-amber-500" /> : <Star className="h-4 w-4" />}
                          </button>
                          {tpl.name}
                        </CardTitle>
                        <Badge variant={tpl.status === 'free' ? 'outline' : tpl.status === 'pro' ? 'secondary' : 'default'}>
                          {tpl.status}
                        </Badge>
                      </div>
                      <CardDescription>{tpl.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setActiveTemplateId(tpl.id)}>
                        Выбрать
                      </Button>
                      <Button size="sm" onClick={() => handleExportPdf(kind)} disabled={isExporting || tpl.id !== activeTemplateId}>
                        {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                        Экспорт PDF
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        ))}
      </Tabs>

      {activeConfig && (
        <Card>
          <CardHeader>
            <CardTitle>Детали шаблона</CardTitle>
            <CardDescription>{activeConfig.name}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <div>ID: {activeConfig.id}</div>
            <div>Тип: {activeConfig.docType}</div>
            <div>Доступ: {activeConfig.status}</div>
            {activeConfig.accentColor && <div>Цвет акцента: {activeConfig.accentColor}</div>}
            <div className="text-xs text-muted-foreground">Редактирование пользовательских шаблонов доступно в профиле.</div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
