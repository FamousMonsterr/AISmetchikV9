# Functions Index

Generated: 2026-02-06T21:27:54.350Z
Files: 292
Functions: 1114

## instrumentation.ts

- `register` | function-declaration | 4:23

## playwright.config.ts

- None

## scripts/auto-approve-credit-payments.ts

- `run` | function-declaration | 5:16

## scripts/auto-approve-pro-payments.ts

- `run` | function-declaration | 5:16

## scripts/create-mongo-indexes.ts

- `run` | function-declaration | 13:16

## scripts/expire-credits.ts

- `run` | function-declaration | 6:16

## scripts/generate-code-index.ts

- `shouldSkipDir` | function-declaration | 27:10
- `walk` | function-declaration | 34:10
- `getLineColumn` | function-declaration | 52:10
- `collectFunctions` | function-declaration | 57:10
- `getVariableKind` | function-declaration | 82:10
- `collectVariables` | function-declaration | 94:10
- `formatFunctionsSection` | function-declaration | 105:10
- `formatVariablesSection` | function-declaration | 113:10
- `writeWithSplit` | function-declaration | 121:10
- `run` | function-declaration | 152:16

## scripts/grant-pro-monthly-credits.ts

- `run` | function-declaration | 5:16

## scripts/migrate-credits-ledger.ts

- `addDays` | arrow-function | 9:7
- `run` | function-declaration | 11:16

## scripts/server-analysis-worker.ts

- `main` | function-declaration | 7:16

## scripts/telegram-bot.ts

- `main` | function-declaration | 8:16

## src/actions/adminActions.ts

- `getSuperAdminEmail` | function-declaration | 29:16
- `getAllUsers` | arrow-function | 34:14
- `updateUserPermissions` | arrow-function | 69:14
- `addCreditsToUser` | arrow-function | 133:14
- `setUserStatus` | arrow-function | 175:14
- `archiveUser` | arrow-function | 220:14
- `getReportedTickets` | arrow-function | 258:14
- `returnCreditAndResolveTicket` | arrow-function | 286:14
- `getAppSettings` | arrow-function | 345:14
- `updateAppSettings` | arrow-function | 365:14
- `getPrompts` | arrow-function | 391:14
- `updatePrompts` | arrow-function | 402:14
- `activateTrial` | arrow-function | 466:14
- `getLegalEntity` | arrow-function | 511:14
- `updateLegalEntity` | arrow-function | 525:14
- `getTelegramUsers` | arrow-function | 544:14
- `sendTelegramMessageToUser` | arrow-function | 571:14
- `getStandardSections` | arrow-function | 628:14
- `updateStandardSections` | arrow-function | 642:14
- `getAiAgentConfig` | arrow-function | 682:14
- `updateAiAgentConfig` | arrow-function | 692:14
- `getRecentLogs` | arrow-function | 706:14
- `reportUserBug` | arrow-function | 726:14
- `sanitizeEnvSettings` | arrow-function | 908:7
- `envLine` | arrow-function | 960:7
- `persistEnvFile` | function-declaration | 962:16
- `isAdminRole` | arrow-function | 1001:7
- `getEnvSettings` | arrow-function | 1003:14
- `getPublicEnvSettings` | arrow-function | 1036:14
- `testConnectivity` | function-declaration | 1041:23
- `updateEnvSettings` | arrow-function | 1091:14
- `getOzonBankSyncStatus` | arrow-function | 1111:14
- `syncOzonBank` | arrow-function | 1121:14
- `startTelegramBotService` | arrow-function | 1175:14
- `stopTelegramBotService` | arrow-function | 1193:14
- `getTelegramBotStatus` | arrow-function | 1202:14
- `forceUnlockTelegramBotService` | arrow-function | 1211:14
- `testTelegramMongoConnection` | arrow-function | 1220:14
- `testTelegramApiConnection` | arrow-function | 1234:14
- `testTelegramWebhookInfo` | arrow-function | 1253:14
- `registerTelegramWebhookService` | arrow-function | 1272:14
- `clearTelegramWebhookService` | arrow-function | 1285:14
- `pingTelegramBot` | arrow-function | 1298:14
- `pingTelegramWebhookEndpoint` | arrow-function | 1321:14
- `wipeAllData` | arrow-function | 1385:14
- `updateUsersInBulk` | function-declaration | 1435:23
- `getAiApiStats` | arrow-function | 1471:14
- `getFeedbackStats` | arrow-function | 1514:14
- `getS3Client` | function-declaration | 1548:23
- `resolveConfig` | arrow-function | 1570:11
- `resolveBucketForPurpose` | arrow-function | 1589:11
- `resolvePresetForPurpose` | arrow-function | 1626:11
- `tryCreate` | arrow-function | 1634:11
- `testS3Connection` | arrow-function | 1674:14
- `listBuckets` | arrow-function | 1684:14
- `createBucket` | arrow-function | 1694:14
- `getBucketCors` | arrow-function | 1704:14
- `putBucketCors` | arrow-function | 1721:14
- `toArray` | arrow-function | 1740:15
- `deleteBucketCors` | arrow-function | 1767:14
- `getSurveys` | arrow-function | 1778:14
- `getNotifications` | arrow-function | 1784:14
- `createOrUpdateNotification` | arrow-function | 1790:14
- `deleteNotification` | arrow-function | 1811:14
- `createOrUpdateSurvey` | arrow-function | 1820:14
- `deleteSurvey` | arrow-function | 1836:14
- `getBannerConfig` | arrow-function | 1846:14
- `updateBannerConfig` | arrow-function | 1860:14
- `getKnowledgeBaseArticles` | arrow-function | 1879:14
- `updateKnowledgeBaseArticle` | arrow-function | 1885:14

## src/actions/analysisActions.ts

- `runDetailedProjectAnalysis` | function-declaration | 24:23

## src/actions/batchActions.ts

- `runBatchPriceUpdate` | arrow-function | 19:14

## src/actions/companyActions.ts

- `normalizeCompanyKey` | arrow-function | 37:7
- `addCompany` | arrow-function | 49:14
- `updateCompany` | arrow-function | 88:14
- `deleteCompany` | arrow-function | 134:14
- `setDefaultCompany` | arrow-function | 145:14
- `suggestCompanyDetails` | arrow-function | 198:14

## src/actions/creditActions.ts

- `isAdmin` | function-declaration | 24:16
- `getCreditHistoryForUser` | function-declaration | 31:23

## src/actions/creditPurchaseActions.ts

- `findPackage` | arrow-function | 50:7
- `isAdmin` | function-declaration | 52:16
- `getAdminUsers` | function-declaration | 58:16
- `notifyAdmins` | function-declaration | 66:16
- `addHours` | arrow-function | 82:7
- `createSbpCreditOrder` | function-declaration | 85:23
- `createLegalCreditOrder` | function-declaration | 154:23
- `getCreditPurchaseOrders` | function-declaration | 223:23
- `approveCreditPurchaseOrder` | function-declaration | 241:23
- `rejectCreditPurchaseOrder` | function-declaration | 286:23
- `autoApproveCreditPurchaseOrders` | function-declaration | 328:23

## src/actions/documentTemplateActions.ts

- `normalizeTemplates` | arrow-function | 76:7
- `isAdmin` | arrow-function | 91:7
- `resolveDefaultId` | arrow-function | 97:7
- `buildDefaultSettings` | arrow-function | 103:7
- `byType` | arrow-function | 127:9
- `normalizeSettings` | arrow-function | 150:7
- `getDocumentTemplatesBundle` | function-declaration | 171:23
- `createDocumentTemplate` | function-declaration | 180:23
- `updateDocumentTemplate` | function-declaration | 211:23
- `deleteDocumentTemplate` | function-declaration | 229:23
- `updateDocumentTemplateSettings` | function-declaration | 243:23

## src/actions/genkitActions.ts

- None

## src/actions/marketingActions.ts

- `addDays` | arrow-function | 20:7
- `normalizeDate` | arrow-function | 22:7
- `isPlanEligible` | arrow-function | 30:7
- `grantMarketingBonusForUser` | function-declaration | 32:23
- `grantMonthlyMarketingBonuses` | function-declaration | 70:23

## src/actions/partnerActions.ts

- `getReferredUsers` | function-declaration | 9:23
- `agreeToPartnerTerms` | function-declaration | 34:23
- `submitHighTierApplication` | arrow-function | 60:14
- `getPartnerRequests` | arrow-function | 84:14
- `updatePartnerRequestStatus` | arrow-function | 103:14

## src/actions/proSubscriptionActions.ts

- `normalizeDate` | arrow-function | 43:7
- `addDays` | arrow-function | 51:7
- `addHours` | arrow-function | 52:7
- `isAdminUser` | function-declaration | 54:16
- `getAdminUsers` | function-declaration | 60:16
- `notifyAdmins` | function-declaration | 68:16
- `resolveAmount` | function-declaration | 84:10
- `buildPlanExpiry` | function-declaration | 88:10
- `applyPendingPro` | function-declaration | 94:16
- `applyPaidPro` | function-declaration | 114:16
- `rejectPendingPro` | function-declaration | 164:16
- `createSbpProSubscriptionOrder` | function-declaration | 215:23
- `createLegalProSubscriptionOrder` | function-declaration | 279:23
- `getProSubscriptionOrders` | function-declaration | 339:23
- `approveProSubscriptionOrder` | function-declaration | 360:23
- `rejectProSubscriptionOrder` | function-declaration | 384:23
- `autoApproveProSubscriptionOrders` | function-declaration | 405:23

