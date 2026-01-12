// src/app/dashboard/companies/page.tsx
"use client";

import { useState, useEffect, useTransition, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { PlusCircle, Loader2, MoreVertical, Edit, Trash2, Star, CheckCircle, Building2, UserCircle, RefreshCcw } from 'lucide-react';
import { useAppContext, type Company } from '@/contexts/AppContext';
import { useToast } from '@/hooks/use-toast';
import { deleteCompany, setDefaultCompany } from '@/actions/companyActions';
import { onSnapshot, query, collection, where, orderBy, FirebaseError, getDocs } from '@/lib/mongoFirestore';
import { db } from '@/lib/firebase';
import { CompanyFormDialog } from '@/components/CompanyFormDialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from '@/components/ui/badge';

const companyTypeMap = {
    LLC: { label: 'ООО/АО', icon: Building2 },
    IE: { label: 'ИП', icon: UserCircle },
    SelfEmployed: { label: 'Самозанятый', icon: UserCircle },
};

export default function CompaniesPage() {
    const { user } = useAppContext();
    const { toast } = useToast();
    const [companies, setCompanies] = useState<Company[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
    const [dialogIsClient, setDialogIsClient] = useState(false);
    const [isActionPending, startActionTransition] = useTransition();


    const buildQuery = useCallback(() => {
        if (!user) return null;
        return query(
            collection(db, 'companies'),
            where('userId', '==', user.uid),
            orderBy('isDefault', 'desc'),
            orderBy('createdAt', 'desc')
        );
    }, [user]);

    const refreshCompanies = useCallback(async () => {
        const q = buildQuery();
        if (!q) return;
        setIsRefreshing(true);
        try {
            const snapshot = await getDocs(q);
            const userCompanies = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Company[];
            setCompanies(userCompanies);
            if (userCompanies.length === 0) {
                toast({
                    title: "Данные появятся позже",
                    description: "Список компаний обновляется. Попробуйте нажать «Обновить» чуть позже.",
                });
            }
        } catch (error: any) {
            toast({
                title: "Ошибка обновления",
                description: error.message || "Не удалось обновить список компаний.",
                variant: "destructive",
            });
        } finally {
            setIsRefreshing(false);
        }
    }, [buildQuery, toast]);

    useEffect(() => {
        if (!user) return; // Wait for user data to be available

        setIsLoading(true);
        const q = buildQuery();
        if (!q) {
            setIsLoading(false);
            return;
        }

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const userCompanies = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Company[];
            setCompanies(userCompanies);
            setIsLoading(false);
        }, (error: FirebaseError) => {
            console.error("Error fetching companies: ", error);
            if (error.code === 'failed-precondition' && error.message.includes('index')) {
                 toast({
                    title: "Требуется подготовка базы данных",
                    description: "Для работы этого раздела создается специальный индекс. Это может занять несколько минут. Пожалуйста, обновите страницу позже.",
                    variant: "destructive",
                    duration: 20000,
                });
            } else {
                 toast({
                    title: "Ошибка",
                    description: "Не удалось загрузить список компаний. " + error.message,
                    variant: "destructive"
                });
            }
            setIsLoading(false);
        });

        // Cleanup subscription on unmount
        return () => unsubscribe();
    }, [user, toast, buildQuery]);
    
    const handleAddClick = (isClient: boolean) => {
        setSelectedCompany(null);
        setDialogIsClient(isClient);
        setIsDialogOpen(true);
    };

    const handleEditClick = (company: Company) => {
        setSelectedCompany(company);
        setDialogIsClient(!!company.isClient);
        setIsDialogOpen(true);
    };
    
    const handleDialogClose = () => {
        setIsDialogOpen(false);
        setSelectedCompany(null);
    };
    
    const handleDialogSuccess = () => {
        handleDialogClose();
        // List will be refreshed automatically by onSnapshot
    };

    const handleDelete = (companyId: string) => {
        startActionTransition(async () => {
            const result = await deleteCompany(companyId);
            if (result.success) {
                toast({ title: "Успех", description: result.message });
            } else {
                toast({ title: "Ошибка", description: result.message, variant: "destructive" });
            }
        });
    };

    const handleSetDefault = (companyId: string, isClient: boolean) => {
        if (!user) return;
        startActionTransition(async () => {
            const result = await setDefaultCompany(user.uid, companyId, isClient);
            if (result.success) {
                toast({ title: "Успех", description: result.message });
            } else {
                toast({ title: "Ошибка", description: result.message, variant: "destructive" });
            }
        });
    };
    
    const canAddCompany = user ? companies.length < (user.maxCompanies || 1) : false;
    const myCompanies = companies.filter(company => !company.isClient);
    const counterparties = companies.filter(company => company.isClient);

    const renderCompanyGroup = ({
        title,
        description,
        items,
        emptyText,
        isClientGroup,
    }: {
        title: string;
        description: string;
        items: Company[];
        emptyText: string;
        isClientGroup: boolean;
    }) => (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>{title}</CardTitle>
                    <CardDescription>{description}</CardDescription>
                </div>
                <Button onClick={() => handleAddClick(isClientGroup)} disabled={!canAddCompany || isLoading}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Добавить
                </Button>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex justify-center items-center h-40">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : items.length === 0 ? (
                    <div className="text-center text-muted-foreground py-12 border-2 border-dashed rounded-lg">
                        <p>{emptyText}</p>
                        <Button variant="link" onClick={() => handleAddClick(isClientGroup)}>Нажмите, чтобы добавить.</Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {items.map(company => {
                            const typeInfo = companyTypeMap[company.type];
                            const TypeIcon = typeInfo.icon;
                            return (
                            <Card key={company.id} className="flex flex-col">
                                <CardHeader className="flex-row justify-between items-start">
                                    <div className="flex-grow">
                                        <CardTitle className="text-lg">{company.name}</CardTitle>
                                        <div className="flex items-center text-sm text-muted-foreground mt-1">
                                             <TypeIcon className="mr-2 h-4 w-4" /> 
                                             <span>{typeInfo.label}</span>
                                             {company.inn && <span className="mx-2">·</span>}
                                             {company.inn && <span>ИНН: {company.inn}</span>}
                                        </div>
                                    </div>
                                     <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" disabled={isActionPending}>
                                                {isActionPending ? <Loader2 className="h-4 w-4 animate-spin"/> : <MoreVertical className="h-4 w-4" />}
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => handleEditClick(company)} disabled={isActionPending}>
                                                <Edit className="mr-2 h-4 w-4"/> Редактировать
                                            </DropdownMenuItem>
                                             {!company.isDefault && (
                                                <DropdownMenuItem onClick={() => handleSetDefault(company.id, !!company.isClient)} disabled={isActionPending}>
                                                    <Star className="mr-2 h-4 w-4"/> Установить по умолч.
                                                </DropdownMenuItem>
                                             )}
                                            <DropdownMenuSeparator />
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <DropdownMenuItem 
                                                        className="text-destructive" 
                                                        onSelect={(e) => e.preventDefault()}
                                                        disabled={isActionPending}
                                                    >
                                                        <Trash2 className="mr-2 h-4 w-4"/> Удалить
                                                    </DropdownMenuItem>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Вы уверены?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            Это действие нельзя отменить. Все данные будут удалены.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Отмена</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDelete(company.id)} className="bg-destructive">Удалить</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </CardHeader>
                                <CardContent className="flex-grow">
                                    {company.ceoName && company.type === 'LLC' && <p className="text-sm text-muted-foreground"><strong>Руководитель:</strong> {company.ceoName}</p>}
                                    {company.checkingAccount && <p className="text-sm text-muted-foreground"><strong>Р/С:</strong> ...{company.checkingAccount.slice(-4)}</p>}
                                </CardContent>
                                <CardFooter>
                                    {company.isDefault && (
                                        <Badge variant="secondary" className="text-green-600 border-green-500">
                                            <CheckCircle className="mr-2 h-4 w-4" />
                                            По умолчанию
                                        </Badge>
                                    )}
                                </CardFooter>
                            </Card>
                            );
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    );

    return (
        <>
            <div className="space-y-6">
                <div className="flex justify-end">
                    <Button variant="outline" size="sm" onClick={refreshCompanies} disabled={isLoading || isRefreshing}>
                        {isRefreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
                        Обновить
                    </Button>
                </div>
                {renderCompanyGroup({
                    title: 'Мои компании',
                    description: `Ваши реквизиты для документов. (${myCompanies.length} / ${user?.maxCompanies || 1})`,
                    items: myCompanies,
                    emptyText: 'Вы еще не добавили ни одной компании.',
                    isClientGroup: false,
                })}
                {renderCompanyGroup({
                    title: 'Контрагенты',
                    description: `Ваши клиенты и заказчики. (${counterparties.length})`,
                    items: counterparties,
                    emptyText: 'Вы еще не добавили ни одного контрагента.',
                    isClientGroup: true,
                })}
            </div>

            {isDialogOpen && (
                <CompanyFormDialog
                    isOpen={isDialogOpen}
                    onClose={handleDialogClose}
                    onSuccess={handleDialogSuccess}
                    company={selectedCompany}
                    isClientForm={dialogIsClient}
                />
            )}
        </>
    );
}
