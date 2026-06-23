// src/app/dashboard/admin/marketing/page.tsx
"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Copy, Code } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { usePathname, useRouter } from 'next/navigation';

const WidgetGenerator = ({ partnerId }: { partnerId: string }) => {
    const [width, setWidth] = useState('400px');
    const [height, setHeight] = useState('600px');
    const { toast } = useToast();

    const baseUrl = typeof window !== 'undefined' ? `${window.location.origin}` : 'https://montagehub.ru';
    const widgetUrl = `${baseUrl}/?ref=${partnerId}`;
    
    const iframeCode = `<iframe src="${widgetUrl}" width="${width}" height="${height}" style="border:none; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);"></iframe>`;

    const handleCopy = (code: string) => {
        navigator.clipboard.writeText(code);
        toast({ description: "Код скопирован в буфер обмена." });
    };

    return (
        <Card className="mt-4">
            <CardHeader>
                <CardTitle className="text-lg">Конструктор виджета</CardTitle>
                <CardDescription>Создайте и скопируйте код виджета для вставки на ваш сайт.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="widget-width">Ширина</Label>
                        <Input id="widget-width" value={width} onChange={(e) => setWidth(e.target.value)} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="widget-height">Высота</Label>
                        <Input id="widget-height" value={height} onChange={(e) => setHeight(e.target.value)} />
                    </div>
                </div>
                 <div className="space-y-2">
                    <Label>Предпросмотр</Label>
                    <div className="p-4 border rounded-md bg-muted" style={{ height: '300px' }}>
                        <iframe src={widgetUrl} width="100%" height="100%" style={{ border: 'none', borderRadius: '8px' }} title="Widget Preview"></iframe>
                    </div>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="iframe-code">Код для вставки</Label>
                    <div className="relative">
                        <Textarea id="iframe-code" readOnly value={iframeCode} className="font-mono h-32 pr-12" />
                        <Button variant="ghost" size="icon" className="absolute top-2 right-2" onClick={() => handleCopy(iframeCode)}>
                            <Copy className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default function MarketingPage() {
    const [partnerId, setPartnerId] = useState('YOUR_PARTNER_ID');
    
    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Маркетинговые материалы</CardTitle>
                    <CardDescription>
                        Инструменты для продвижения и привлечения новых пользователей по вашей партнерской ссылке.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="partner-id-input">Тестовый ID партнера</Label>
                        <Input 
                            id="partner-id-input"
                            value={partnerId}
                            onChange={(e) => setPartnerId(e.target.value)}
                            placeholder="Введите тестовый ID"
                        />
                         <p className="text-xs text-muted-foreground">Введите сюда ID партнера, чтобы сгенерировать для него персональные материалы.</p>
                    </div>

                     <Accordion type="multiple" className="w-full space-y-4">
                        <AccordionItem value="widget" className="border rounded-lg">
                            <AccordionTrigger className="p-4"><h3 className="font-semibold flex items-center gap-2"><Code className="h-5 w-5"/> Виджет для сайта</h3></AccordionTrigger>
                            <AccordionContent className="p-4 pt-0">
                                <p className="text-sm text-muted-foreground mb-4">Встройте наш лендинг прямо на свой сайт. Все регистрации через этот виджет будут засчитаны вам.</p>
                                <WidgetGenerator partnerId={partnerId} />
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </CardContent>
            </Card>
        </div>
    );
}