## src/actions/serviceRequestActions.ts

- `isAdmin` | function-declaration | 37:16
- `createServiceRequest` | function-declaration | 43:23
- `getServiceRequests` | function-declaration | 61:23
- `updateServiceRequestStatus` | function-declaration | 79:23

## src/actions/supportActions.ts

- `resolveManagerId` | function-declaration | 68:16
- `notifyUser` | function-declaration | 92:16
- `getOrCreateSupportThread` | function-declaration | 145:23
- `getSupportThreadMessages` | function-declaration | 222:23
- `sendSupportMessage` | function-declaration | 260:23
- `updateSupportThreadStatus` | function-declaration | 327:23
- `listSupportThreadsForManager` | function-declaration | 362:23

## src/actions/telegramActions.ts

- `linkTelegramAccount` | function-declaration | 22:23
- `sendFileToTelegramUser` | function-declaration | 75:23
- `syncTelegramChatId` | function-declaration | 139:23

## src/actions/templateActions.ts

- `sanitizeHeaderStyle` | arrow-function | 39:7
- `buildTemplateId` | arrow-function | 44:7
- `createUserTemplate` | function-declaration | 46:23
- `updateUserTemplate` | function-declaration | 92:23
- `deleteUserTemplate` | function-declaration | 122:23

## src/actions/userActions.ts

- `updateUserProfile` | arrow-function | 43:14
- `updatePlanModelPreference` | arrow-function | 134:14
- `logThirdPartyConsent` | arrow-function | 161:14
- `updateMarketingConsent` | arrow-function | 179:14
- `updateUserPwaStatus` | arrow-function | 209:14
- `sendPasswordReset` | arrow-function | 230:14
- `deductCredit` | arrow-function | 279:14
- `saveProjectVersion` | arrow-function | 339:14
- `finalizeProjectCreation` | arrow-function | 419:14
- `getUserHistory` | arrow-function | 487:14
- `reportRequest` | arrow-function | 513:14
- `returnCreditForFailedRequest` | arrow-function | 560:14
- `archiveRequest` | arrow-function | 595:14
- `unarchiveRequest` | arrow-function | 621:14
- `deleteRequest` | arrow-function | 651:14
- `updateRequest` | arrow-function | 684:14
- `updatePriceBase` | arrow-function | 714:14
- `getUserPriceBase` | arrow-function | 773:14
- `savePriceBaseItems` | arrow-function | 797:14
- `updatePriceBaseItem` | arrow-function | 831:14
- `incrementAiCallCount` | arrow-function | 868:14
- `createProcessingRequest` | arrow-function | 899:14
- `finalizeProcessingRequest` | arrow-function | 1008:14
- `failProcessingRequest` | arrow-function | 1132:14
- `linkRequestToServerJob` | arrow-function | 1189:14
- `restartProcessingRequest` | arrow-function | 1244:14

## src/ai/flows/create-lead-flow.ts

- `createLeadFlow` | function-declaration | 30:23

## src/ai/flows/extract-project-specifications.ts

- `extractProjectSpecifications` | function-declaration | 23:23

## src/ai/flows/find-missing-items-flow.ts

- `findMissingItemsFlow` | function-declaration | 40:23

## src/ai/flows/improve-text-request-flow.ts

- `improveTextRequest` | function-declaration | 34:23

## src/ai/flows/refine-items-flow.ts

- `refineItemsFlow` | function-declaration | 65:23

## src/ai/flows/suggest-item-prices-flow.ts

- `buildPrompt` | function-declaration | 26:10
- `suggestItemPrices` | function-declaration | 45:23

## src/ai/flows/suggest-private-prices-flow.ts

- `jaroWinkler` | function-declaration | 29:10
- `suggestPrivatePricesFlow` | function-declaration | 78:23

## src/ai/genkit-schemas.ts

- None

## src/app/api/admin/server-functions/requeue/route.ts

- `POST` | function-declaration | 4:23

## src/app/api/admin/server-functions/run-worker/route.ts

- `POST` | function-declaration | 5:23

## src/app/api/admin/test-connectivity/route.ts

- `GET` | function-declaration | 4:23

## src/app/api/auth/[...nextauth]/route.ts

- None

## src/app/api/auth/register/route.ts

- `POST` | function-declaration | 10:23

## src/app/api/auth/request-password-setup/route.ts

- `POST` | function-declaration | 5:23

## src/app/api/auth/reset/route.ts

- `POST` | function-declaration | 7:23

## src/app/api/auth/set-password/route.ts

- `POST` | function-declaration | 8:23

## src/app/api/db/route.ts

- `buildMongoFilter` | function-declaration | 37:10
- `splitUpdateOps` | function-declaration | 69:10
- `isAdmin` | function-declaration | 100:10
- `hasUserFilter` | function-declaration | 104:10
- `ensureOwnership` | function-declaration | 108:16
- `POST` | function-declaration | 115:23

## src/app/api/find-missing/route.ts

- `hydrateNewItemsForUI` | function-declaration | 29:10
- `POST` | function-declaration | 50:23

## src/app/api/health/route.ts

- `GET` | function-declaration | 5:23

## src/app/api/main-analysis/route.ts

- `POST` | function-declaration | 21:23

## src/app/api/query/route.ts

- `buildMongoFilter` | function-declaration | 30:10
- `isAdmin` | function-declaration | 62:10
- `hasUserFilter` | function-declaration | 66:10
- `POST` | function-declaration | 70:23

## src/app/api/realtime/route.ts

- `buildChangeStreamMatch` | function-declaration | 7:10
- `GET` | function-declaration | 40:23
- `onChange` | arrow-function | 77:13

## src/app/api/s3-refresh-url/route.ts

- `POST` | function-declaration | 7:23

## src/app/api/s3-upload/route.ts

- `POST` | function-declaration | 10:23

## src/app/api/server-analysis/cancel/route.ts

- `POST` | function-declaration | 13:23

## src/app/api/server-analysis/route.ts

- `POST` | function-declaration | 26:23

## src/app/api/telegram/webhook/route.ts

- `POST` | function-declaration | 5:23

## src/app/auth/login/page.tsx

- `LoginPage` | function-declaration | 18:25
- `handleLogin` | arrow-function | 29:9
- `handlePasswordReset` | arrow-function | 78:9

## src/app/auth/register/page.tsx

- `RegisterForm` | function-declaration | 27:10
- `handleRegister` | arrow-function | 54:9
- `RegisterPage` | function-declaration | 260:25

## src/app/auth/reset/page.tsx

- `ResetPasswordPage` | function-declaration | 13:25
- `handleReset` | arrow-function | 24:9

## src/app/auth/set-password/page.tsx

- `SetPasswordPage` | function-declaration | 13:25
- `handleSetPassword` | arrow-function | 22:9

## src/app/configure-quote/page.tsx

- `ConfigureQuotePage` | function-declaration | 14:25
- `handleCheckboxChange` | arrow-function | 28:9
- `handleCostChange` | arrow-function | 38:9
- `handleNextClick` | arrow-function | 43:9
- `handleBackToDashboard` | arrow-function | 52:9
- `handleSaveDraft` | arrow-function | 58:9

## src/app/dashboard/admin/ai-agent/page.tsx

- `AdminAiAgentPage` | function-declaration | 24:25
- `fetchConfig` | arrow-function | 45:11
- `handleProviderConfigChange` | arrow-function | 63:9
- `handlePdfPriorityChange` | arrow-function | 77:7
- `moveEngine` | arrow-function | 81:7
- `handleModelConfigChange` | arrow-function | 98:9
- `handleSetServiceModel` | arrow-function | 107:9
- `handleSetVoiceModel` | arrow-function | 118:9
- `handleSaveModel` | arrow-function | 129:9
- `handleAddMultipleModels` | arrow-function | 151:9
- `handleRemoveModel` | arrow-function | 167:9
- `getPlanModels` | arrow-function | 175:9
- `updatePlanModelField` | arrow-function | 182:9
- `togglePlanModelList` | arrow-function | 199:9
- `handleSave` | arrow-function | 222:9
- `sanitize` | arrow-function | 226:13
- `sanitizeDefault` | arrow-function | 227:13
- `renderPlanModelChecklist` | arrow-function | 273:9
- `renderModelSettings` | arrow-function | 294:9

## src/app/dashboard/admin/ai-analytics/page.tsx

- `StatusBadge` | arrow-function | 28:7
- `AiAnalyticsPage` | function-declaration | 38:25
- `handleStatusUpdate` | arrow-function | 71:9

## src/app/dashboard/admin/credit-payments/page.tsx

- `CreditPaymentsAdminPage` | function-declaration | 25:25
- `handleApprove` | arrow-function | 53:9
- `handleReject` | arrow-function | 66:9

## src/app/dashboard/admin/feedback-surveys/page.tsx

- `SurveyFormDialog` | arrow-function | 24:7
- `handleSave` | arrow-function | 58:9
- `addQuestion` | arrow-function | 72:9
- `FeedbackSurveysPage` | function-declaration | 115:25
- `handleOpenDialog` | arrow-function | 138:11
- `handleDelete` | arrow-function | 143:11

## src/app/dashboard/admin/layout.tsx

- `warmUpIndexes` | arrow-function | 90:7
- `AdminLayout` | function-declaration | 117:25
- `handleNavigation` | arrow-function | 146:9

## src/app/dashboard/admin/logs/page.tsx

- `AdminLogsPage` | function-declaration | 25:25
- `getActionInfo` | arrow-function | 66:9

## src/app/dashboard/admin/marketing/page.tsx

- `WidgetGenerator` | arrow-function | 15:7
- `handleCopy` | arrow-function | 25:11
- `MarketingPage` | function-declaration | 67:25

## src/app/dashboard/admin/notifications/page.tsx

- `NotificationDialog` | arrow-function | 46:7
- `handleSave` | arrow-function | 76:9
- `AdminNotificationsPage` | function-declaration | 141:25
- `handleEdit` | arrow-function | 182:9
- `handleClone` | arrow-function | 187:9
- `handleCreate` | arrow-function | 192:9
- `handleDelete` | arrow-function | 197:9
- `handleToggleStatus` | arrow-function | 210:9
- `handleSaveBanner` | arrow-function | 224:9
- `getStatusBadge` | arrow-function | 236:9
- `getTypeIcon` | arrow-function | 242:10

## src/app/dashboard/admin/page.tsx

- `useLocalStorageState` | arrow-function | 42:7
- `formatNumber` | arrow-function | 72:7
- `AdminDashboardPage` | function-declaration | 78:25
- `fetchStats` | arrow-function | 97:15
- `handleMetricToggle` | arrow-function | 242:11
- `updateSize` | arrow-function | 259:11
- `moveWidget` | arrow-function | 263:11
- `removeWidget` | arrow-function | 275:11
- `addWidget` | arrow-function | 279:11
- `MiniStat` | arrow-function | 661:7

## src/app/dashboard/admin/partner-requests/page.tsx

- `AdminPartnerRequestsPage` | function-declaration | 35:25
- `handleStatusChange` | arrow-function | 66:9

## src/app/dashboard/admin/pro-payments/page.tsx

- `ProPaymentsAdminPage` | function-declaration | 25:25
- `handleApprove` | arrow-function | 53:9
- `handleReject` | arrow-function | 66:9

## src/app/dashboard/admin/project-logs/page.tsx

- `ProjectLogsPage` | function-declaration | 202:25
- `parseTimestamp` | arrow-function | 210:9
- `buildLogQueryFilters` | arrow-function | 236:9
- `toggleFromList` | arrow-function | 327:9
- `resetFilters` | arrow-function | 335:9
- `recommendations` | arrow-function | 388:9
- `renderBadge` | arrow-function | 422:9
- `StageIcon` | arrow-function | 433:9
- `applyPreset` | arrow-function | 440:9

## src/app/dashboard/admin/prompts/page.tsx

- `PromptsPageContent` | function-declaration | 21:10
- `fetchPrompts` | arrow-function | 33:11
- `handlePromptChange` | arrow-function | 51:9
- `handleSave` | arrow-function | 55:9
- `renderPromptAccordion` | arrow-function | 82:9
- `AdminPromptsPage` | function-declaration | 143:25

## src/app/dashboard/admin/s3/page.tsx

- `S3AdminPage` | function-declaration | 18:25
- `fetchSettings` | arrow-function | 29:15
- `handleSave` | arrow-function | 49:11

## src/app/dashboard/admin/sections/page.tsx

- `AdminSectionsPage` | function-declaration | 23:25
- `fetchSections` | arrow-function | 35:11
- `handleUpdate` | arrow-function | 53:9
- `handleAddHashtag` | arrow-function | 57:9
- `handleRemoveHashtag` | arrow-function | 67:9
- `handleAddNewSection` | arrow-function | 73:9
- `handleDeleteSection` | arrow-function | 82:9
- `handleSave` | arrow-function | 87:9

## src/app/dashboard/admin/server-functions/page.tsx

- `ServerFunctionsAdminPage` | function-declaration | 18:25
- `loadData` | arrow-function | 44:11
- `refreshJobs` | arrow-function | 70:9
- `handleRunWorker` | arrow-function | 84:9
- `handleRequeue` | arrow-function | 97:9
- `handleViewLogs` | arrow-function | 110:9
- `formatDate` | arrow-function | 140:9
- `renderStatusIcon` | arrow-function | 146:9
- `runTestStep` | arrow-function | 153:9

## src/app/dashboard/admin/service-requests/page.tsx

- `AdminServiceRequestsPage` | function-declaration | 44:25
- `handleStatusChange` | arrow-function | 81:9

## src/app/dashboard/admin/settings/page.tsx

- `AdminSettingsPage` | function-declaration | 14:25

## src/app/dashboard/admin/telegram/page.tsx

- `TelegramUsersPage` | function-declaration | 24:25
- `renderStatusIcon` | arrow-function | 103:9
- `runTest` | arrow-function | 110:9
- `requestSort` | arrow-function | 162:9
- `getSortIcon` | arrow-function | 170:9
- `handleOpenMessageDialog` | arrow-function | 178:9
- `handleSendMessage` | arrow-function | 184:9
- `handleBotAction` | arrow-function | 203:9
- `handleForceUnlock` | arrow-function | 225:9
- `handleWebhookAction` | arrow-function | 242:9

## src/app/dashboard/admin/templates/page.tsx

- `TemplatesAdminPage` | function-declaration | 29:25
- `refreshTemplates` | arrow-function | 55:9
- `openCreateDialog` | arrow-function | 61:9
- `openEditDialog` | arrow-function | 66:9
- `handleSubmitTemplate` | arrow-function | 71:9
- `handleDeleteTemplate` | arrow-function | 94:9
- `handleSettingsChange` | arrow-function | 109:9
- `handleAvailabilityToggle` | arrow-function | 127:9
- `handleSaveSettings` | arrow-function | 151:9

## src/app/dashboard/admin/tickets/page.tsx

- `AdminTicketsPage` | function-declaration | 24:25
- `handleResolve` | arrow-function | 55:9
- `handleViewResult` | arrow-function | 86:9

## src/app/dashboard/admin/users/page.tsx

- `AdminUsersPage` | function-declaration | 23:25
- `handleAction` | arrow-function | 60:9
- `handleOpenPermissionsModal` | arrow-function | 91:9
- `handleOpenCreditsModal` | arrow-function | 96:9
- `handleOpenCreditHistory` | arrow-function | 101:9
- `handleOpenConfirmDialog` | arrow-function | 106:9
- `handleBulkUpdate` | arrow-function | 112:9
- `requestSort` | arrow-function | 153:9
- `getSortIcon` | arrow-function | 161:9
- `renderUserTable` | arrow-function | 176:9

## src/app/dashboard/billing/page.tsx

- `BillingPage` | function-declaration | 22:25
- `submitRequest` | arrow-function | 32:9
- `handlePurchaseClick` | arrow-function | 50:9
- `handleUpgradeClick` | arrow-function | 59:9

## src/app/dashboard/bonus/page.tsx

- `PartnerAgreement` | arrow-function | 43:7
- `handleAgree` | arrow-function | 47:11
- `PartnerLevels` | arrow-function | 114:7
- `handleOpenModal` | arrow-function | 118:9
- `ReferralDashboard` | arrow-function | 175:7
- `fetchReferredUsers` | arrow-function | 183:15
- `handleCopy` | arrow-function | 201:11
- `BonusPage` | function-declaration | 353:25
- `handleAgree` | arrow-function | 356:11

## src/app/dashboard/calculator/page.tsx

- `CalculatorPage` | function-declaration | 17:25

## src/app/dashboard/companies/page.tsx

- `CompaniesPage` | function-declaration | 25:25
- `handleAddClick` | arrow-function | 109:11
- `handleEditClick` | arrow-function | 115:11
- `handleDialogClose` | arrow-function | 121:11
- `handleDialogSuccess` | arrow-function | 126:11
- `handleDelete` | arrow-function | 131:11
- `handleSetDefault` | arrow-function | 142:11
- `renderCompanyGroup` | arrow-function | 158:11

## src/app/dashboard/layout.tsx

- `DashboardLayoutContent` | function-declaration | 51:10
- `handleLogout` | arrow-function | 99:11
- `handleNavigation` | arrow-function | 104:11
- `DashboardLayout` | function-declaration | 233:25

## src/app/dashboard/mobile-panel/page.tsx

- `MobilePanelPage` | function-declaration | 23:25
- `handleProjectSelect` | arrow-function | 86:11
- `handleClearFile` | arrow-function | 91:11

## src/app/dashboard/page.tsx

- `PwaPrompt` | arrow-function | 40:7
- `handleDismiss` | arrow-function | 54:11
- `DashboardPage` | function-declaration | 77:25
- `handleSharedFile` | arrow-function | 97:11
- `handleStartAnalysis` | arrow-function | 180:9

## src/app/dashboard/price-base/page.tsx

- `PriceBasePage` | function-declaration | 29:25
- `handleCellBlur` | arrow-function | 88:11
- `handleExport` | arrow-function | 109:11
- `handleImportedData` | arrow-function | 148:11
- `handleSelectionChange` | arrow-function | 166:11
- `handleAssignSection` | arrow-function | 175:11
- `renderEditableCell` | arrow-function | 215:11

## src/app/dashboard/profile/page.tsx

- `ProfilePageContent` | function-declaration | 29:10
- `ProfilePage` | function-declaration | 67:25

## src/app/dashboard/support/page.tsx

- `SupportInboxPage` | function-declaration | 23:25
- `handleSend` | arrow-function | 81:9
- `handleCloseThread` | arrow-function | 102:9

## src/app/dashboard/tickets/page.tsx

- `UserTicketsPage` | function-declaration | 17:25
- `getStatusBadge` | arrow-function | 61:11

## src/app/dashboard/training/page.tsx

- `KnowledgeBaseVideo` | arrow-function | 19:7
- `TrainingPage` | function-declaration | 46:25
- `handleEnterpriseRequest` | arrow-function | 481:9

## src/app/layout.tsx

- `SiteLayout` | arrow-function | 44:7
- `RootLayout` | function-declaration | 81:25

## src/app/legal/consent/page.tsx

- `getLicensorData` | function-declaration | 7:16
- `ConsentPage` | function-declaration | 24:31

## src/app/legal/layout.tsx

- `LegalLayout` | function-declaration | 10:25

## src/app/legal/license/page.tsx

- `getLicensorData` | function-declaration | 7:16
- `LicensePage` | function-declaration | 24:31

## src/app/legal/privacy-policy/page.tsx

- `getLicensorData` | function-declaration | 7:16
- `PrivacyPolicyPage` | function-declaration | 24:31

## src/app/page.tsx

- `VideoSection` | arrow-function | 20:7
- `Home` | function-declaration | 47:25

## src/app/partnership/page.tsx

- `LoadingSpinner` | arrow-function | 11:7
- `PartnershipPage` | function-declaration | 25:25

## src/app/video-analysis/page.tsx

- `VideoAnalysisPage` | function-declaration | 1:25

## src/components/AIProcessingDialog.tsx

- `AIProcessingDialog` | function-declaration | 44:17

## src/components/AvatarCropDialog.tsx

- `createImage` | arrow-function | 18:7
- `getCroppedImage` | arrow-function | 27:7
- `AvatarCropDialog` | function-declaration | 56:17
- `handleConfirm` | arrow-function | 73:9

## src/components/CompanyFormDialog.tsx

- `CompanyFormDialog` | function-declaration | 76:17
- `handleDadataQueryChange` | arrow-function | 144:9
- `handleSuggestionSelect` | arrow-function | 150:9
- `onSubmit` | arrow-function | 169:9
- `renderFormField` | arrow-function | 220:9

## src/components/CookieConsentDialog.tsx

- `CookieConsentDialog` | function-declaration | 24:17
- `saveConsent` | arrow-function | 50:11
- `handleAcceptAll` | arrow-function | 58:11
- `handleRejectAll` | arrow-function | 63:11
- `handleSaveSettings` | arrow-function | 68:11
- `handleTogglePreference` | arrow-function | 72:11

## src/components/CountUp.tsx

- `CountUp` | arrow-function | 12:14

## src/components/CreditHistory.tsx

- `CreditHistory` | function-declaration | 35:17
- `handleRefresh` | arrow-function | 58:9

## src/components/Details.tsx

- `Details` | function-declaration | 14:17

## src/components/DocumentGenerationDialog.tsx

- `DocumentGenerationDialog` | function-declaration | 58:17
- `resolveProjectName` | arrow-function | 122:11
- `resolveProjectSpecs` | arrow-function | 123:11
- `resolveProjectQuoteConfig` | arrow-function | 124:11
- `resolveScopeProjects` | arrow-function | 125:11
- `extractExpirationMs` | arrow-function | 142:11
- `refreshSignedUrl` | arrow-function | 152:11
- `ensureAssetUrl` | arrow-function | 164:11
- `fetchImageBuffer` | arrow-function | 174:11
- `getProjectTotals` | arrow-function | 187:11
- `buildSections` | arrow-function | 193:11
- `generateDocuments` | arrow-function | 201:11
- `buildInvoiceItems` | arrow-function | 265:15
- `handleDownload` | arrow-function | 609:11
- `handleSendToBot` | arrow-function | 635:11

## src/components/DuplicateProjectDialog.tsx

- `ActionButton` | arrow-function | 18:7
- `DuplicateProjectDialog` | function-declaration | 34:17

## src/components/ExcelImportDialog.tsx

- `getBestMatch` | function-declaration | 36:10
- `ExcelImportDialog` | function-declaration | 49:17
- `handleMappingChange` | arrow-function | 61:11
- `handleConfirmImport` | arrow-function | 65:11

## src/components/FindMissingDialog.tsx

- `FindMissingDialog` | function-declaration | 29:17
- `handleRunSearch` | arrow-function | 46:11
- `handleConfirm` | arrow-function | 93:11

## src/components/GroupZipDialog.tsx

- `sanitizeFileName` | arrow-function | 48:7
- `fetchImageBuffer` | arrow-function | 50:7
- `GroupZipDialog` | function-declaration | 61:17
- `resolveTemplateIdFor` | arrow-function | 96:9
- `handleDocTypeChange` | arrow-function | 152:9
- `toggleDocTypeSelection` | arrow-function | 172:9
- `resolveProjectName` | arrow-function | 182:9
- `resolveProjectSpecs` | arrow-function | 183:9
- `resolveProjectQuoteConfig` | arrow-function | 184:9
- `buildSections` | arrow-function | 186:9
- `buildInvoiceItemsForProjects` | arrow-function | 198:9
- `generateCombinedFile` | arrow-function | 250:9
- `generateProjectFile` | arrow-function | 383:9
- `handleGenerateZip` | arrow-function | 509:9
- `needsClientFor` | arrow-function | 523:15

## src/components/HighTierPartnerDialog.tsx

- `HighTierPartnerDialog` | function-declaration | 48:17
- `handleSubmit` | arrow-function | 54:9

## src/components/InsufficientCreditsDialog.tsx

- `InsufficientCreditsDialog` | function-declaration | 17:17
- `handleNavigation` | arrow-function | 28:9

## src/components/InvoiceHistory.tsx

- `InvoiceHistory` | function-declaration | 30:17
- `safeFormatDate` | arrow-function | 56:11
- `handleAction` | arrow-function | 113:11

## src/components/LegalEntityRegistrationDialog.tsx

- `createFormSchema` | arrow-function | 34:7
- `LegalEntityRegistrationDialog` | function-declaration | 52:17
- `handleDadataQueryChange` | arrow-function | 105:9
- `handleSuggestionSelect` | arrow-function | 111:9
- `onSubmit` | arrow-function | 119:9

## src/components/Logo.tsx

- `Logo` | arrow-function | 27:14
- `LogoIcon` | arrow-function | 39:14

## src/components/NotificationCenter.tsx

- `NotificationCenter` | function-declaration | 24:17
- `fetchNotifications` | arrow-function | 40:11
- `markAsRead` | arrow-function | 81:9
- `hideNotification` | arrow-function | 107:9
- `getNotificationDate` | arrow-function | 111:9

## src/components/PdfEditorDialog.tsx

- `PdfEditorDialog` | function-declaration | 26:17
- `generatePreviews` | arrow-function | 72:11
- `handlePageSelection` | arrow-function | 98:9
- `selectAll` | arrow-function | 107:9
- `invertSelection` | arrow-function | 113:9
- `applyManualSelection` | arrow-function | 151:9
- `handleProcess` | arrow-function | 180:9

## src/components/PlanBadge.tsx

- `PlanBadge` | function-declaration | 28:17
- `handleKeyDown` | arrow-function | 30:9

## src/components/PlanGate.tsx

- `PlanGate` | function-declaration | 19:17

## src/components/PlanModelPreference.tsx

- `PlanModelPreference` | function-declaration | 18:17
- `handleChange` | arrow-function | 31:9

## src/components/PrivatePriceDialog.tsx

- `PrivatePriceDialog` | function-declaration | 30:17
- `fetchSections` | function-declaration | 71:20
- `handleConfirmClick` | arrow-function | 105:9
- `handleCreateNewToggle` | arrow-function | 132:9
- `handleSectionToggle` | arrow-function | 138:9

## src/components/ProcessingDialog.tsx

- `ProcessingDialog` | function-declaration | 91:17
- `resetState` | arrow-function | 134:11
- `loadSettings` | arrow-function | 150:15
- `processFile` | arrow-function | 177:15
- `ensureDraftExists` | arrow-function | 184:19
- `setProjectStage` | arrow-function | 205:19
- `abortIfCancelled` | arrow-function | 215:19
- `runAnalysis` | arrow-function | 223:19
- `saveFinalResult` | arrow-function | 280:19
- `handleStop` | arrow-function | 484:11

## src/components/ProjectUpdateDialog.tsx

- `ProjectUpdateDialog` | function-declaration | 28:17
- `safeFormatDateTime` | arrow-function | 52:9
- `handleConfirm` | arrow-function | 109:9

## src/components/PurchaseCreditsDialog.tsx

- `ConsentDialog` | function-declaration | 44:10
- `PurchaseCreditsDialog` | function-declaration | 72:17
- `handleConfirmConsent` | arrow-function | 117:11
- `generateInvoice` | arrow-function | 131:11
- `handleSubmitSbp` | arrow-function | 213:11
- `handleGenerateInvoiceClick` | arrow-function | 253:11

## src/components/PurchaseProDialog.tsx

- `PurchaseProDialog` | function-declaration | 36:17
- `handleActivateTrial` | arrow-function | 81:9
- `handleSubmitSbp` | arrow-function | 120:9
- `handleGenerateInvoice` | arrow-function | 161:9

## src/components/RefineProjectDialog.tsx

- `RefineProjectDialog` | function-declaration | 33:17
- `cleanupTimeout` | arrow-function | 56:9
- `handleProcess` | arrow-function | 63:9
- `hydrateRefinedData` | arrow-function | 186:17

## src/components/RegistrationDialog.tsx

- `RegistrationDialog` | function-declaration | 33:17
- `handleRegister` | arrow-function | 58:9

## src/components/SpecificationPageContent.tsx

- `CalculatorPage` | function-declaration | 17:25

## src/components/UpgradeAccountDialog.tsx

- `UpgradeAccountDialog` | function-declaration | 22:17
- `handleActivateTrial` | arrow-function | 28:9
- `handleRequestPlan` | arrow-function | 78:9

## src/components/admin/EnvSettings.tsx

- `PasswordInput` | arrow-function | 19:7
- `EnvSettings` | function-declaration | 45:17
- `fetchSettings` | arrow-function | 61:11
- `handleSave` | arrow-function | 90:9
- `handleTest` | arrow-function | 103:9
- `handleOzonSync` | arrow-function | 116:9

## src/components/admin/GeneralSettings.tsx

- `WipeDataDialog` | function-declaration | 20:10
- `GeneralSettings` | function-declaration | 66:17
- `fetchSettings` | arrow-function | 85:11
- `handleSave` | arrow-function | 103:9
- `handleWipeData` | arrow-function | 122:9

## src/components/admin/LegalEntitySettings.tsx

- `LegalEntitySettings` | function-declaration | 19:17
- `fetchSettings` | arrow-function | 50:11
- `onSubmit` | arrow-function | 83:9
- `handleSuggestionSelect` | arrow-function | 95:9
- `renderFormField` | arrow-function | 114:9

## src/components/admin/UserRow.tsx

- `safeFormatDate` | arrow-function | 23:7
- `UserRow` | function-declaration | 30:17

## src/components/admin/dialogs/AddCreditsDialog.tsx

- `AddCreditsDialog` | function-declaration | 23:17
- `handleUpdate` | arrow-function | 28:9

## src/components/admin/dialogs/AddModelFromProviderDialog.tsx

- `AddModelFromProviderDialog` | function-declaration | 24:17
- `loadModels` | arrow-function | 32:9
- `handleSelectionChange` | arrow-function | 78:9
- `handleConfirm` | arrow-function | 90:9
- `formatPrice` | arrow-function | 108:9
- `getModelCapabilities` | arrow-function | 114:9
- `toggleExpanded` | arrow-function | 137:9
- `addSingleModel` | arrow-function | 141:9
- `handleSelectAllFiltered` | arrow-function | 146:9
- `handleClearSelection` | arrow-function | 150:9
- `renderModelDetails` | arrow-function | 154:9

## src/components/admin/dialogs/BulkUpdateDialog.tsx

- `BulkUpdateDialog` | function-declaration | 20:17
- `handleConfirm` | arrow-function | 29:9

## src/components/admin/dialogs/ConfirmActionDialog.tsx

- `ConfirmActionDialog` | function-declaration | 21:17

## src/components/admin/dialogs/ModelConfigDialog.tsx

- `ModelConfigDialog` | function-declaration | 24:17
- `handleConfirm` | arrow-function | 49:9

## src/components/admin/dialogs/UserCreditHistoryDialog.tsx

- `UserCreditHistoryDialog` | function-declaration | 15:17

## src/components/admin/dialogs/UserPermissionsDialog.tsx

- `UserPermissionsDialog` | function-declaration | 35:17
- `handlePermissionChange` | arrow-function | 70:9
- `handleModelSelectionChange` | arrow-function | 74:9
- `handleUpdate` | arrow-function | 85:9

## src/components/admin/s3/S3Info.tsx

- `S3Info` | function-declaration | 16:17
- `fetchSettings` | arrow-function | 23:11
- `copyToClipboard` | arrow-function | 42:9

## src/components/admin/s3/S3Settings.tsx

- `PasswordInput` | arrow-function | 20:7
- `S3Settings` | function-declaration | 51:17
- `resolvePresetId` | arrow-function | 86:9
- `loadBuckets` | arrow-function | 88:9
- `handleCreateBucket` | arrow-function | 101:9
- `applyDefaults` | arrow-function | 136:9
- `inferProviderFromEndpoint` | arrow-function | 145:9
- `buildPresetConfig` | arrow-function | 153:9
- `handleApplyPreset` | arrow-function | 167:9
- `handleSavePreset` | arrow-function | 196:9
- `handleUpdatePreset` | arrow-function | 214:9
- `handleRemovePreset` | arrow-function | 231:9
- `handleCorsAction` | arrow-function | 245:9
- `buildCorsXml` | arrow-function | 273:9
- `generateCorsRule` | arrow-function | 315:9
- `generateCorsRuleForAll` | arrow-function | 319:9

## src/components/admin/s3/S3Testing.tsx

- `S3Testing` | function-declaration | 50:17
- `resolvePresetId` | arrow-function | 69:9
- `resetAfterFileSelect` | arrow-function | 79:9
- `handleStep` | arrow-function | 98:9
- `renderStatusIcon` | arrow-function | 180:9
- `renderStep` | arrow-function | 187:9
- `statusBadge` | arrow-function | 209:9
- `runMicroAction` | arrow-function | 215:9

## src/components/calculator/AiAssistantSettings.tsx

- `AiAssistantSettings` | function-declaration | 26:17

## src/components/calculator/AiNotes.tsx

- `AiNotes` | function-declaration | 16:17

## src/components/calculator/AiRecommendations.tsx

- `AiRecommendations` | function-declaration | 16:17

## src/components/calculator/Calculator.tsx

- `clampComplexity` | arrow-function | 52:7
- `getRecommendedComplexityByHeight` | arrow-function | 57:7
- `blobToBase64` | function-declaration | 86:10
- `Calculator` | function-declaration | 104:17
- `handleAdjustCostConfirm` | arrow-function | 188:11
- `handleRevertToRecommended` | arrow-function | 202:11
- `handleInputChange` | arrow-function | 207:11
- `handleSliderChange` | arrow-function | 218:11
- `handlePresetClick` | arrow-function | 219:11
- `handleModeSwitch` | arrow-function | 221:11

## src/components/calculator/HistoryActions.tsx

- `HistoryActions` | function-declaration | 17:17

## src/components/calculator/ProjectDetails.tsx

- `ProjectDetails` | function-declaration | 16:17

## src/components/calculator/QuoteSettings.tsx

- `ServiceItem` | arrow-function | 19:7
- `QuoteSettings` | function-declaration | 42:17

## src/components/calculator/SpecificationPageContent.tsx

- `SpecificationPageContent` | function-declaration | 76:25
- `withProLabel` | arrow-function | 148:9
- `calculateSmrFromSpecs` | arrow-function | 162:9
- `handleBeforeUnload` | arrow-function | 255:11
- `buildSnapshot` | arrow-function | 289:9
- `logAction` | arrow-function | 332:9
- `updateCurrentProject` | arrow-function | 337:9
- `handleAiProjectUpdate` | arrow-function | 354:9
- `handleModelChange` | arrow-function | 415:9
- `handleProjectTabChange` | arrow-function | 421:9
- `handleGroupFileSelect` | arrow-function | 431:9
- `handleGroupProcessingClose` | arrow-function | 438:9
- `handleGroupProjectProcessed` | arrow-function | 446:9
- `formatCurrency` | arrow-function | 456:9
- `buildSyncConflicts` | arrow-function | 461:9
- `handleOpenSyncDialog` | arrow-function | 497:9
- `handleApplySync` | arrow-function | 515:9
- `updateSpecificationItem` | arrow-function | 560:9
- `applyUpdates` | arrow-function | 568:11
- `adjustSpecs` | arrow-function | 612:11
- `handleAddItem` | arrow-function | 640:9
- `handleRemoveItem` | arrow-function | 647:9
- `handleAddRecommendation` | arrow-function | 655:9
- `handleAddAllRecommendations` | arrow-function | 666:9
- `handleSaveChanges` | arrow-function | 688:9
- `handleFeatureClick` | arrow-function | 748:9
- `handleS3Request` | arrow-function | 755:9
- `handleAIPricing` | arrow-function | 775:8
- `handleApplyPrices` | arrow-function | 922:9
- `parsePricedItems` | arrow-function | 923:11
- `handleLoadVersion` | arrow-function | 1049:9
- `handleRefineProject` | arrow-function | 1072:9
- `normalizeText` | arrow-function | 1081:9
- `getComparisonKey` | arrow-function | 1088:9
- `getTextSimilarity` | arrow-function | 1094:9
- `ensureItemType` | arrow-function | 1109:9
- `findInsertionIndex` | arrow-function | 1114:9
- `handleApplyFoundItems` | arrow-function | 1143:9
- `blobToBase64` | arrow-function | 1242:9
- `transcribeAiEditAudio` | arrow-function | 1251:9
- `startAiEditRecording` | arrow-function | 1289:9
- `stopAiEditRecording` | arrow-function | 1328:9
- `applyAiEdits` | arrow-function | 1340:9
- `normalizeNumber` | arrow-function | 1345:11
- `applyUpdatesToProject` | arrow-function | 1351:11
- `findSpecIndex` | arrow-function | 1353:13
- `handleAiEditSubmit` | arrow-function | 1459:9

## src/components/calculator/SpecificationRow.tsx

- `getStatusIcon` | arrow-function | 19:7
- `handleItemTypeChange` | arrow-function | 42:11

## src/components/calculator/SpecificationTable.tsx

- `SpecificationTable` | function-declaration | 17:17

## src/components/calculator/TotalsAndActions.tsx

- `TotalsAndActions` | function-declaration | 37:17

## src/components/dashboard/HistorySection.tsx

- `HistorySection` | function-declaration | 40:17
- `pickLatest` | arrow-function | 96:15
- `getTs` | arrow-function | 98:23
- `getTs` | arrow-function | 115:19
- `handleDeleteForever` | arrow-function | 273:11
- `handleFeatureClick` | arrow-function | 286:11
- `handleViewResult` | arrow-function | 293:11
- `handleLoadVersion` | arrow-function | 310:11
- `startGroupEdit` | arrow-function | 321:11
- `handleEditGroup` | arrow-function | 331:11
- `handleCreateGroup` | arrow-function | 384:11
- `handleUngroup` | arrow-function | 400:11
- `handleDownloadObjectReport` | arrow-function | 408:11
- `handleSelectionChange` | arrow-function | 418:11
- `handleBatchPriceUpdate` | arrow-function | 430:11
- `handleRenameProject` | arrow-function | 447:11
- `HistoryRenderer` | arrow-function | 656:7
- `renderEmptyState` | arrow-function | 659:11
- `renderContent` | arrow-function | 686:11

## src/components/dashboard/ProjectCard.tsx

- `getStatusBadge` | arrow-function | 21:7
- `safeFormatDate` | arrow-function | 33:7
- `ProjectCard` | function-declaration | 40:17
- `handleRename` | arrow-function | 52:11

## src/components/dashboard/ProjectGroup.tsx

- `ProjectGroup` | function-declaration | 30:17

## src/components/landing/CtaButton.tsx

- `CtaButton` | arrow-function | 6:14

## src/components/landing/CtaSection.tsx

- `CtaSection` | arrow-function | 8:14

## src/components/landing/FaqSection.tsx

- `FaqSection` | arrow-function | 8:14

## src/components/landing/FeaturesSection.tsx

- `FeaturesSection` | arrow-function | 9:14

## src/components/landing/Footer.tsx

- `FooterLink` | arrow-function | 9:7
- `handleNavigate` | arrow-function | 14:11
- `Footer` | arrow-function | 70:14

## src/components/landing/Header.tsx

- `NavItemWithAlert` | arrow-function | 22:7
- `NavLink` | arrow-function | 51:7
- `ThemeSwitcher` | arrow-function | 60:7
- `renderIcon` | arrow-function | 68:11
- `Header` | arrow-function | 95:14

## src/components/landing/HeroSection.tsx

- `TypingAnimation` | arrow-function | 9:7
- `HeroSection` | arrow-function | 50:14

## src/components/landing/HowItWorksSection.tsx

- `HowItWorksSection` | arrow-function | 9:14

## src/components/landing/IntegrationsSection.tsx

- `IntegrationsSection` | arrow-function | 4:14

## src/components/landing/PartnershipSection.tsx

- `PartnershipSection` | arrow-function | 10:14
- `handleNavigate` | arrow-function | 13:11

## src/components/landing/PricingSection.tsx

- `PlanCard` | arrow-function | 18:7
- `FeatureComparisonTable` | arrow-function | 66:7
- `PricingSection` | arrow-function | 108:14
- `handleCorporateClick` | arrow-function | 113:11
- `handleRegisterClick` | arrow-function | 118:11

## src/components/landing/SuccessStoriesSection.tsx

- `SuccessStoriesSection` | arrow-function | 30:14

## src/components/landing/TestDriveSection.tsx

- `TestDriveSection` | function-declaration | 20:17
- `handleAnalysis` | arrow-function | 57:11
- `handleClearFile` | arrow-function | 80:11

## src/components/landing/TestimonialsSection.tsx

- `TestimonialsSection` | arrow-function | 5:14

## src/components/mobile-panel/ActionBlock.tsx

- `ActionBlock` | arrow-function | 23:14
- `handleAction` | arrow-function | 27:11

## src/components/mobile-panel/MobileCalculator.tsx

- `clampComplexity` | arrow-function | 36:7
- `getRecommendedComplexityByHeight` | arrow-function | 41:7
- `MobileCalculator` | function-declaration | 58:17
- `handleInputChange` | arrow-function | 114:11
- `handleSliderChange` | arrow-function | 123:11
- `handlePresetClick` | arrow-function | 124:11
- `handleModeSwitch` | arrow-function | 126:11

## src/components/mobile-panel/ProjectView.tsx

- `ProjectView` | arrow-function | 29:14
- `handleUpdateItem` | arrow-function | 80:11
- `handleRemoveItem` | arrow-function | 88:11
- `handleAddItem` | arrow-function | 95:11

## src/components/partnership/FinalCtaSection.tsx

- `FinalCtaSection` | arrow-function | 9:14
- `calculateTimeLeft` | arrow-function | 17:11

## src/components/partnership/HowItWorks.tsx

- `IncomeSourceCard` | arrow-function | 36:7
- `HowItWorks` | arrow-function | 74:14
- `handleToggle` | arrow-function | 77:11

## src/components/partnership/IncomeCalculator.tsx

- `calculateMonthlyIncome` | arrow-function | 16:7
- `IncomeCalculator` | arrow-function | 39:14
- `calculateIncomeForPeriod` | arrow-function | 53:15

## src/components/partnership/MarketNumbersSection.tsx

- `MarketNumbersSection` | arrow-function | 29:14

## src/components/partnership/MarketPotentialSection.tsx

- `FormattedCountUp` | arrow-function | 12:7
- `MarketPotentialSection` | arrow-function | 36:7

## src/components/partnership/PartnershipHero.tsx

- `TypingAnimation` | arrow-function | 8:7
- `PartnershipHero` | arrow-function | 48:14

## src/components/partnership/TargetAudienceSection.tsx

- `TargetAudienceSection` | arrow-function | 36:14

## src/components/partnership/TestimonialsSection.tsx

- `TestimonialsSection` | arrow-function | 5:14

## src/components/partnership/TiersSection.tsx

- `TiersSection` | arrow-function | 12:14

## src/components/partnership/UseCasesSection.tsx

- `DesktopView` | arrow-function | 40:7
- `MobileView` | arrow-function | 70:7
- `nextCase` | arrow-function | 73:11
- `prevCase` | arrow-function | 74:11
- `UseCasesSection` | arrow-function | 150:14
- `handleCtaClick` | arrow-function | 154:11

## src/components/partnership/VideoSection.tsx

- `VideoSection` | arrow-function | 6:14

## src/components/partnership/WindowOfOpportunitySection.tsx

- `WindowOfOpportunitySection` | arrow-function | 10:14

## src/components/pdf/ActTemplate.tsx

- `formatContractDate` | arrow-function | 99:7
- `ActTemplate` | arrow-function | 107:7

## src/components/pdf/ContractTemplate.tsx

- `numberToWordsRu` | arrow-function | 129:7
- `ContractTemplate` | arrow-function | 134:7

## src/components/pdf/DocumentTemplate.tsx

- `DocumentTemplate` | arrow-function | 159:7

## src/components/pdf/GroupDocumentTemplate.tsx

- `GroupDocumentTemplate` | arrow-function | 154:7

## src/components/pdf/InvoiceTemplate.tsx

- `numberToWordsRu` | arrow-function | 123:7
- `InvoiceTemplate` | arrow-function | 129:7

## src/components/pdf/Ks2Template.tsx

- `formatContractDate` | arrow-function | 93:7
- `Ks2Template` | arrow-function | 101:7

## src/components/pdf/Ks3Template.tsx

- `formatContractDate` | arrow-function | 93:7
- `Ks3Template` | arrow-function | 101:7

## src/components/pdf/Ks6aTemplate.tsx

- `formatContractDate` | arrow-function | 93:7
- `Ks6aTemplate` | arrow-function | 101:7

## src/components/pdf/PDFPreview.tsx

- `PDFPreview` | arrow-function | 12:7

## src/components/support/FloatingSupportChat.tsx

- `FloatingSupportChat` | function-declaration | 10:17

## src/components/support/SupportChat.tsx

- `SupportChat` | function-declaration | 22:17
- `init` | arrow-function | 75:11
- `handleSend` | arrow-function | 90:9
- `handleSatisfaction` | arrow-function | 115:9
- `formatResponseTime` | arrow-function | 133:9

## src/components/tabs/ProfileTab.tsx

- `ProfileTab` | function-declaration | 39:25
- `fetchBotUrl` | arrow-function | 87:11
- `handleCopy` | arrow-function | 122:9
- `handleProfileUpdate` | arrow-function | 130:9
- `openUpgradeDialog` | arrow-function | 173:9
- `handleNextPlanClick` | arrow-function | 182:9
- `handleMarketingToggle` | arrow-function | 191:9
- `handleSyncChatId` | arrow-function | 204:9
- `openTemplateDialog` | arrow-function | 224:9
- `handleTemplateSubmit` | arrow-function | 229:9
- `handleTemplateDelete` | arrow-function | 262:9
- `uploadAsset` | arrow-function | 327:9
- `handleAssetChange` | arrow-function | 348:9
- `handleAvatarSelect` | arrow-function | 376:9
- `handleAssetRemove` | arrow-function | 386:9

## src/components/templates/AdminTemplateEditorDialog.tsx

- `AdminTemplateEditorDialog` | function-declaration | 42:17
- `handleChange` | arrow-function | 68:9
- `handleSubmit` | arrow-function | 72:9

## src/components/templates/TemplateConstructorDialog.tsx

- `TemplateConstructorDialog` | function-declaration | 41:17
- `handleChange` | arrow-function | 66:9
- `handleSubmit` | arrow-function | 70:9

## src/components/ui/accordion.tsx

- None

## src/components/ui/aceternity-ui.tsx

- `BottomGradient` | arrow-function | 7:14
- `LabelInputContainer` | arrow-function | 16:14

## src/components/ui/alert-dialog.tsx

- `AlertDialogHeader` | arrow-function | 48:7
- `AlertDialogFooter` | arrow-function | 62:7

## src/components/ui/alert.tsx

- None

## src/components/ui/avatar.tsx

- None

## src/components/ui/badge.tsx

- `Badge` | function-declaration | 30:10

## src/components/ui/button.tsx

- None

## src/components/ui/calendar.tsx

- `Calendar` | function-declaration | 12:10

## src/components/ui/card.tsx

- None

## src/components/ui/chart.tsx

- `useChart` | function-declaration | 27:10
- `ChartStyle` | arrow-function | 72:7
- `getPayloadConfigFromPayload` | function-declaration | 322:10

## src/components/ui/checkbox.tsx

- None

## src/components/ui/dialog.tsx

- `DialogHeader` | arrow-function | 56:7
- `DialogFooter` | arrow-function | 70:7

## src/components/ui/dropdown-menu.tsx

- `DropdownMenuShortcut` | arrow-function | 171:7

## src/components/ui/form.tsx

- `FormField` | arrow-function | 31:7
- `useFormField` | arrow-function | 44:7

## src/components/ui/glass-button.tsx

- None

## src/components/ui/glass-card.tsx

- `GlassCard` | arrow-function | 17:14

## src/components/ui/glass-container.tsx

- `GlassContainer` | arrow-function | 16:14

## src/components/ui/glass-navbar.tsx

- `GlassNavbar` | arrow-function | 24:14

## src/components/ui/input.tsx

- None

## src/components/ui/label.tsx

- None

## src/components/ui/liquid-glass-filter.tsx

- `LiquidGlassFilter` | arrow-function | 3:14

## src/components/ui/menubar.tsx

- `MenubarShortcut` | arrow-function | 199:7

## src/components/ui/popover.tsx

- None

## src/components/ui/progress.tsx

- None

## src/components/ui/radio-group.tsx

- None

## src/components/ui/scroll-area.tsx

- None

## src/components/ui/select.tsx

- None

## src/components/ui/separator.tsx

- None

## src/components/ui/sheet.tsx

- `SheetHeader` | arrow-function | 77:7
- `SheetFooter` | arrow-function | 91:7

## src/components/ui/sidebar.tsx

- `useSidebar` | arrow-function | 16:14
- `Sidebar` | arrow-function | 24:14
- `SidebarBody` | arrow-function | 92:14
- `SidebarLink` | arrow-function | 115:14
- `handleClick` | arrow-function | 126:9

## src/components/ui/skeleton.tsx

- `Skeleton` | function-declaration | 3:10

## src/components/ui/slider.tsx

- None

## src/components/ui/sticky-banner.tsx

- `StickyBanner` | arrow-function | 10:14
- `handleClose` | arrow-function | 45:9

## src/components/ui/switch.tsx

- None

## src/components/ui/table.tsx

- None

## src/components/ui/tabs.tsx

- None

## src/components/ui/textarea.tsx

- None

## src/components/ui/toast.tsx

- None

## src/components/ui/toaster.tsx

- `Toaster` | function-declaration | 13:17

## src/components/ui/tooltip.tsx

- None

## src/contexts/AppContext.tsx

- `convertTimestampsToDates` | arrow-function | 476:7
- `AppProvider` | arrow-function | 495:14
- `incrementChangeCounter` | arrow-function | 520:9
- `resetChangeCounter` | arrow-function | 521:9
- `handleThemeChange` | arrow-function | 647:15
- `handleBackButton` | arrow-function | 656:15
- `useAppContext` | arrow-function | 732:14

## src/contexts/SupportChatContext.tsx

- `SupportChatProvider` | function-declaration | 14:17
- `useSupportChat` | function-declaration | 26:17

## src/hooks/use-document-templates.ts

- `useDocumentTemplates` | function-declaration | 7:17

## src/hooks/use-engagement-tracking.ts

- `sendEvent` | arrow-function | 6:7
- `useEngagementTracking` | arrow-function | 27:14
- `handleInstalled` | arrow-function | 43:11

## src/hooks/use-mobile.tsx

- `useIsMobile` | function-declaration | 8:17
- `checkIsMobile` | arrow-function | 14:11
- `handleResize` | arrow-function | 19:11

## src/hooks/use-toast.ts

- `genId` | function-declaration | 30:10
- `addToRemoveQueue` | arrow-function | 61:7
- `reducer` | arrow-function | 77:14
- `dispatch` | function-declaration | 136:10
- `toast` | function-declaration | 145:10
- `update` | arrow-function | 148:9
- `dismiss` | arrow-function | 153:9
- `useToast` | function-declaration | 174:10

## src/hooks/use-user-templates.ts

- `useUserTemplates` | function-declaration | 14:17

## src/lib/auth.ts

- None

## src/lib/calculation.ts

- `calculateItemSum` | function-declaration | 6:17
- `calculateProjectTotals` | function-declaration | 26:17

## src/lib/document-constructor.ts

- `buildTemplateMap` | arrow-function | 26:7
- `registerTemplateCatalog` | arrow-function | 47:14
- `getTemplateConfig` | arrow-function | 65:14
- `getTemplatesByType` | arrow-function | 70:14

## src/lib/document-template-utils.ts

- `planKey` | arrow-function | 3:7
- `resolveDefaultTemplateId` | arrow-function | 10:14
- `filterTemplatesForPlan` | arrow-function | 21:14

## src/lib/db.ts

- None

## src/lib/fonts.ts

- None

## src/lib/item-type-classifier.ts

- `normalize` | arrow-function | 100:7
- `includesAny` | arrow-function | 108:7
- `hasCableSignal` | arrow-function | 111:7
- `classifyItemType` | function-declaration | 119:17

## src/lib/logger.ts

- `logUserAction` | arrow-function | 61:14
- `truncateString` | arrow-function | 95:7
- `safeJsonPayload` | arrow-function | 100:7
- `sanitizeDetails` | arrow-function | 118:7
- `logAiApiCall` | arrow-function | 127:14
- `sanitizeLogPayload` | arrow-function | 194:7
- `serializeError` | arrow-function | 196:7
- `logProjectEvent` | arrow-function | 212:14

## src/lib/mailer.ts

- `resolveMailerConfig` | function-declaration | 15:16
- `isMailerConfigured` | function-declaration | 37:23
- `getMailerFrom` | function-declaration | 42:23
- `getMailer` | function-declaration | 47:23

## src/lib/db-client.ts

- `collection` | function-declaration | 45:17
- `doc` | function-declaration | 49:17
- `where` | function-declaration | 62:17
- `orderBy` | function-declaration | 66:17
- `limit` | function-declaration | 70:17
- `query` | function-declaration | 74:17
- `serverTimestamp` | function-declaration | 98:17
- `increment` | function-declaration | 102:17
- `arrayUnion` | function-declaration | 106:17
- `stripInternalId` | function-declaration | 110:10
- `createDocSnapshot` | function-declaration | 115:10
- `createQuerySnapshot` | function-declaration | 125:10
- `executeDocWrite` | function-declaration | 141:16
- `getDoc` | function-declaration | 155:23
- `getDocs` | function-declaration | 163:23
- `addDoc` | function-declaration | 176:23
- `setDoc` | function-declaration | 184:23
- `updateDoc` | function-declaration | 191:23
- `deleteDoc` | function-declaration | 198:23
- `runTransaction` | function-declaration | 205:17
- `writeBatch` | function-declaration | 209:17
- `onSnapshot` | function-declaration | 213:17
- `fetchSnapshot` | arrow-function | 233:9

## src/lib/db-server.ts

- `collection` | function-declaration | 49:17
- `doc` | function-declaration | 53:17
- `where` | function-declaration | 66:17
- `orderBy` | function-declaration | 70:17
- `limit` | function-declaration | 74:17
- `query` | function-declaration | 78:17
- `serverTimestamp` | function-declaration | 102:17
- `increment` | function-declaration | 106:17
- `arrayUnion` | function-declaration | 110:17
- `normalizeValue` | function-declaration | 114:10
- `stripInternalId` | function-declaration | 121:10
- `buildMongoFilter` | function-declaration | 126:10
- `splitUpdateOps` | function-declaration | 159:10
- `createDocSnapshot` | function-declaration | 190:10
- `createQuerySnapshot` | function-declaration | 200:10
- `executeQuery` | function-declaration | 216:16
- `executeDocFetch` | function-declaration | 234:16
- `getDoc` | function-declaration | 240:23
- `getDocs` | function-declaration | 244:23
- `addDoc` | function-declaration | 252:23
- `setDoc` | function-declaration | 259:23
- `updateDoc` | function-declaration | 269:23
- `deleteDoc` | function-declaration | 275:23
- `runTransaction` | function-declaration | 280:23
- `runWithoutTransaction` | arrow-function | 288:9
- `isTransactionUnsupported` | arrow-function | 312:9
- `writeBatch` | function-declaration | 352:17
- `onSnapshot` | function-declaration | 416:17

## src/lib/mongodb.ts

- `getClient` | function-declaration | 27:23
- `getDb` | function-declaration | 31:23

## src/lib/plan-models.ts

- `sanitizeList` | arrow-function | 16:7
- `normalizePlanKey` | arrow-function | 27:7
- `getFallbackModelId` | arrow-function | 41:7
- `getPlanModelConfig` | arrow-function | 49:14
- `getPlanModelIds` | arrow-function | 60:14
- `getPlanDefaultModelId` | arrow-function | 87:14
- `resolvePlanModelId` | arrow-function | 98:14
- `getPlanAbTestModels` | arrow-function | 110:14
- `getPlanModelOptions` | arrow-function | 116:14
- `getModelLabel` | arrow-function | 122:14

## src/lib/plan-utils.ts

- `getNextPlan` | arrow-function | 6:14
- `getPlanLabel` | arrow-function | 12:14

## src/lib/pwa-helpers.ts

- `openDB` | function-declaration | 7:10
- `getPendingFile` | function-declaration | 20:23
- `deletePendingFile` | function-declaration | 45:23

## src/lib/server-analysis-stages.ts

- None

## src/lib/template-utils.ts

- `isCustomTemplateId` | arrow-function | 25:14
- `getTemplateLimitForPlan` | arrow-function | 28:14
- `isTemplateConstructorAvailable` | arrow-function | 41:14
- `normalizeHexColor` | arrow-function | 43:14

## src/lib/utils.ts

- `cn` | function-declaration | 8:17
- `hydrateSpecificationsForDB` | function-declaration | 13:17
- `getFileSha1` | arrow-function | 39:14
- `getDataAndMimeType` | function-declaration | 46:17

## src/server-functions/admin/actions.ts

- `listServerAnalysisJobs` | function-declaration | 10:23
- `getServerJob` | function-declaration | 17:23
- `getServerJobLogs` | function-declaration | 21:23
- `runServerWorkerOnce` | function-declaration | 27:23
- `requeueFailedJobs` | function-declaration | 36:23

## src/server-functions/analysis/jobRunner.ts

- `pickMainAnalysisPrompt` | function-declaration | 20:10
- `loadCachedAnalysis` | function-declaration | 28:16
- `ensureS3CacheRecord` | function-declaration | 37:16
- `updateProjectStage` | function-declaration | 51:16
- `runAiAnalysis` | function-declaration | 60:16
- `runServerAnalysisJob` | function-declaration | 97:23
- `setStage` | arrow-function | 104:9
- `ensureNotCancelled` | arrow-function | 114:9
- `persistAnalysisResult` | function-declaration | 292:16
- `notifyUser` | function-declaration | 322:16

## src/server-functions/analysis/jobService.ts

- `createServerAnalysisJob` | function-declaration | 9:23
- `getServerAnalysisJob` | function-declaration | 40:23
- `appendJobLog` | function-declaration | 47:23
- `updateJobStatus` | function-declaration | 55:23
- `findQueuedJobs` | function-declaration | 68:23

## src/server-functions/analysis/types.ts

- None

## src/server-functions/analysis/worker.ts

- `runServerAnalysisWorkerOnce` | function-declaration | 13:23

## src/server-functions/config.ts

- None

## src/server-functions/monitoring/health.ts

- `readEnvSettings` | arrow-function | 31:7
- `toIso` | arrow-function | 36:7
- `getQueueStats` | function-declaration | 43:23
- `getTelegramHealth` | function-declaration | 60:23
- `getServerHealth` | function-declaration | 97:23

## src/server-functions/notifications/dispatch.ts

- `dispatchNotification` | function-declaration | 33:23

## src/server-functions/notifications/telegram.ts

- `getSendBot` | arrow-function | 31:7
- `resolveChatId` | arrow-function | 45:7
- `checkCooldown` | arrow-function | 55:7
- `saveCooldown` | arrow-function | 65:7
- `checkIdempotency` | arrow-function | 70:7
- `writeDispatchLog` | arrow-function | 77:7
- `sendTelegramMessage` | function-declaration | 82:23

## src/server-functions/telegram/bot.ts

- `readEnvSettings` | arrow-function | 8:7
- `parseStartPayload` | arrow-function | 18:7
- `resolveWebAppUrl` | arrow-function | 30:7
- `findUserByChatId` | arrow-function | 40:7
- `ensureBotToken` | arrow-function | 51:7
- `registerHandlers` | arrow-function | 60:7
- `saveChat` | arrow-function | 63:9
- `sendWelcome` | arrow-function | 98:9
- `sendProfile` | arrow-function | 112:9
- `sendHistory` | arrow-function | 128:9
- `sendNew` | arrow-function | 141:9
- `sendHelp` | arrow-function | 149:9
- `sendPay` | arrow-function | 156:9
- `sendPing` | arrow-function | 164:9
- `startTelegramBot` | function-declaration | 225:23
- `getWebhookBot` | arrow-function | 232:7
- `processTelegramWebhookUpdate` | function-declaration | 244:23

## src/server-functions/telegram/controller.ts

- `readEnvSettings` | arrow-function | 9:7
- `getLockRef` | arrow-function | 50:7
- `lockPayload` | arrow-function | 53:7
- `refreshLock` | arrow-function | 59:7
- `readLock` | arrow-function | 63:7
- `isLockFresh` | arrow-function | 68:7
- `acquireLock` | arrow-function | 73:7
- `releaseLock` | arrow-function | 81:7
- `log` | arrow-function | 92:7
- `toSafeRuntime` | arrow-function | 99:7
- `startManagedBot` | function-declaration | 108:23
- `stopManagedBot` | function-declaration | 194:23
- `forceUnlockBot` | function-declaration | 226:23
- `getBotRuntimeStatus` | function-declaration | 239:23

## src/server-functions/webhooks/telegram.ts

- `readEnvSettings` | arrow-function | 16:7
- `resolveWebhookToken` | arrow-function | 21:7
- `verifyTelegramWebhookSecret` | function-declaration | 26:23
- `handleTelegramWebhookUpdate` | function-declaration | 33:23
- `registerTelegramWebhook` | function-declaration | 38:23
- `clearTelegramWebhook` | function-declaration | 58:23

## src/services/ai.ts

- `getDefaultModel` | arrow-function | 9:14
- `getVoiceModel` | arrow-function | 14:14
- `generateJson` | function-declaration | 33:23
- `generateStream` | function-declaration | 96:23

## src/services/credits.ts

- `isTransactionUnsupported` | arrow-function | 25:7
- `addDays` | arrow-function | 30:7
- `withSession` | arrow-function | 32:7
- `ensureLotsFromUserDoc` | function-declaration | 34:16
- `withMongoTransaction` | function-declaration | 81:23
- `runWithoutTransaction` | arrow-function | 90:9
- `updateUserCreditSummaryInTransaction` | function-declaration | 104:23
- `sumRemaining` | arrow-function | 114:9
- `minExpiry` | arrow-function | 115:9
- `expireCreditsForUserInTransaction` | function-declaration | 151:23
- `expireCreditsForUser` | function-declaration | 192:23
- `getCreditSummary` | function-declaration | 196:23
- `grantCredits` | function-declaration | 215:23
- `grantCreditsInTransaction` | function-declaration | 232:23
- `deductCredits` | function-declaration | 280:23
- `deductCreditsInTransaction` | function-declaration | 295:23
- `processLot` | arrow-function | 323:9
- `refundCredits` | function-declaration | 369:23
- `refundCreditsInTransaction` | function-declaration | 385:23
- `expireCreditLot` | function-declaration | 459:23
- `getCreditHistory` | function-declaration | 509:23

## src/services/docxGenerator.ts

- `generateDocx` | arrow-function | 30:14
- `createTotalRow` | arrow-function | 191:11

## src/services/excelGenerator.ts

- `createWorksheetFromData` | function-declaration | 23:10
- `generateExcel` | arrow-function | 160:14
- `generateObjectSummaryExcel` | arrow-function | 169:14

## src/services/openrouter.ts

- `getOpenRouterApiKey` | function-declaration | 45:16
- `getOpenRouterModels` | function-declaration | 60:23
- `tryGenerateWithEngine` | function-declaration | 84:16
- `generateOpenRouterContentStreamed` | function-declaration | 163:23
- `generateOpenRouterContent` | function-declaration | 193:23
- `processResponse` | arrow-function | 205:11

## tailwind.config.ts

- None

## tests/api-health.test.ts

- None

## tests/api-server-analysis.test.ts

- None

## tests/credits.test.ts

- `normalizeValue` | arrow-function | 19:7
- `matches` | function-declaration | 21:10
- `createContext` | arrow-function | 129:7
- `addDays` | arrow-function | 135:7

## tests/e2e/flows.spec.ts

- `login` | arrow-function | 23:9

## vitest.config.ts

- None

