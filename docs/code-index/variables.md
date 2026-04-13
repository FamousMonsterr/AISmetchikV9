# Variables Index

Generated: 2026-02-06T21:27:54.350Z
Files: 292
Variables: 5338

## instrumentation.ts

- None

## playwright.config.ts

- `baseURL` | const | 3:7

## scripts/auto-approve-credit-payments.ts

- `result` | const | 6:9

## scripts/auto-approve-pro-payments.ts

- `result` | const | 6:9

## scripts/create-mongo-indexes.ts

- `mongoUri` | const | 6:7
- `mongoDbName` | const | 7:7
- `client` | const | 14:9
- `db` | const | 16:9

## scripts/expire-credits.ts

- `db` | const | 7:9
- `users` | const | 8:9
- `totalExpired` | let | 9:7
- `user` | const | 10:14
- `userId` | const | 11:11
- `result` | const | 12:11

## scripts/generate-code-index.ts

- `ROOT` | const | 20:7
- `OUTPUT_DIR` | const | 21:7
- `MAX_BYTES` | const | 22:7
- `EXCLUDED_DIRS` | const | 24:7
- `EXCLUDED_PATH_PREFIXES` | const | 25:7
- `parts` | const | 29:9
- `entries` | const | 35:9
- `entry` | const | 36:14
- `fullPath` | const | 37:11
- `relativePath` | const | 38:11
- `{ line, column }` | const | 53:9
- `entries` | const | 58:9
- `functionDeclarations` | const | 60:9
- `func` | const | 61:14
- `name` | const | 62:11
- `{ line, column }` | const | 63:11
- `variableDeclarations` | const | 67:9
- `decl` | const | 68:14
- `initializer` | const | 69:11
- `name` | const | 73:11
- `kind` | const | 74:11
- `{ line, column }` | const | 75:11
- `list` | const | 83:9
- `statement` | const | 87:9
- `entries` | const | 95:9
- `variableDeclarations` | const | 96:9
- `decl` | const | 97:14
- `name` | const | 98:11
- `{ line, column }` | const | 99:11
- `lines` | const | 109:9
- `lines` | const | 117:9
- `combined` | const | 122:9
- `groups` | const | 128:9
- `section` | const | 129:14
- `topLevel` | const | 130:11
- `indexLines` | const | 135:9
- `[group]` | const | 142:14
- `partName` | const | 143:11
- `groupContent` | const | 144:11
- `files` | const | 153:9
- `project` | const | 156:9
- `sourceFiles` | const | 161:9
- `functionSections` | const | 163:9
- `variableSections` | const | 164:9
- `functionCount` | let | 166:7
- `variableCount` | let | 167:7
- `sourceFile` | const | 169:14
- `relativePath` | const | 170:11
- `functions` | const | 171:11
- `variables` | const | 172:11
- `now` | const | 183:9
- `functionHeader` | const | 184:9
- `variableHeader` | const | 185:9

## scripts/grant-pro-monthly-credits.ts

- `result` | const | 6:9

## scripts/migrate-credits-ledger.ts

- `BONUS_DAYS` | const | 6:7
- `PURCHASED_DAYS` | const | 7:7
- `addDays` | const | 9:7
- `db` | const | 12:9
- `users` | const | 13:9
- `migrated` | let | 14:7
- `user` | const | 16:14
- `userId` | const | 17:11
- `existingLots` | const | 18:11
- `totalCredits` | const | 21:11
- `bonusCredits` | const | 22:11
- `purchasedCredits` | const | 23:11
- `now` | const | 27:11
- `bonusExpiresAt` | const | 28:11
- `purchasedExpiresAt` | const | 29:11
- `lots` | const | 31:11
- `ledger` | const | 32:11
- `lotId` | const | 35:13
- `lotId` | const | 60:13

- `client` | const | 96:9
- `collectionName` | const | 99:16

## scripts/server-analysis-worker.ts

- `{ runServerAnalysisWorkerOnce }` | const | 5:7
- `result` | const | 8:9
- `error` | const | 17:16

## scripts/telegram-bot.ts

- `{ startManagedBot }` | const | 6:7
- `err` | const | 13:12

## src/actions/adminActions.ts

- `envSettings` | const | 30:11
- `getAllUsers` | const | 34:14
- `usersCollection` | const | 36:11
- `userSnapshot` | const | 37:11
- `userList` | const | 38:11
- `UpdateUserPermissionsSchema` | const | 45:7
- `updateUserPermissions` | const | 69:14
- `validation` | const | 70:9
- `{ currentUserId, targetUid, updates }` | const | 76:9
- `targetUserDoc` | const | 78:9
- `targetUserData` | const | 79:9
- `superAdminEmail` | const | 81:9
- `userRef` | const | 95:11
- `finalUpdates` | const | 97:11
- `error` | const | 121:12
- `AddCreditsSchema` | const | 127:7
- `addCreditsToUser` | const | 133:14
- `validation` | const | 134:9
- `{ currentUserId, targetUid, amount }` | const | 139:9
- `userRef` | const | 142:11
- `userDoc` | const | 143:11
- `result` | const | 148:11
- `error` | const | 163:12
- `SetUserStatusSchema` | const | 169:7
- `setUserStatus` | const | 175:14
- `validation` | const | 176:11
- `{ currentUserId, targetUid, status }` | const | 181:11
- `targetUserDoc` | const | 183:11
- `targetUserData` | const | 184:11
- `superAdminEmail` | const | 185:11
- `userRef` | const | 196:15
- `message` | const | 207:15
- `error` | const | 209:14
- `ArchiveUserSchema` | const | 215:7
- `archiveUser` | const | 220:14
- `validation` | const | 221:11
- `{ currentUserId, targetUid }` | const | 226:11
- `targetUserDoc` | const | 228:11
- `targetUserData` | const | 229:11
- `superAdminEmail` | const | 230:11
- `userRef` | const | 241:15
- `error` | const | 252:14
- `getReportedTickets` | const | 258:14
- `ticketsQuery` | const | 259:11
- `querySnapshot` | const | 265:15
- `ticketList` | const | 266:15
- `error` | const | 271:14
- `ResolveTicketSchema` | const | 279:7
- `returnCreditAndResolveTicket` | const | 286:14
- `validation` | const | 287:11
- `{ ticketId, userId, creditAmount, currentUserId }` | const | 292:11
- `ticketRef` | const | 294:11
- `batch` | const | 297:15
- `error` | const | 322:14
- `errorMessage` | const | 324:15
- `AppSettingsSchema` | const | 337:7
- `getAppSettings` | const | 345:14
- `settingsRef` | const | 347:15
- `docSnap` | const | 348:15
- `data` | const | 350:15
- `error` | const | 358:14
- `updateAppSettings` | const | 365:14
- `validation` | const | 366:11
- `flattened` | const | 368:15
- `firstError` | const | 369:15
- `settingsRef` | const | 374:15
- `error` | const | 382:14
- `promptsFilePath` | const | 389:7
- `getPrompts` | const | 391:14
- `fileContent` | const | 393:15
- `config` | const | 394:15
- `error` | const | 396:14
- `updatePrompts` | const | 402:14
- `fileContent` | const | 408:15
- `config` | const | 409:15
- `batch` | const | 411:15
- `prompt` | const | 413:20
- `promptDocRef` | const | 414:19
- `currentPromptDoc` | const | 415:19
- `lastVersion` | let | 417:17
- `currentVersionText` | let | 418:17
- `currentVersionRef` | const | 422:23
- `currentVersionSnap` | const | 423:23
- `newVersionNumber` | const | 430:23
- `versionRef` | const | 431:23
- `jsonString` | const | 446:15
- `error` | const | 454:14
- `ActivateTrialSchema` | const | 461:7
- `activateTrial` | const | 466:14
- `validation` | const | 467:11
- `{ userId, plan }` | const | 472:11
- `userRef` | const | 473:11
- `userDoc` | const | 476:15
- `userData` | const | 480:15
- `trialExpiresAt` | const | 486:15
- `error` | const | 504:14
- `getLegalEntity` | const | 511:14
- `docRef` | const | 513:15
- `docSnap` | const | 514:15
- `error` | const | 519:14
- `updateLegalEntity` | const | 525:14
- `validation` | const | 526:11
- `firstError` | const | 528:15
- `error` | const | 536:14
- `getTelegramUsers` | const | 544:14
- `q` | const | 546:15
- `snapshot` | const | 552:15
- `users` | const | 553:15
- `error` | const | 555:14
- `SendTelegramMessageSchema` | const | 565:7
- `sendTelegramMessageToUser` | const | 571:14
- `validation` | const | 572:9
- `error` | const | 574:11
- `adminDoc` | const | 579:9
- `envSettings` | const | 584:9
- `botToken` | const | 585:9
- `targetUserDoc` | const | 592:9
- `targetUserChatId` | const | 593:9
- `{ message }` | const | 598:9
- `bot` | const | 601:11
- `error` | const | 610:12
- `errorMessage` | const | 612:11
- `sectionsFilePath` | const | 626:7
- `getStandardSections` | const | 628:14
- `fileContent` | const | 630:15
- `error` | const | 632:14
- `updateStandardSections` | const | 642:14
- `jsonString` | const | 647:15
- `error` | const | 655:14
- `aiConfigFilePath` | const | 680:7
- `getAiAgentConfig` | const | 682:14
- `fileContent` | const | 684:15
- `error` | const | 686:14
- `updateAiAgentConfig` | const | 692:14
- `jsonString` | const | 694:15
- `error` | const | 698:14
- `getRecentLogs` | const | 706:14
- `logsQuery` | const | 707:11
- `snapshot` | const | 713:11
- `BugReportSchema` | const | 717:7
- `reportUserBug` | const | 726:14
- `validation` | const | 727:11
- `error` | const | 740:14
- `EnvSettingsSchema` | const | 817:7
- `SECRET_FIELDS` | const | 879:7
- `sanitizeEnvSettings` | const | 908:7
- `clone` | const | 909:11
- `ENV_FILE_MAP` | const | 918:7
- `envLine` | const | 960:7
- `envPath` | const | 964:15
- `existingContent` | let | 965:13
- `existingMap` | const | 971:15
- `trimmed` | const | 973:19
- `[k, ...rest]` | const | 975:19
- `v` | const | 976:19
- `val` | const | 981:19
- `finalLines` | const | 987:15
- `err` | const | 989:14
- `isAdminRole` | const | 1001:7
- `getEnvSettings` | const | 1003:14
- `{ requesterId, requireAdmin, allowInternal, stripSecrets }` | const | 1004:11
- `settingsRef` | const | 1007:15
- `docSnap` | const | 1008:15
- `data` | const | 1009:15
- `requesterIsAdmin` | let | 1011:13
- `userDoc` | const | 1013:19
- `canSeeSecrets` | const | 1021:15
- `error` | const | 1027:14
- `getPublicEnvSettings` | const | 1036:14
- `settings` | const | 1037:11
- `{ requesterId, requireAdmin }` | const | 1042:11
- `userDoc` | const | 1044:15
- `env` | const | 1050:11
- `mongoUri` | const | 1051:11
- `mongoDbName` | const | 1052:11
- `status` | const | 1054:11
- `client` | const | 1067:19
- `err` | const | 1072:18
- `s3Result` | const | 1080:15
- `err` | const | 1083:14
- `updateEnvSettings` | const | 1091:14
- `validation` | const | 1092:11
- `firstError` | const | 1095:15
- `settingsRef` | const | 1100:15
- `error` | const | 1105:14
- `getOzonBankSyncStatus` | const | 1111:14
- `envSettings` | const | 1112:11
- `docRef` | const | 1116:11
- `docSnap` | const | 1117:11
- `syncOzonBank` | const | 1121:14
- `envSettings` | const | 1122:11
- `baseUrl` | const | 1126:11
- `token` | const | 1127:11
- `syncPath` | const | 1128:11
- `url` | const | 1135:15
- `response` | const | 1136:15
- `payloadText` | const | 1143:15
- `status` | const | 1144:15
- `message` | const | 1145:15
- `error` | const | 1159:14
- `startTelegramBotService` | const | 1175:14
- `adminDoc` | const | 1176:11
- `status` | const | 1181:15
- `lockInstance` | const | 1182:15
- `localInstance` | const | 1183:15
- `e` | const | 1188:14
- `stopTelegramBotService` | const | 1193:14
- `adminDoc` | const | 1194:11
- `status` | const | 1198:11
- `getTelegramBotStatus` | const | 1202:14
- `adminDoc` | const | 1203:11
- `status` | const | 1207:11
- `forceUnlockTelegramBotService` | const | 1211:14
- `adminDoc` | const | 1212:11
- `status` | const | 1216:11
- `testTelegramMongoConnection` | const | 1220:14
- `adminDoc` | const | 1221:11
- `mongo` | const | 1226:15
- `e` | const | 1229:14
- `testTelegramApiConnection` | const | 1234:14
- `adminDoc` | const | 1235:11
- `envSettings` | const | 1239:11
- `botToken` | const | 1240:11
- `bot` | const | 1245:15
- `me` | const | 1246:15
- `e` | const | 1248:14
- `testTelegramWebhookInfo` | const | 1253:14
- `adminDoc` | const | 1254:11
- `envSettings` | const | 1258:11
- `botToken` | const | 1259:11
- `bot` | const | 1264:15
- `info` | const | 1265:15
- `e` | const | 1267:14
- `registerTelegramWebhookService` | const | 1272:14
- `adminDoc` | const | 1273:11
- `result` | const | 1278:15
- `e` | const | 1280:14
- `clearTelegramWebhookService` | const | 1285:14
- `adminDoc` | const | 1286:11
- `e` | const | 1293:14
- `pingTelegramBot` | const | 1298:14
- `adminDoc` | const | 1299:11
- `adminData` | const | 1303:11
- `envSettings` | const | 1307:11
- `botToken` | const | 1308:11
- `bot` | const | 1313:15
- `e` | const | 1316:14
- `pingTelegramWebhookEndpoint` | const | 1321:14
- `adminDoc` | const | 1322:11
- `adminData` | const | 1326:11
- `envSettings` | const | 1327:11
- `webhookUrl` | const | 1328:11
- `secretToken` | const | 1332:11
- `chatId` | const | 1333:11
- `update` | const | 1334:11
- `response` | const | 1353:15
- `text` | const | 1362:19
- `e` | const | 1366:14
- `COLLECTIONS_TO_WIPE` | const | 1374:7
- `wipeAllData` | const | 1385:14
- `deletedDocsCount` | let | 1387:13
- `collectionName` | const | 1389:20
- `collectionRef` | const | 1390:19
- `snapshot` | const | 1391:19
- `batch` | const | 1393:19
- `batchSize` | let | 1394:17
- `docSnap` | const | 1396:24
- `error` | const | 1422:14
- `BulkUpdateSchema` | const | 1429:7
- `validation` | const | 1436:11
- `{ model, filterType, filterValue }` | const | 1440:11
- `usersRef` | const | 1443:15
- `q` | const | 1444:15
- `snapshot` | const | 1446:15
- `batch` | const | 1451:15
- `userRef` | const | 1453:19
- `userData` | const | 1454:19
- `currentModels` | const | 1455:19
- `error` | const | 1464:14
- `getAiApiStats` | const | 1471:14
- `now` | const | 1473:15
- `startTime` | const | 1474:15
- `logsRef` | const | 1476:15
- `q` | const | 1477:15
- `snapshot` | const | 1478:15
- `statsByModel` | const | 1480:15
- `logData` | const | 1483:19
- `model` | const | 1484:19
- `totalCalls` | const | 1496:15
- `successCalls` | const | 1497:15
- `errorCalls` | const | 1498:15
- `totalCost` | const | 1499:15
- `error` | const | 1509:14
- `getFeedbackStats` | const | 1514:14
- `snapshot` | const | 1516:15
- `ratingsByModel` | const | 1518:15
- `response` | const | 1521:19
- `averageRatings` | const | 1531:15
- `error` | const | 1539:14
- `settings` | const | 1567:11
- `bucketType` | const | 1568:11
- `resolveConfig` | const | 1570:11
- `preset` | const | 1571:15
- `cfg` | const | 1572:15
- `endpoint` | const | 1573:15
- `provider` | const | 1574:15
- `resolved` | const | 1575:15
- `resolveBucketForPurpose` | const | 1589:11
- `resolvePresetForPurpose` | const | 1626:11
- `tryCreate` | const | 1634:11
- `cfg` | const | 1635:15
- `resolvedBucket` | const | 1636:15
- `bucketName` | const | 1637:15
- `bucketIsPublic` | const | 1638:15
- `shouldUseTenant` | const | 1645:15
- `accessKeyId` | const | 1646:15
- `s3Client` | const | 1647:15
- `presetId` | const | 1660:15
- `primaryError` | const | 1662:14
- `fallbackError` | const | 1666:22
- `testS3Connection` | const | 1674:14
- `{ s3Client }` | const | 1676:15
- `e` | const | 1679:13
- `listBuckets` | const | 1684:14
- `{ s3Client }` | const | 1686:15
- `{ Buckets }` | const | 1687:15
- `e` | const | 1689:14
- `createBucket` | const | 1694:14
- `{ s3Client }` | const | 1696:15
- `e` | const | 1699:14
- `getBucketCors` | const | 1704:14
- `{ s3Client, config }` | const | 1706:15
- `{ CORSRules }` | const | 1707:15
- `parser` | const | 1709:15
- `xml` | const | 1710:15
- `e` | const | 1713:13
- `putBucketCors` | const | 1721:14
- `{ s3Client, config }` | const | 1726:15
- `jsonObj` | let | 1727:13
- `parser` | const | 1729:19
- `parseError` | const | 1731:18
- `corsRule` | const | 1734:15
- `corsRulesArray` | const | 1735:15
- `toArray` | const | 1740:15
- `normalizedRules` | const | 1741:15
- `e` | const | 1756:13
- `details` | const | 1757:15
- `suffix` | const | 1762:15
- `deleteBucketCors` | const | 1767:14
- `{ s3Client, config }` | const | 1769:15
- `e` | const | 1772:14
- `getSurveys` | const | 1778:14
- `q` | const | 1779:11
- `snapshot` | const | 1780:11
- `getNotifications` | const | 1784:14
- `q` | const | 1785:11
- `snapshot` | const | 1786:11
- `createOrUpdateNotification` | const | 1790:14
- `docRef` | const | 1793:19
- `docRef` | const | 1797:19
- `error` | const | 1806:14
- `deleteNotification` | const | 1811:14
- `error` | const | 1815:14
- `createOrUpdateSurvey` | const | 1820:14
- `docRef` | const | 1823:19
- `docRef` | const | 1827:19
- `error` | const | 1831:14
- `deleteSurvey` | const | 1836:14
- `error` | const | 1840:14
- `getBannerConfig` | const | 1846:14
- `configRef` | const | 1848:15
- `docSnap` | const | 1849:15
- `error` | const | 1854:14
- `updateBannerConfig` | const | 1860:14
- `error` | const | 1865:14
- `getKnowledgeBaseArticles` | const | 1879:14
- `q` | const | 1880:11
- `snapshot` | const | 1881:11
- `updateKnowledgeBaseArticle` | const | 1885:14
- `error` | const | 1889:14

## src/actions/analysisActions.ts

- `DetailedProjectAnalysisInput` | const | 13:7
- `DetailedProjectAnalysisOutput` | const | 18:7

## src/actions/batchActions.ts

- `BatchPriceUpdateSchema` | const | 13:7
- `runBatchPriceUpdate` | const | 19:14
- `validation` | const | 20:9
- `{ userId, projectIds, selectedSections }` | const | 25:9
- `cost` | const | 28:11
- `deduction` | const | 29:11
- `priceBaseItems` | const | 43:11
- `filteredPriceBase` | const | 44:11
- `updatedProjectsCount` | let | 46:9
- `projectId` | const | 49:16
- `projectRef` | const | 50:13
- `projectDoc` | const | 51:13
- `projectData` | const | 54:13
- `resultMaterial` | const | 57:13
- `resultInstallation` | const | 63:13
- `error` | const | 81:12

## src/actions/companyActions.ts

- `CompanySchema` | const | 12:7
- `normalizeCompanyKey` | const | 37:7
- `cleanInn` | const | 38:11
- `cleanName` | const | 40:11
- `cleanType` | const | 44:11
- `addCompany` | const | 49:14
- `validation` | const | 50:11
- `firstError` | const | 52:15
- `isClient` | const | 57:15
- `dedupeKey` | const | 58:15
- `duplicatesQuery` | const | 59:15
- `duplicatesSnapshot` | const | 63:15
- `duplicate` | const | 64:15
- `docData` | const | 65:19
- `companiesCollection` | const | 72:15
- `error` | const | 81:14
- `updateCompany` | const | 88:14
- `partialSchema` | const | 89:12
- `validation` | const | 90:12
- `firstError` | const | 92:15
- `companyRef` | const | 97:15
- `existingSnap` | const | 98:15
- `existingData` | const | 99:15
- `mergedData` | const | 100:15
- `isClient` | const | 104:15
- `dedupeKey` | const | 105:15
- `duplicatesQuery` | const | 106:15
- `duplicatesSnapshot` | const | 110:15
- `duplicate` | const | 111:15
- `docData` | const | 113:19
- `error` | const | 127:14
- `deleteCompany` | const | 134:14
- `error` | const | 138:14
- `setDefaultCompany` | const | 145:14
- `batch` | const | 147:15
- `companiesRef` | const | 148:15
- `q` | const | 149:15
- `querySnapshot` | const | 151:15
- `docData` | const | 155:19
- `companyRef` | const | 157:19
- `error` | const | 168:14
- `suggestCompanyDetails` | const | 198:14
- `envSettings` | const | 205:15
- `apiKey` | const | 206:15
- `secretKey` | const | 207:15
- `response` | const | 213:15
- `error` | const | 228:14
- `errorMessage` | const | 230:15

## src/actions/creditActions.ts

- `CreditHistorySchema` | const | 8:7
- `db` | const | 25:9
- `user` | const | 26:9
- `validation` | const | 32:9
- `{ currentUserId, targetUserId, limit }` | const | 37:9
- `admin` | const | 39:11
- `docs` | const | 45:9
- `entries` | const | 46:9

## src/actions/creditPurchaseActions.ts

- `CreditPackageSchema` | const | 14:7
- `SbpOrderSchema` | const | 20:7
- `LegalOrderSchema` | const | 28:7
- `OrdersQuerySchema` | const | 37:7
- `OrderActionSchema` | const | 42:7
- `creditPackages` | const | 48:7
- `findPackage` | const | 50:7
- `db` | const | 53:9
- `user` | const | 54:9
- `db` | const | 59:9
- `admins` | const | 67:9
- `addHours` | const | 82:7
- `AUTO_APPROVE_HOURS` | const | 83:7
- `validation` | const | 86:9
- `{ userId, packageName, receiptUrl, receiptObjectKey, receiptFileName }` | const | 91:9
- `pkg` | const | 92:9
- `db` | const | 97:9
- `user` | const | 98:9
- `orderId` | const | 103:9
- `now` | const | 104:9
- `granted` | const | 123:9
- `validation` | const | 155:9
- `{ userId, packageName, invoiceUrl, invoiceNumber, companyId, companyName }` | const | 160:9
- `pkg` | const | 161:9
- `db` | const | 166:9
- `user` | const | 167:9
- `orderId` | const | 172:9
- `now` | const | 173:9
- `granted` | const | 192:9
- `validation` | const | 224:9
- `{ adminUserId, status }` | const | 229:9
- `db` | const | 234:9
- `filter` | const | 235:9
- `orders` | const | 237:9
- `validation` | const | 242:9
- `{ adminUserId, orderId }` | const | 247:9
- `db` | const | 252:9
- `order` | const | 253:9
- `granted` | const | 264:11
- `validation` | const | 287:9
- `{ adminUserId, orderId, reason }` | const | 292:9
- `db` | const | 297:9
- `order` | const | 298:9
- `error` | const | 314:14
- `db` | const | 329:9
- `now` | const | 330:9
- `pending` | const | 331:9
- `processed` | let | 337:7
- `order` | const | 338:14

## src/actions/documentTemplateActions.ts

- `templateListFromBase` | const | 30:7
- `TemplateCreateSchema` | const | 41:7
- `TemplateUpdateSchema` | const | 52:7
- `TemplateDeleteSchema` | const | 66:7
- `SettingsSchema` | const | 71:7
- `normalizeTemplates` | const | 76:7
- `isAdmin` | const | 91:7
- `db` | const | 92:9
- `user` | const | 93:9
- `resolveDefaultId` | const | 97:7
- `buildDefaultSettings` | const | 103:7
- `defaults` | const | 104:9
- `byType` | const | 127:9
- `availability` | const | 129:9
- `normalizeSettings` | const | 150:7
- `fallback` | const | 151:9
- `defaults` | const | 153:9
- `availability` | const | 154:9
- `db` | const | 172:9
- `templatesRaw` | const | 173:9
- `templates` | const | 174:9
- `settingsDoc` | const | 175:9
- `settings` | const | 176:9
- `validation` | const | 181:9
- `{ adminUserId, name, description, docType, accentColor, headerStyle, showSignature, showStamp }` | const | 189:9
- `db` | const | 190:9
- `templateId` | const | 191:9
- `now` | const | 192:9
- `validation` | const | 212:9
- `db` | const | 220:9
- `validation` | const | 230:9
- `db` | const | 238:9
- `validation` | const | 244:9
- `db` | const | 252:9

## src/actions/genkitActions.ts

- None

## src/actions/marketingActions.ts

- `BONUS_CREDITS` | const | 8:7
- `BONUS_DAYS` | const | 9:7
- `GrantSchema` | const | 11:7
- `BatchSchema` | const | 16:7
- `addDays` | const | 20:7
- `normalizeDate` | const | 22:7
- `date` | const | 26:9
- `isPlanEligible` | const | 30:7
- `validation` | const | 33:9
- `{ userId, source }` | const | 37:9
- `userRef` | const | 39:9
- `userSnap` | const | 40:9
- `user` | const | 44:9
- `lastGrantedAt` | const | 49:9
- `validation` | const | 71:9
- `limitCount` | const | 76:9
- `usersQuery` | const | 77:9
- `snapshot` | const | 82:9
- `candidates` | const | 83:9
- `processed` | let | 88:7
- `user` | const | 89:14
- `result` | const | 90:11

## src/actions/partnerActions.ts

- `usersRef` | const | 15:15
- `q` | const | 17:15
- `querySnapshot` | const | 19:15
- `referredUsers` | const | 20:15
- `error` | const | 28:14
- `userRef` | const | 40:15
- `error` | const | 47:14
- `HighTierApplicationSchema` | const | 53:7
- `submitHighTierApplication` | const | 60:14
- `validation` | const | 61:9
- `error` | const | 77:12
- `getPartnerRequests` | const | 84:14
- `q` | const | 86:15
- `snapshot` | const | 87:15
- `error` | const | 89:14
- `UpdateRequestStatusSchema` | const | 98:7
- `updatePartnerRequestStatus` | const | 103:14
- `validation` | const | 104:9
- `docRef` | const | 109:11
- `error` | const | 112:12

## src/actions/proSubscriptionActions.ts

- `MONTHLY_PRICE` | const | 12:7
- `LIFETIME_MONTHS` | const | 13:7
- `ALLOWED_MONTHS` | const | 14:7
- `PENDING_PRO_DAYS` | const | 15:7
- `AUTO_APPROVE_HOURS` | const | 16:7
- `SbpOrderSchema` | const | 18:7
- `LegalOrderSchema` | const | 26:7
- `OrderActionSchema` | const | 35:7
- `normalizeDate` | const | 43:7
- `date` | const | 47:9
- `addDays` | const | 51:7
- `addHours` | const | 52:7
- `db` | const | 55:9
- `user` | const | 56:9
- `db` | const | 61:9
- `admins` | const | 69:9
- `base` | const | 90:9
- `now` | const | 95:9
- `pendingUntil` | const | 96:9
- `updates` | const | 97:9
- `db` | const | 110:9
- `db` | const | 115:9
- `user` | const | 116:9
- `now` | const | 119:9
- `currentExpiresAt` | const | 120:9
- `isLifetime` | const | 121:9
- `newExpiresAt` | const | 122:9
- `updates` | const | 124:9
- `db` | const | 165:9
- `user` | const | 166:9
- `now` | const | 167:9
- `validation` | const | 216:9
- `{ userId, months, receiptUrl, receiptObjectKey, receiptFileName }` | const | 221:9
- `db` | const | 226:9
- `user` | const | 227:9
- `orderId` | const | 232:9
- `now` | const | 233:9
- `isLifetime` | const | 234:9
- `amount` | const | 235:9
- `autoApproveAt` | const | 236:9
- `validation` | const | 280:9
- `{ userId, months, invoiceUrl, invoiceNumber, companyId, companyName }` | const | 285:9
- `db` | const | 290:9
- `user` | const | 291:9
- `orderId` | const | 296:9
- `now` | const | 297:9
- `isLifetime` | const | 298:9
- `amount` | const | 299:9
- `isAdmin` | const | 343:9
- `db` | const | 348:9
- `filter` | const | 349:9
- `orders` | const | 350:9
- `validation` | const | 361:9
- `{ adminUserId, orderId }` | const | 365:9
- `isAdmin` | const | 366:9
- `db` | const | 371:9
- `order` | const | 372:9
- `validation` | const | 385:9
- `{ adminUserId, orderId, reason }` | const | 389:9
- `isAdmin` | const | 390:9
- `db` | const | 395:9
- `order` | const | 396:9
- `db` | const | 406:9
- `now` | const | 407:9
- `pending` | const | 408:9
- `processed` | let | 414:7
- `order` | const | 415:14

## src/actions/serviceRequestActions.ts

- `CreateRequestSchema` | const | 17:7
- `GetRequestsSchema` | const | 25:7
- `UpdateStatusSchema` | const | 31:7
- `dbClient` | const | 38:9
- `user` | const | 39:9
- `validation` | const | 44:9
- `payload` | const | 49:9
- `validation` | const | 62:9
- `{ adminUserId, status, type }` | const | 66:9
- `filters` | const | 71:9
- `q` | const | 74:9
- `snapshot` | const | 75:9
- `validation` | const | 80:9
- `{ adminUserId, requestId, status }` | const | 84:9

## src/actions/supportActions.ts

- `ThreadRequestSchema` | const | 40:7
- `MessageSchema` | const | 44:7
- `StatusSchema` | const | 51:7
- `ManagerThreadsSchema` | const | 58:7
- `MessagesRequestSchema` | const | 63:7
- `db` | const | 72:11
- `partner` | const | 73:11
- `envSettings` | const | 77:9
- `superAdminEmail` | const | 78:9
- `db` | const | 84:11
- `adminUser` | const | 85:11
- `db` | const | 103:9
- `user` | const | 104:9
- `mailerReady` | const | 119:9
- `mailer` | const | 121:11
- `from` | const | 122:11
- `envSettings` | const | 132:11
- `botToken` | const | 133:11
- `bot` | const | 135:13
- `err` | const | 138:16
- `validation` | const | 151:9
- `{ userId }` | const | 156:9
- `db` | const | 157:9
- `userDoc` | const | 158:9
- `managerId` | const | 163:9
- `thread` | let | 164:7
- `now` | const | 167:11
- `threadId` | const | 168:11
- `newThread` | const | 169:11
- `managerInfo` | let | 191:7
- `managerDoc` | const | 193:11
- `validation` | const | 227:9
- `{ threadId, requesterId }` | const | 231:9
- `db` | const | 232:9
- `thread` | const | 233:9
- `docs` | const | 241:9
- `validation` | const | 261:9
- `{ threadId, senderId, senderRole, message }` | const | 265:9
- `db` | const | 266:9
- `thread` | const | 267:9
- `senderDoc` | const | 272:9
- `isManager` | const | 277:9
- `now` | const | 289:9
- `update` | const | 299:9
- `createdAt` | const | 308:11
- `targetId` | const | 314:9
- `title` | const | 316:11
- `content` | const | 320:11
- `validation` | const | 328:9
- `{ threadId, actorId, status, satisfaction }` | const | 332:9
- `db` | const | 333:9
- `thread` | const | 334:9
- `actor` | const | 339:9
- `isManager` | const | 344:9
- `isOwner` | const | 348:9
- `update` | const | 354:9
- `validation` | const | 367:9
- `{ managerId, includeClosed }` | const | 371:9
- `db` | const | 372:9
- `manager` | const | 373:9
- `filter` | const | 378:9
- `threads` | const | 388:9

## src/actions/telegramActions.ts

- `LinkAccountSchema` | const | 18:7
- `validation` | const | 23:9
- `session` | const | 28:9
- `userId` | const | 29:9
- `{ initData }` | const | 34:9
- `envSettings` | const | 35:9
- `botToken` | const | 36:9
- `validatedData` | const | 43:11
- `{ id: telegramChatId, username: telegramUsername, firstName }` | const | 49:11
- `userRef` | const | 51:11
- `error` | const | 60:12
- `SendFileSchema` | const | 67:7
- `session` | const | 76:9
- `userId` | const | 77:9
- `envSettings` | const | 82:9
- `botToken` | const | 83:9
- `validation` | const | 89:9
- `{ fileData, fileName, fileMime, caption }` | const | 94:9
- `userDoc` | const | 96:9
- `chatId` | const | 97:9
- `bot` | const | 103:11
- `hasPrefix` | const | 108:11
- `base64Data` | const | 109:11
- `fileBuffer` | const | 110:11
- `detectedMime` | const | 111:11
- `normalizedMime` | const | 114:11
- `error` | const | 132:12
- `errorMessage` | const | 134:11
- `session` | const | 140:9
- `userId` | const | 141:9
- `q` | const | 147:11
- `snap` | const | 153:11
- `chatData` | const | 157:11
- `chatId` | const | 158:11
- `userRef` | const | 163:11
- `error` | const | 171:12

## src/actions/templateActions.ts

- `TemplateCreateSchema` | const | 10:7
- `TemplateUpdateSchema` | const | 21:7
- `TemplateDeleteSchema` | const | 34:7
- `sanitizeHeaderStyle` | const | 39:7
- `buildTemplateId` | const | 44:7
- `validation` | const | 47:9
- `{ userId, name, docType, description, accentColor, headerStyle, showSignature, showStamp }` | const | 52:9
- `db` | const | 53:9
- `user` | const | 54:9
- `plan` | const | 59:9
- `limit` | const | 60:9
- `existingCount` | const | 65:9
- `templateId` | const | 70:9
- `now` | const | 71:9
- `sanitizedColor` | const | 72:9
- `validation` | const | 93:9
- `{ userId, templateId, updates }` | const | 98:9
- `db` | const | 99:9
- `existing` | const | 100:9
- `payload` | const | 105:9
- `validation` | const | 123:9
- `{ userId, templateId }` | const | 128:9
- `db` | const | 129:9
- `existing` | const | 130:9
- `user` | const | 137:9

## src/actions/userActions.ts

- `UpdateProfileSchema` | const | 21:7
- `updateUserProfile` | const | 43:14
- `validation` | const | 44:9
- `firstError` | const | 46:11
- `errorMessage` | const | 47:11
- `{
    userId,
    displayName,
    telegramUsername,
    documentTemplates,
    signatureUrl,
    signatureObjectKey,
    signatureUrlExpirationTimestamp,
    stampUrl,
    stampObjectKey,
    stampUrlExpirationTimestamp,
    avatarUrl,
    avatarObjectKey,
    avatarUrlExpirationTimestamp,
  }` | const | 51:9
- `userRef` | const | 66:9
- `updatePayload` | const | 69:11
- `updatedFields` | const | 74:11
- `error` | const | 121:12
- `UpdatePlanModelPreferenceSchema` | const | 128:7
- `updatePlanModelPreference` | const | 134:14
- `validation` | const | 135:9
- `{ userId, plan, model }` | const | 139:9
- `allowedModels` | const | 140:9
- `preferenceKey` | const | 146:11
- `userRef` | const | 147:11
- `error` | const | 155:12
- `logThirdPartyConsent` | const | 161:14
- `error` | const | 169:12
- `MarketingConsentSchema` | const | 174:7
- `updateMarketingConsent` | const | 179:14
- `validation` | const | 180:9
- `{ userId, agreedToMarketing }` | const | 185:9
- `userRef` | const | 186:9
- `error` | const | 199:12
- `UpdatePwaStatusSchema` | const | 205:7
- `updateUserPwaStatus` | const | 209:14
- `validation` | const | 210:11
- `{ userId, isPWA }` | const | 214:11
- `userRef` | const | 215:11
- `error` | const | 219:14
- `PasswordResetSchema` | const | 226:7
- `sendPasswordReset` | const | 230:14
- `validation` | const | 231:11
- `mailerReady` | const | 237:15
- `dbClient` | const | 242:15
- `email` | const | 243:15
- `user` | const | 244:15
- `token` | const | 249:15
- `tokenHash` | const | 250:15
- `expiresAt` | const | 251:15
- `siteUrl` | const | 260:15
- `resetLink` | const | 261:15
- `mailer` | const | 262:15
- `from` | const | 263:15
- `error` | const | 272:14
- `deductCredit` | const | 279:14
- `error` | const | 283:12
- `QuoteConfigSchema` | const | 290:7
- `SaveVersionSchema` | const | 312:7
- `saveProjectVersion` | const | 339:14
- `validation` | const | 340:11
- `{ versionId, ...versionData }` | const | 346:11
- `batch` | const | 347:11
- `docRef` | let | 350:13
- `message` | let | 351:13
- `action` | let | 352:13
- `projectGroupQuery` | const | 358:19
- `querySnapshot` | const | 362:19
- `finalData` | const | 371:15
- `docSnap` | const | 384:19
- `finalProjectDoc` | const | 406:15
- `savedProject` | const | 407:15
- `error` | const | 410:14
- `errorMessage` | const | 412:15
- `finalizeProjectCreation` | const | 419:14
- `projectRef` | const | 425:9
- `now` | const | 429:13
- `userDoc` | const | 430:13
- `finalProjectData` | const | 446:13
- `finalProjectDoc` | const | 474:11
- `savedProject` | const | 475:11
- `error` | const | 479:12
- `errorMessage` | const | 481:11
- `getUserHistory` | const | 487:14
- `historyQuery` | const | 492:11
- `querySnapshot` | const | 498:11
- `historyList` | const | 499:11
- `ReportRequestSchema` | const | 507:7
- `reportRequest` | const | 513:14
- `validation` | const | 514:9
- `{ requestId, userId, fileSha1 }` | const | 519:9
- `requestRef` | const | 522:11
- `requestDoc` | const | 523:11
- `cacheRef` | const | 540:15
- `cacheSnap` | const | 541:15
- `error` | const | 549:12
- `ReturnCreditSchema` | const | 555:7
- `returnCreditForFailedRequest` | const | 560:14
- `validation` | const | 561:11
- `{ userId, creditAmount }` | const | 566:11
- `error` | const | 582:14
- `errorMessage` | const | 584:15
- `ArchiveRequestSchema` | const | 590:7
- `archiveRequest` | const | 595:14
- `validation` | const | 596:9
- `{ requestIds, userId }` | const | 601:9
- `batch` | const | 604:11
- `id` | const | 605:16
- `requestRef` | const | 606:13
- `message` | const | 612:11
- `error` | const | 614:12
- `unarchiveRequest` | const | 621:14
- `validation` | const | 622:9
- `{ requestIds, userId }` | const | 627:9
- `batch` | const | 630:11
- `id` | const | 631:16
- `requestRef` | const | 632:13
- `message` | const | 638:11
- `error` | const | 640:12
- `DeleteRequestSchema` | const | 646:7
- `deleteRequest` | const | 651:14
- `validation` | const | 652:11
- `{ requestIds, userId }` | const | 656:11
- `batch` | const | 659:15
- `id` | const | 660:20
- `message` | const | 665:15
- `error` | const | 667:14
- `UpdateRequestSchema` | const | 673:7
- `updateRequest` | const | 684:14
- `validation` | const | 685:11
- `{ requestIds, userId, updates }` | const | 689:11
- `batch` | const | 692:15
- `id` | const | 693:19
- `requestRef` | const | 694:19
- `error` | const | 708:14
- `updatePriceBase` | const | 714:14
- `batch` | const | 724:15
- `priceBaseCol` | const | 725:15
- `q` | const | 726:15
- `existingPriceBaseSnap` | const | 727:15
- `existingItems` | const | 728:15
- `specItem` | const | 730:20
- `itemKey` | const | 733:19
- `dataToSave` | const | 735:19
- `docId` | const | 751:23
- `docRef` | const | 752:23
- `newItemRef` | const | 756:23
- `error` | const | 766:14
- `getUserPriceBase` | const | 773:14
- `q` | const | 776:11
- `snapshot` | const | 777:11
- `PriceBaseItemUpdateSchema` | const | 786:7
- `savePriceBaseItems` | const | 797:14
- `batch` | const | 805:15
- `priceBaseCol` | const | 806:15
- `newIds` | const | 807:15
- `item` | const | 809:20
- `newItemRef` | const | 810:20
- `key` | const | 811:20
- `error` | const | 825:14
- `updatePriceBaseItem` | const | 831:14
- `docRef` | const | 835:15
- `docSnap` | const | 836:15
- `dataToUpdate` | const | 841:15
- `originalItem` | const | 842:15
- `hasIdentifyingFieldChanged` | const | 844:15
- `newName` | const | 851:20
- `newModel` | const | 852:20
- `newBrand` | const | 853:20
- `newUnit` | const | 854:20
- `error` | const | 862:14
- `incrementAiCallCount` | const | 868:14
- `projectRef` | const | 871:11
- `error` | const | 878:14
- `CreateProcessingRequestSchema` | const | 886:7
- `createProcessingRequest` | const | 899:14
- `validation` | const | 900:11
- `{ userId, ...payload }` | const | 905:11
- `projectRef` | const | 906:11
- `baseData` | const | 909:15
- `finalDoc` | const | 961:15
- `error` | const | 963:14
- `FinalizeProcessingRequestSchema` | const | 989:7
- `finalizeProcessingRequest` | const | 1008:14
- `validation` | const | 1009:11
- `{
        userId, projectId, creditCost, outputSpecifications, quoteConfig,
        aiComment, analysisDetails, importantExtractionNotes, aiCallCount,
        initialAiResponse, ...rest
    }` | const | 1013:11
- `userRef` | const | 1019:11
- `projectRef` | const | 1020:11
- `now` | const | 1024:19
- `userDoc` | const | 1025:19
- `projectDoc` | const | 1027:19
- `finalDoc` | const | 1099:15
- `error` | const | 1101:14
- `FailProcessingRequestSchema` | const | 1125:7
- `failProcessingRequest` | const | 1132:14
- `validation` | const | 1133:11
- `{ userId, projectId, status, error }` | const | 1137:11
- `projectRef` | const | 1138:11
- `projectSnap` | const | 1141:15
- `projectData` | const | 1143:15
- `err` | const | 1173:14
- `linkRequestToServerJob` | const | 1189:14
- `{ userId, projectId, serverJobId }` | const | 1190:11
- `projectRef` | const | 1193:15
- `projectSnap` | const | 1194:15
- `projectData` | const | 1196:15
- `err` | const | 1220:14
- `RestartProcessingRequestSchema` | const | 1237:7
- `restartProcessingRequest` | const | 1244:14
- `validation` | const | 1245:11
- `{ userId, projectId, fileUri, s3ObjectKey }` | const | 1249:11
- `projectRef` | const | 1250:11
- `snap` | const | 1252:15
- `project` | const | 1254:15
- `err` | const | 1289:14

## src/ai/flows/create-lead-flow.ts

- `CreateLeadInputSchema` | const | 11:7
- `CreateLeadOutputSchema` | const | 18:7
- `uniqueIdentifier` | const | 37:9
- `shareableLink` | const | 38:9

## src/ai/flows/extract-project-specifications.ts

- `ExtractProjectSpecificationsInputSchema` | const | 16:7

## src/ai/flows/find-missing-items-flow.ts

- `ItemToIgnoreSchema` | const | 13:7
- `findMissingPromptConfig` | const | 34:7
- `BASE_PROMPT` | const | 38:7
- `existingItemsString` | const | 43:9
- `finalPrompt` | const | 45:9
- `fileData` | const | 47:9
- `result` | const | 50:9
- `resultText` | const | 57:9
- `parsedOutput` | let | 62:7
- `jsonMatch` | const | 65:11
- `jsonString` | const | 70:13
- `validationResult` | const | 74:11
- `e` | const | 82:12

## src/ai/flows/improve-text-request-flow.ts

- `ImproveTextRequestInputSchema` | const | 17:7
- `ImproveTextRequestOutputSchema` | const | 23:7
- `promptConfig` | const | 28:7
- `PROMPT` | const | 32:7
- `finalPrompt` | const | 35:9
- `result` | const | 37:9
- `resultText` | const | 43:9
- `cleanedText` | const | 50:9

## src/ai/flows/refine-items-flow.ts

- `ItemToRefineSchema` | const | 16:7
- `RefinedSpecItemSchema` | const | 42:7
- `RefineItemsOutputSchema` | const | 48:14
- `REFINE_PROMPT_CONFIG` | const | 55:7
- `FILL_EMPTY_PROMPT_CONFIG` | const | 56:7
- `REFINE_PROMPT_TEMPLATE` | const | 61:7
- `FILL_EMPTY_PROMPT_TEMPLATE` | const | 62:7
- `itemsString` | const | 69:9
- `finalPrompt` | const | 72:9
- `result` | const | 78:9
- `resultText` | const | 90:9
- `parsedOutput` | let | 95:7
- `startIndex` | const | 97:11
- `endIndex` | const | 98:11
- `jsonString` | const | 102:11
- `validationResult` | const | 105:11
- `e` | const | 113:12

## src/ai/flows/suggest-item-prices-flow.ts

- `suggestPricesPromptConfig` | const | 19:7
- `BASE_PROMPT` | const | 23:7
- `prompt` | let | 27:9
- `itemsString` | const | 29:11
- `validatedInput` | const | 47:9
- `prompt` | const | 48:9
- `result` | const | 51:9
- `resultText` | const | 56:9
- `parsedOutput` | const | 63:11
- `error` | const | 68:12

## src/ai/flows/suggest-private-prices-flow.ts

- `SuggestPrivatePricesInputSchema` | const | 14:7
- `SuggestPrivatePricesOutputSchema` | const | 22:7
- `len1` | let | 33:9
- `len2` | let | 33:27
- `match_distance` | const | 36:11
- `s1_matches` | const | 37:11
- `s2_matches` | const | 38:11
- `matches` | let | 39:9
- `i` | let | 41:14
- `start` | const | 42:15
- `end` | const | 43:15
- `j` | let | 44:18
- `t` | let | 56:9
- `k` | let | 57:9
- `i` | let | 58:14
- `jaro` | const | 66:11
- `p` | let | 68:9
- `l` | let | 69:9
- `{ itemsToPrice, priceBaseItems, priceTypeToSuggest }` | const | 79:9
- `pricedItems` | const | 81:9
- `bestMatch` | let | 86:9
- `matchReason` | let | 87:9
- `modelMatch` | const | 92:15
- `highestScore` | let | 102:11
- `potentialMatch` | let | 103:11
- `baseItem` | const | 105:18
- `score` | const | 106:17
- `updates` | const | 124:13
- `commentText` | let | 125:11

## src/ai/genkit-schemas.ts

- `AiSpecificationItemSchema` | const | 8:14
- `AnalysisDetailsSchema` | const | 24:14
- `ExtractProjectSpecificationsOutputSchema` | const | 36:14
- `RefinedSpecItemBaseSchema` | const | 46:7
- `RefineItemsOutputSchema` | const | 51:14
- `LegalEntitySchema` | const | 57:14
- `ItemToPriceSchema` | const | 74:7
- `SuggestItemPricesInputSchema` | const | 85:14
- `PricedItemSchema` | const | 95:7
- `SuggestItemPricesOutputSchema` | const | 102:14

## src/app/api/admin/server-functions/requeue/route.ts

- `{ limit = 20 }` | const | 6:11
- `result` | const | 7:11
- `error` | const | 9:12

## src/app/api/admin/server-functions/run-worker/route.ts

- `{ limit = 3 }` | const | 7:11
- `settings` | const | 9:11
- `result` | const | 13:11
- `error` | const | 15:12

## src/app/api/admin/test-connectivity/route.ts

- `requesterId` | const | 6:11
- `result` | const | 7:11
- `error` | const | 9:12

## src/app/api/auth/[...nextauth]/route.ts

- `handler` | const | 4:7

## src/app/api/auth/register/route.ts

- `body` | const | 11:9
- `email` | const | 16:9
- `password` | const | 17:9
- `db` | const | 22:9
- `existingUser` | const | 23:9
- `{ apiModels }` | const | 28:9
- `defaultModel` | const | 29:9
- `superAdminEmail` | const | 30:9
- `isSuperAdmin` | const | 31:9
- `systemRole` | const | 32:9
- `plan` | const | 33:9
- `userId` | const | 35:9
- `passwordHash` | const | 36:9
- `now` | const | 37:9
- `userData` | const | 39:9
- `trialDays` | const | 74:11
- `trialExpiresAt` | const | 75:11
- `referrer` | const | 87:11
- `error` | const | 97:16

## src/app/api/auth/request-password-setup/route.ts

- `body` | const | 6:9
- `email` | const | 11:9
- `db` | const | 12:9
- `user` | const | 13:9
- `token` | const | 19:9
- `tokenHash` | const | 20:9
- `expiresAt` | const | 21:9
- `response` | const | 30:9

## src/app/api/auth/reset/route.ts

- `body` | const | 8:9
- `password` | const | 13:9
- `tokenHash` | const | 18:9
- `db` | const | 19:9
- `resetDoc` | const | 21:9
- `passwordHash` | const | 30:9

## src/app/api/auth/set-password/route.ts

- `body` | const | 9:9
- `password` | const | 14:9
- `token` | const | 19:9
- `tokenHash` | const | 24:9
- `db` | const | 25:9
- `setupDoc` | const | 27:9
- `email` | const | 36:9
- `user` | const | 37:9
- `passwordHash` | const | 42:9

## src/app/api/db/route.ts

- `adminCollections` | const | 11:7
- `userOwnedCollections` | const | 22:7
- `sharedCollections` | const | 31:7
- `mongoFilter` | const | 38:9
- `filter` | const | 39:14
- `set` | const | 70:9
- `inc` | const | 71:9
- `addToSet` | const | 72:9
- `update` | const | 86:9
- `doc` | const | 109:9
- `session` | const | 116:9
- `body` | const | 121:9
- `db` | const | 126:9
- `admin` | const | 127:9
- `userId` | const | 128:9
- `{ op }` | const | 130:9
- `ref` | const | 135:15
- `doc` | const | 148:15
- `query` | const | 152:15
- `hasPublished` | const | 166:17
- `filter` | const | 173:15
- `cursor` | const | 174:15
- `sort` | const | 176:17
- `docs` | const | 185:15
- `ref` | const | 189:15
- `data` | const | 190:15
- `docId` | const | 209:15
- `ref` | const | 214:15
- `data` | const | 215:15
- `options` | const | 216:15
- `update` | const | 236:17
- `ref` | const | 244:15
- `data` | const | 245:15
- `update` | const | 261:15
- `ref` | const | 266:15
- `error` | const | 288:12

## src/app/api/find-missing/route.ts

- `FIND_MISSING_COST` | const | 10:7
- `FindMissingRequestSchema` | const | 13:7
- `body` | const | 52:11
- `validation` | const | 53:11
- `{ userId, fileUri, fileName, mimeType, existingItems, model: modelOverride, projectId }` | const | 59:11
- `findResult` | const | 62:11
- `findInput` | const | 63:15
- `findOutput` | const | 72:15
- `hydratedItems` | const | 90:11
- `error` | const | 99:12
- `errorMessage` | const | 101:11

## src/app/api/health/route.ts

- `health` | const | 7:11
- `error` | const | 9:12

## src/app/api/main-analysis/route.ts

- `MainAnalysisRequestSchema` | const | 6:7
- `body` | const | 23:11
- `validation` | const | 24:11
- `analysisInput` | const | 30:11
- `{ text, rawResponse }` | const | 33:11
- `finalJsonResponse` | let | 37:9
- `e` | const | 52:14
- `jsonMatch` | const | 55:15
- `e2` | const | 59:22
- `error` | const | 71:12
- `errorMessage` | const | 73:11

## src/app/api/query/route.ts

- `adminCollections` | const | 9:7
- `userOwnedCollections` | const | 20:7
- `mongoFilter` | const | 31:9
- `filter` | const | 32:14
- `session` | const | 71:9
- `body` | const | 76:9
- `admin` | const | 81:9
- `userId` | const | 82:9
- `db` | const | 83:9
- `doc` | const | 97:13
- `filters` | const | 108:11
- `hasPublished` | const | 113:13
- `filter` | const | 121:11
- `cursor` | const | 122:11
- `sort` | const | 124:13
- `docs` | const | 133:11
- `error` | const | 135:12

## src/app/api/realtime/route.ts

- `match` | const | 8:9
- `filter` | const | 9:14
- `key` | const | 10:11
- `session` | const | 41:9
- `{ searchParams }` | const | 46:9
- `type` | const | 47:9
- `collection` | const | 48:9
- `db` | const | 53:9
- `encoder` | const | 54:9
- `stream` | const | 56:9
- `pipeline` | const | 60:13
- `id` | const | 62:15
- `rawFilters` | const | 67:15
- `filters` | const | 68:15
- `match` | const | 69:15
- `changeStream` | const | 75:13
- `onChange` | const | 77:13

## src/app/api/s3-refresh-url/route.ts

- `{ objectKey, presetId, bucketType }` | const | 9:11
- `{ s3Client, config }` | const | 15:11
- `expiration` | const | 17:11
- `getCommand` | const | 19:11
- `newAccessUrl` | const | 24:11
- `newExpirationTimestamp` | const | 29:11
- `error` | const | 33:12
- `errorMessage` | const | 35:11

## src/app/api/s3-upload/route.ts

- `{ fileName, fileType, presetId, bucketType }` | const | 12:11
- `{ s3Client, config }` | const | 18:11
- `objectKey` | const | 21:11
- `putCommand` | const | 23:11
- `uploadUrl` | const | 28:11
- `accessUrl` | let | 32:9
- `urlExpirationTimestamp` | let | 33:9
- `getUrlExpiration` | const | 42:15
- `getCommand` | const | 43:15
- `error` | const | 56:12
- `errorMessage` | const | 58:11

## src/app/api/server-analysis/cancel/route.ts

- `CancelSchema` | const | 7:7
- `payload` | const | 15:11
- `validation` | const | 16:11
- `{ jobId, userId, projectId }` | const | 21:11
- `job` | const | 22:11
- `projectToUpdate` | const | 33:11
- `error` | const | 39:12

## src/app/api/server-analysis/route.ts

- `RequestSchema` | const | 13:7
- `json` | const | 28:11
- `validation` | const | 29:11
- `payload` | const | 33:11
- `appSettings` | const | 35:11
- `userRef` | const | 40:11
- `userSnap` | const | 41:11
- `userData` | const | 45:11
- `plan` | const | 46:11
- `allowedPlans` | const | 47:11
- `creditSummary` | const | 53:11
- `job` | const | 58:11
- `error` | const | 93:12

## src/app/api/telegram/webhook/route.ts

- `secretHeader` | const | 7:11
- `isValid` | const | 8:11
- `update` | const | 13:11
- `error` | const | 16:12

## src/app/auth/login/page.tsx

- `router` | const | 19:9
- `{ toast }` | const | 20:9
- `[email, setEmail]` | const | 21:9
- `[password, setPassword]` | const | 22:9
- `[isLoginPending, startLoginTransition]` | const | 23:9
- `[error, setError]` | const | 24:9
- `[isResetPending, startResetTransition]` | const | 26:9
- `[showPassword, setShowPassword]` | const | 27:9
- `handleLogin` | const | 29:9
- `result` | const | 34:15
- `session` | const | 53:15
- `userId` | const | 54:15
- `isFirstLogin` | const | 57:15
- `error` | const | 67:18
- `handlePasswordReset` | const | 78:9
- `result` | const | 84:13

## src/app/auth/register/page.tsx

- `{ apiModels }` | const | 23:7
- `router` | const | 28:9
- `searchParams` | const | 29:9
- `{ toast }` | const | 30:9
- `[email, setEmail]` | const | 32:9
- `[password, setPassword]` | const | 33:9
- `[phone, setPhone]` | const | 34:9
- `[promoCode, setPromoCode]` | const | 35:9
- `[agreedToTerms, setAgreedToTerms]` | const | 36:9
- `[agreedToPrivacy, setAgreedToPrivacy]` | const | 37:9
- `[agreedToMarketing, setAgreedToMarketing]` | const | 38:9
- `[agreedToThirdParty, setAgreedToThirdParty]` | const | 39:9
- `[isPending, startTransition]` | const | 41:9
- `[error, setError]` | const | 42:9
- `[showPromoInput, setShowPromoInput]` | const | 44:9
- `referralCode` | const | 45:9
- `handleRegister` | const | 54:9
- `defaultModel` | const | 64:15
- `response` | const | 68:15
- `errorPayload` | const | 86:17
- `loginResult` | const | 90:15
- `error` | const | 98:16
- `isSubmitDisabled` | const | 109:9

## src/app/auth/reset/page.tsx

- `searchParams` | const | 14:9
- `router` | const | 15:9
- `{ toast }` | const | 16:9
- `token` | const | 17:9
- `[password, setPassword]` | const | 19:9
- `[confirm, setConfirm]` | const | 20:9
- `[error, setError]` | const | 21:9
- `[isPending, startTransition]` | const | 22:9
- `handleReset` | const | 24:9
- `response` | const | 40:13
- `payload` | const | 46:15

## src/app/auth/set-password/page.tsx

- `router` | const | 14:9
- `{ toast }` | const | 15:9
- `[email, setEmail]` | const | 16:9
- `[password, setPassword]` | const | 17:9
- `[confirm, setConfirm]` | const | 18:9
- `[error, setError]` | const | 19:9
- `[isPending, startTransition]` | const | 20:9
- `handleSetPassword` | const | 22:9
- `response` | const | 39:13
- `payload` | const | 45:15

## src/app/configure-quote/page.tsx

- `router` | const | 15:9
- `{ toast }` | const | 16:9
- `{ quoteConfig, setQuoteConfig, resetState }` | const | 17:9
- `handleCheckboxChange` | const | 28:9
- `handleCostChange` | const | 38:9
- `cost` | const | 39:11
- `handleNextClick` | const | 43:9
- `handleBackToDashboard` | const | 52:9
- `handleSaveDraft` | const | 58:9

## src/app/dashboard/admin/ai-agent/page.tsx

- `{ toast }` | const | 25:9
- `{ user }` | const | 26:9
- `[config, setConfig]` | const | 27:9
- `[isLoading, setIsLoading]` | const | 28:9
- `[isPending, startTransition]` | const | 29:9
- `[isModelDialogOpen, setIsModelDialogOpen]` | const | 30:9
- `[modelToEdit, setModelToEdit]` | const | 31:9
- `[isAddFromProviderDialogOpen, setIsAddFromProviderDialogOpen]` | const | 32:9
- `hasUnsavedChanges` | const | 34:9
- `fetchConfig` | const | 45:11
- `currentConfig` | const | 48:15
- `error` | const | 50:16
- `handleProviderConfigChange` | const | 63:9
- `newProviders` | const | 66:15
- `handlePdfPriorityChange` | const | 77:7
- `moveEngine` | const | 81:7
- `currentPriority` | const | 84:11
- `index` | const | 85:11
- `handleModelConfigChange` | const | 98:9
- `newApiModels` | const | 101:15
- `handleSetServiceModel` | const | 107:9
- `newApiModels` | const | 110:13
- `handleSetVoiceModel` | const | 118:9
- `newApiModels` | const | 121:13
- `handleSaveModel` | const | 129:9
- `newModels` | const | 132:15
- `oldModel` | const | 135:19
- `handleAddMultipleModels` | const | 151:9
- `newModels` | const | 152:13
- `handleRemoveModel` | const | 167:9
- `newApiModels` | const | 170:15
- `getPlanModels` | const | 175:9
- `updatePlanModelField` | const | 182:9
- `planModels` | const | 185:13
- `togglePlanModelList` | const | 199:9
- `planModels` | const | 202:13
- `currentList` | const | 203:13
- `handleSave` | const | 222:9
- `validModelIds` | const | 225:13
- `sanitize` | const | 226:13
- `sanitizeDefault` | const | 227:13
- `preparedConfig` | const | 228:13
- `result` | const | 253:13
- `planModels` | const | 270:9
- `modelOptions` | const | 271:9
- `renderPlanModelChecklist` | const | 273:9
- `renderModelSettings` | const | 294:9
- `originalIndex` | const | 412:39

## src/app/dashboard/admin/ai-analytics/page.tsx

- `StatusBadge` | const | 28:7
- `isSuccess` | const | 29:11
- `{ toast }` | const | 39:9
- `[logs, setLogs]` | const | 40:9
- `[isLoading, setIsLoading]` | const | 41:9
- `{ user }` | const | 42:9
- `[searchTerm, setSearchTerm]` | const | 43:9
- `[isUpdating, startUpdating]` | const | 44:9
- `fetchLogs` | const | 46:9
- `logsQuery` | const | 50:15
- `unsubscribe` | const | 51:15
- `logList` | const | 52:19
- `error` | const | 60:14
- `unsubscribe` | const | 67:11
- `handleStatusUpdate` | const | 71:9
- `e` | const | 76:19
- `filteredLogs` | const | 82:9
- `lowerSearch` | const | 84:11

## src/app/dashboard/admin/credit-payments/page.tsx

- `statusLabels` | const | 17:7
- `{ user }` | const | 26:9
- `{ toast }` | const | 27:9
- `[orders, setOrders]` | const | 28:9
- `[isLoading, setIsLoading]` | const | 29:9
- `[statusFilter, setStatusFilter]` | const | 30:9
- `[isActionPending, startTransition]` | const | 31:9
- `loadOrders` | const | 33:9
- `result` | const | 36:11
- `handleApprove` | const | 53:9
- `result` | const | 56:13
- `handleReject` | const | 66:9
- `reason` | const | 68:11
- `result` | const | 70:13
- `filters` | const | 80:9
- `createdAt` | const | 138:25
- `dateLabel` | const | 139:25
- `docUrl` | const | 140:25
- `methodLabel` | const | 141:25
- `statusLabel` | const | 142:25

## src/app/dashboard/admin/feedback-surveys/page.tsx

- `SurveyFormDialog` | const | 24:7
- `{ user }` | const | 35:9
- `{ toast }` | const | 36:9
- `[isPending, setIsPending]` | const | 37:9
- `[title, setTitle]` | const | 39:9
- `[description, setDescription]` | const | 40:9
- `[isActive, setIsActive]` | const | 41:9
- `[questions, setQuestions]` | const | 42:9
- `handleSave` | const | 58:9
- `surveyData` | const | 61:11
- `result` | const | 62:11
- `addQuestion` | const | 72:9
- `{ toast }` | const | 116:11
- `[surveys, setSurveys]` | const | 117:11
- `[isLoading, setIsLoading]` | const | 118:11
- `[isDialogOpen, setIsDialogOpen]` | const | 119:11
- `[selectedSurvey, setSelectedSurvey]` | const | 120:11
- `fetchSurveys` | const | 122:11
- `data` | const | 125:19
- `error` | const | 127:18
- `handleOpenDialog` | const | 138:11
- `handleDelete` | const | 143:11
- `result` | const | 144:15

## src/app/dashboard/admin/layout.tsx

- `navGroups` | const | 20:7
- `warmUpIndexes` | const | 90:7
- `queries` | const | 95:15
- `error` | const | 110:14
- `{ user, isNavigating: isAppNavigating }` | const | 122:9
- `router` | const | 123:9
- `pathname` | const | 124:9
- `[isPageTransitioning, startPageTransition]` | const | 125:9
- `isNavigating` | const | 126:9
- `[activeGroup, setActiveGroup]` | const | 127:9
- `[searchOpen, setSearchOpen]` | const | 128:9
- `[searchTerm, setSearchTerm]` | const | 129:9
- `handleNavigation` | const | 146:9
- `flatLinks` | const | 155:9
- `matchedGroup` | const | 157:11
- `filteredLinks` | const | 161:9
- `isActive` | const | 200:31
- `isActive` | const | 234:39
- `isActive` | const | 272:43

## src/app/dashboard/admin/logs/page.tsx

- `{ toast }` | const | 26:9
- `[logs, setLogs]` | const | 27:9
- `[isLoading, setIsLoading]` | const | 28:9
- `{ user }` | const | 29:9
- `fetchLogs` | const | 31:9
- `logsQuery` | const | 35:15
- `unsubscribe` | const | 36:15
- `logList` | const | 37:19
- `error` | const | 55:14
- `unsubscribe` | const | 62:11
- `getActionInfo` | const | 66:9
- `defaultInfo` | const | 67:11
- `actionInfo` | const | 139:23

## src/app/dashboard/admin/marketing/page.tsx

- `WidgetGenerator` | const | 15:7
- `[width, setWidth]` | const | 16:11
- `[height, setHeight]` | const | 17:11
- `{ toast }` | const | 18:11
- `baseUrl` | const | 20:11
- `widgetUrl` | const | 21:11
- `iframeCode` | const | 23:11
- `handleCopy` | const | 25:11
- `[partnerId, setPartnerId]` | const | 68:11

## src/app/dashboard/admin/notifications/page.tsx

- `welcomeTemplate` | const | 27:7
- `referralTemplate` | const | 38:7
- `NotificationDialog` | const | 46:7
- `{ user }` | const | 57:9
- `{ toast }` | const | 58:9
- `[isPending, startTransition]` | const | 59:9
- `[title, setTitle]` | const | 61:9
- `[content, setContent]` | const | 62:9
- `[type, setType]` | const | 63:9
- `[status, setStatus]` | const | 64:9
- `handleSave` | const | 76:9
- `result` | const | 82:13
- `{ user }` | const | 142:9
- `{ toast }` | const | 143:9
- `[notifications, setNotifications]` | const | 144:9
- `[isLoading, setIsLoading]` | const | 145:9
- `[isActionPending, startActionTransition]` | const | 146:9
- `[isDialogOpen, setIsDialogOpen]` | const | 147:9
- `[selectedNotification, setSelectedNotification]` | const | 148:9
- `[bannerConfig, setBannerConfig]` | const | 151:9
- `[isSavingBanner, startSavingBanner]` | const | 152:9
- `fetchNotifications` | const | 154:9
- `data` | const | 158:13
- `error` | const | 160:14
- `fetchBannerConfig` | const | 167:9
- `config` | const | 170:17
- `e` | const | 172:16
- `handleEdit` | const | 182:9
- `handleClone` | const | 187:9
- `handleCreate` | const | 192:9
- `handleDelete` | const | 197:9
- `result` | const | 200:13
- `handleToggleStatus` | const | 210:9
- `newStatus` | const | 213:13
- `result` | const | 214:13
- `handleSaveBanner` | const | 224:9
- `result` | const | 227:17
- `getStatusBadge` | const | 236:9
- `getTypeIcon` | const | 242:10

## src/app/dashboard/admin/page.tsx

- `chartConfig` | const | 27:7
- `useLocalStorageState` | const | 42:7
- `[state, setState]` | const | 43:11
- `item` | const | 46:19
- `error` | const | 48:18
- `sizeToMeta` | const | 63:7
- `formatNumber` | const | 72:7
- `[stats, setStats]` | const | 79:11
- `[period, setPeriod]` | const | 80:11
- `[selectedMetrics, setSelectedMetrics]` | const | 81:11
- `[aiStats, setAiStats]` | const | 82:11
- `[widgets, setWidgets]` | const | 83:11
- `[pendingWidget, setPendingWidget]` | const | 91:11
- `[draggingId, setDraggingId]` | const | 92:11
- `[dragOverId, setDragOverId]` | const | 93:11
- `[dragSizePreview, setDragSizePreview]` | const | 94:11
- `fetchStats` | const | 97:15
- `[usersSnapshot, requestsSnapshot, logsSnapshot, eventsSnapshot, apiStatsResult]` | const | 101:23
- `users` | const | 118:23
- `requests` | const | 119:23
- `logs` | const | 120:23
- `events` | const | 121:23
- `telegramUsersFromEvents` | const | 122:23
- `pwaUsersFromEvents` | const | 123:23
- `telegramUsers` | const | 124:23
- `pwaUsers` | const | 125:23
- `totalUsers` | const | 127:23
- `usersByPlan` | const | 128:23
- `plan` | const | 129:27
- `paidUsers` | const | 134:23
- `trialUsers` | const | 135:23
- `reportedTickets` | const | 136:23
- `now` | const | 138:23
- `periodStart` | const | 139:23
- `days` | const | 140:23
- `chartDataMap` | const | 142:23
- `reqDate` | const | 149:31
- `reqDateStr` | const | 151:35
- `dayData` | const | 152:35
- `regDate` | const | 163:31
- `regDateStr` | const | 165:35
- `dayData` | const | 166:35
- `logDate` | const | 176:32
- `logDateStr` | const | 178:35
- `dayData` | const | 179:35
- `chartData` | const | 187:23
- `engagementMap` | const | 195:23
- `dt` | const | 197:27
- `key` | const | 198:27
- `item` | const | 202:27
- `engagementChart` | const | 206:23
- `creditsUsedInPeriod` | const | 208:23
- `rolesForPieChart` | const | 210:24
- `error` | const | 233:22
- `handleMetricToggle` | const | 242:11
- `newSet` | const | 244:19
- `availableWidgets` | const | 254:11
- `activeIds` | const | 255:15
- `updateSize` | const | 259:11
- `moveWidget` | const | 263:11
- `idx` | const | 265:19
- `newOrder` | const | 267:19
- `swapWith` | const | 268:19
- `removeWidget` | const | 275:11
- `addWidget` | const | 279:11
- `widgetContent` | const | 292:7
- `def` | const | 570:27
- `meta` | const | 572:27
- `colSpan` | const | 573:27
- `colClass` | const | 574:27
- `current` | const | 585:43
- `from` | const | 586:43
- `to` | const | 587:43
- `[moved]` | const | 589:43
- `MiniStat` | const | 661:7
- `content` | const | 662:11

## src/app/dashboard/admin/partner-requests/page.tsx

- `statusMap` | const | 28:7
- `{ toast }` | const | 36:9
- `{ user }` | const | 37:9
- `[requests, setRequests]` | const | 38:9
- `[isLoading, setIsLoading]` | const | 39:9
- `[isUpdating, startUpdating]` | const | 40:9
- `fetchRequests` | const | 42:9
- `data` | const | 49:13
- `error` | const | 51:14
- `handleStatusChange` | const | 66:9
- `result` | const | 69:15

## src/app/dashboard/admin/pro-payments/page.tsx

- `statusLabels` | const | 17:7
- `{ user }` | const | 26:9
- `{ toast }` | const | 27:9
- `[orders, setOrders]` | const | 28:9
- `[isLoading, setIsLoading]` | const | 29:9
- `[statusFilter, setStatusFilter]` | const | 30:9
- `[isActionPending, startTransition]` | const | 31:9
- `loadOrders` | const | 33:9
- `result` | const | 36:11
- `handleApprove` | const | 53:9
- `result` | const | 56:13
- `handleReject` | const | 66:9
- `reason` | const | 68:11
- `result` | const | 70:13
- `filters` | const | 80:9
- `createdAt` | const | 137:25
- `dateLabel` | const | 138:25
- `docUrl` | const | 139:25
- `methodLabel` | const | 140:25
- `statusLabel` | const | 141:25
- `durationLabel` | const | 142:25

## src/app/dashboard/admin/project-logs/page.tsx

- `statusPriority` | const | 60:7
- `statusConfig` | const | 68:7
- `actionOptions` | const | 76:7
- `sourceOptions` | const | 91:7
- `roleOptions` | const | 92:7
- `timePresets` | const | 94:7
- `defaultLogFilters` | const | 122:7
- `presets` | const | 148:7
- `{ toast }` | const | 203:9
- `[rawProjectLogs, setRawProjectLogs]` | const | 204:9
- `[isLoading, setIsLoading]` | const | 205:9
- `[isFetchingUsers, setIsFetchingUsers]` | const | 206:9
- `[usersMap, setUsersMap]` | const | 207:9
- `[logFilters, setLogFilters]` | const | 208:9
- `parseTimestamp` | const | 210:9
- `dateRange` | const | 219:9
- `now` | const | 220:11
- `mapping` | const | 230:11
- `hours` | const | 231:11
- `from` | const | 232:11
- `buildLogQueryFilters` | const | 236:9
- `list` | const | 237:11
- `fetchUsersForLogs` | const | 253:9
- `missingIds` | const | 254:11
- `res` | const | 265:13
- `json` | const | 275:13
- `map` | const | 277:13
- `error` | const | 282:14
- `fetchLogs` | const | 293:9
- `res` | const | 296:13
- `json` | const | 307:13
- `logs` | const | 309:13
- `error` | const | 312:14
- `toggleFromList` | const | 327:9
- `exists` | const | 329:13
- `next` | const | 330:13
- `resetFilters` | const | 335:9
- `logsWithUserMeta` | const | 339:9
- `ts` | const | 341:13
- `user` | const | 342:13
- `role` | const | 343:13
- `visibleLogs` | const | 348:9
- `logs` | let | 349:9
- `needle` | const | 354:13
- `sevDiff` | const | 370:15
- `stats` | const | 380:9
- `base` | const | 381:11
- `recommendations` | const | 388:9
- `recs` | const | 389:11
- `renderBadge` | const | 422:9
- `cfg` | const | 423:11
- `Icon` | const | 424:11
- `StageIcon` | const | 433:9
- `applyPreset` | const | 440:9
- `date` | const | 654:23
- `recs` | const | 655:23
- `user` | const | 656:23
- `role` | const | 657:23

## src/app/dashboard/admin/prompts/page.tsx

- `{ toast }` | const | 22:9
- `{ user }` | const | 23:9
- `[prompts, setPrompts]` | const | 24:9
- `[isLoading, setIsLoading]` | const | 25:9
- `[isPending, startTransition]` | const | 26:9
- `searchParams` | const | 28:9
- `defaultOpenPrompt` | const | 29:9
- `fetchPrompts` | const | 33:11
- `currentPrompts` | const | 36:15
- `error` | const | 38:16
- `handlePromptChange` | const | 51:9
- `handleSave` | const | 55:9
- `result` | const | 58:13
- `renderPromptAccordion` | const | 82:9
- `allowedRoles` | const | 85:19
- `canEdit` | const | 86:19

## src/app/dashboard/admin/s3/page.tsx

- `{ toast }` | const | 19:11
- `{ user }` | const | 20:11
- `[initialSettings, setInitialSettings]` | const | 21:11
- `[settings, setSettings]` | const | 22:11
- `[isLoading, setIsLoading]` | const | 23:11
- `[isPending, startTransition]` | const | 24:11
- `hasUnsavedChanges` | const | 26:11
- `fetchSettings` | const | 29:15
- `currentSettings` | const | 33:19
- `error` | const | 36:20
- `handleSave` | const | 49:11
- `result` | const | 52:19

## src/app/dashboard/admin/sections/page.tsx

- `{ toast }` | const | 24:9
- `{ user }` | const | 25:9
- `[sections, setSections]` | const | 26:9
- `[isLoading, setIsLoading]` | const | 27:9
- `[isPending, startTransition]` | const | 28:9
- `fetchSections` | const | 35:11
- `currentSections` | const | 38:15
- `error` | const | 40:16
- `handleUpdate` | const | 53:9
- `handleAddHashtag` | const | 57:9
- `handleRemoveHashtag` | const | 67:9
- `handleAddNewSection` | const | 73:9
- `newSection` | const | 74:11
- `handleDeleteSection` | const | 82:9
- `handleSave` | const | 87:9
- `result` | const | 90:13

## src/app/dashboard/admin/server-functions/page.tsx

- `{ user }` | const | 19:9
- `{ toast }` | const | 20:9
- `[settings, setSettings]` | const | 21:9
- `[jobs, setJobs]` | const | 22:9
- `[isLoading, setIsLoading]` | const | 23:9
- `[isTesting, setIsTesting]` | const | 24:9
- `[isRunningWorker, setIsRunningWorker]` | const | 25:9
- `[isRequeuing, setIsRequeuing]` | const | 26:9
- `[health, setHealth]` | const | 27:9
- `[healthError, setHealthError]` | const | 28:9
- `[testStatus, setTestStatus]` | const | 29:9
- `[selectedJobLogs, setSelectedJobLogs]` | const | 34:9
- `[selectedJobId, setSelectedJobId]` | const | 35:9
- `isSuperAdmin` | const | 37:9
- `loadData` | const | 44:11
- `[appSettings, recentJobs, healthRes]` | const | 47:15
- `statusTotals` | const | 63:9
- `refreshJobs` | const | 70:9
- `[appSettings, recentJobs, healthRes]` | const | 72:11
- `handleRunWorker` | const | 84:9
- `res` | const | 87:13
- `e` | const | 89:14
- `handleRequeue` | const | 97:9
- `res` | const | 100:13
- `e` | const | 102:14
- `handleViewLogs` | const | 110:9
- `logs` | const | 112:11
- `formatDate` | const | 140:9
- `renderStatusIcon` | const | 146:9
- `runTestStep` | const | 153:9
- `e` | const | 159:14
- `recent` | const | 222:19
- `hasFailed` | const | 223:19

## src/app/dashboard/admin/service-requests/page.tsx

- `statusMap` | const | 29:7
- `typeLabels` | const | 36:7
- `{ toast }` | const | 45:9
- `{ user }` | const | 46:9
- `[requests, setRequests]` | const | 47:9
- `[isLoading, setIsLoading]` | const | 48:9
- `[isUpdating, startUpdating]` | const | 49:9
- `[statusFilter, setStatusFilter]` | const | 50:9
- `[typeFilter, setTypeFilter]` | const | 51:9
- `fetchRequests` | const | 53:9
- `result` | const | 57:13
- `error` | const | 66:14
- `handleStatusChange` | const | 81:9
- `result` | const | 84:13

## src/app/dashboard/admin/settings/page.tsx

- `{ user }` | const | 15:9

## src/app/dashboard/admin/telegram/page.tsx

- `{ toast }` | const | 25:9
- `{ user: adminUser }` | const | 26:9
- `[users, setUsers]` | const | 27:9
- `[isLoading, setIsLoading]` | const | 28:9
- `[isSending, startSendingTransition]` | const | 29:9
- `[isTesting, setIsTesting]` | const | 30:9
- `[testStatus, setTestStatus]` | const | 31:9
- `[botStatus, setBotStatus]` | const | 41:9
- `[isBotActionPending, setIsBotActionPending]` | const | 42:9
- `[envSettings, setEnvSettings]` | const | 43:9
- `[isMessageDialogOpen, setIsMessageDialogOpen]` | const | 45:9
- `[selectedUser, setSelectedUser]` | const | 46:9
- `[messageText, setMessageText]` | const | 47:9
- `[searchTerm, setSearchTerm]` | const | 49:9
- `[sortConfig, setSortConfig]` | const | 50:9
- `fetchUsers` | const | 52:9
- `userList` | const | 56:13
- `error` | const | 58:14
- `refreshBotStatus` | const | 74:9
- `[statusResp, envResp]` | const | 77:13
- `e` | const | 87:14
- `interval` | const | 97:11
- `renderStatusIcon` | const | 103:9
- `runTest` | const | 110:9
- `e` | const | 116:14
- `sortedAndFilteredUsers` | const | 124:9
- `sortableUsers` | let | 125:9
- `aValue` | const | 138:15
- `bValue` | const | 139:15
- `comparison` | let | 144:13
- `requestSort` | const | 162:9
- `direction` | let | 163:9
- `getSortIcon` | const | 170:9
- `handleOpenMessageDialog` | const | 178:9
- `handleSendMessage` | const | 184:9
- `result` | const | 188:13
- `handleBotAction` | const | 203:9
- `res` | const | 211:15
- `res` | const | 214:15
- `e` | const | 218:14
- `handleForceUnlock` | const | 225:9
- `res` | const | 232:13
- `e` | const | 235:14
- `handleWebhookAction` | const | 242:9
- `res` | const | 249:13
- `e` | const | 254:14
- `env` | const | 366:19
- `result` | const | 380:19
- `result` | const | 391:19
- `result` | const | 398:19
- `result` | const | 405:19
- `result` | const | 412:19
- `result` | const | 419:19

## src/app/dashboard/admin/templates/page.tsx

- `docTypes` | const | 26:7
- `planKeys` | const | 27:7
- `{ toast }` | const | 30:9
- `{ user }` | const | 31:9
- `[isPending, startTransition]` | const | 32:9
- `[isDialogOpen, setIsDialogOpen]` | const | 33:9
- `[editingTemplate, setEditingTemplate]` | const | 34:9
- `{ templates, settings }` | const | 36:9
- `[localTemplates, setLocalTemplates]` | const | 37:9
- `[localSettings, setLocalSettings]` | const | 38:9
- `templatesByType` | const | 48:9
- `refreshTemplates` | const | 55:9
- `result` | const | 56:11
- `openCreateDialog` | const | 61:9
- `openEditDialog` | const | 66:9
- `handleSubmitTemplate` | const | 71:9
- `result` | const | 74:13
- `handleDeleteTemplate` | const | 94:9
- `confirmed` | const | 96:11
- `result` | const | 99:13
- `handleSettingsChange` | const | 109:9
- `handleAvailabilityToggle` | const | 127:9
- `current` | const | 133:11
- `handleSaveSettings` | const | 151:9
- `result` | const | 154:13
- `isChecked` | const | 275:37

## src/app/dashboard/admin/tickets/page.tsx

- `{ toast }` | const | 25:9
- `{ user, setCurrentProject }` | const | 26:9
- `[tickets, setTickets]` | const | 27:9
- `[isLoading, setIsLoading]` | const | 28:9
- `[isProcessing, startProcessing]` | const | 29:9
- `router` | const | 30:9
- `fetchTickets` | const | 33:9
- `ticketList` | const | 37:13
- `error` | const | 39:14
- `handleResolve` | const | 55:9
- `result` | const | 62:19
- `error` | const | 76:18
- `handleViewResult` | const | 86:9

## src/app/dashboard/admin/users/page.tsx

- `{ user: currentUser }` | const | 24:9
- `[users, setUsers]` | const | 25:9
- `[isLoading, setIsLoading]` | const | 26:9
- `{ toast }` | const | 27:9
- `[isActionPending, startActionTransition]` | const | 28:9
- `[selectedUser, setSelectedUser]` | const | 30:9
- `[isPermissionsModalOpen, setIsPermissionsModalOpen]` | const | 31:9
- `[isCreditsModalOpen, setIsCreditsModalOpen]` | const | 32:9
- `[isCreditHistoryOpen, setIsCreditHistoryOpen]` | const | 33:9
- `[isConfirmOpen, setIsConfirmOpen]` | const | 34:9
- `[isBulkUpdateOpen, setIsBulkUpdateOpen]` | const | 35:9
- `[actionType, setActionType]` | const | 36:9
- `[searchTerm, setSearchTerm]` | const | 38:9
- `[sortConfig, setSortConfig]` | const | 39:9
- `managers` | const | 41:9
- `fetchUsers` | const | 43:9
- `userList` | const | 47:13
- `error` | const | 49:14
- `handleAction` | const | 60:9
- `result` | let | 67:13
- `handleOpenPermissionsModal` | const | 91:9
- `handleOpenCreditsModal` | const | 96:9
- `handleOpenCreditHistory` | const | 101:9
- `handleOpenConfirmDialog` | const | 106:9
- `handleBulkUpdate` | const | 112:9
- `result` | const | 114:17
- `sortedAndFilteredUsers` | const | 124:9
- `filtered` | let | 125:9
- `aValue` | const | 134:15
- `bValue` | const | 135:15
- `comparison` | let | 140:13
- `requestSort` | const | 153:9
- `direction` | let | 154:9
- `getSortIcon` | const | 161:9
- `{ activeUsers, archivedUsers }` | const | 168:9
- `renderUserTable` | const | 176:9

## src/app/dashboard/billing/page.tsx

- `{ creditPackages, enterprisePackage }` | const | 20:7
- `{ user, effectivePlan }` | const | 23:9
- `{ toast }` | const | 24:9
- `[isRequestPending, startRequestTransition]` | const | 25:9
- `[isPurchaseDialogOpen, setIsPurchaseDialogOpen]` | const | 27:9
- `[selectedPackage, setSelectedPackage]` | const | 28:9
- `[isUpgradeOpen, setIsUpgradeOpen]` | const | 29:9
- `[upgradeTargetRole, setUpgradeTargetRole]` | const | 30:9
- `submitRequest` | const | 32:9
- `result` | const | 35:13
- `handlePurchaseClick` | const | 50:9
- `currentPlan` | const | 55:9
- `nextPlan` | const | 56:9
- `nextPlanLabel` | const | 57:9
- `handleUpgradeClick` | const | 59:9
- `originalPrice` | const | 129:27
- `savedAmount` | const | 130:27

## src/app/dashboard/bonus/page.tsx

- `agreementText` | const | 29:7
- `PartnerAgreement` | const | 43:7
- `[agreed, setAgreed]` | const | 44:11
- `[isPending, startTransition]` | const | 45:11
- `handleAgree` | const | 47:11
- `levels` | const | 78:7
- `PartnerLevels` | const | 114:7
- `[isModalOpen, setIsModalOpen]` | const | 115:9
- `[selectedTier, setSelectedTier]` | const | 116:9
- `handleOpenModal` | const | 118:9
- `isCurrent` | const | 132:19
- `currentLevelIndex` | const | 133:19
- `isNextLevel` | const | 134:19
- `ReferralDashboard` | const | 175:7
- `{ user, toast }` | const | 176:11
- `[referredUsers, setReferredUsers]` | const | 177:11
- `[isLoading, setIsLoading]` | const | 178:11
- `[isRegisterOpen, setIsRegisterOpen]` | const | 179:11
- `fetchReferredUsers` | const | 183:15
- `users` | const | 186:23
- `error` | const | 188:22
- `siteUrl` | const | 197:11
- `referralLink` | const | 198:11
- `promocode` | const | 199:11
- `handleCopy` | const | 201:11
- `totalReferrals` | const | 210:11
- `totalEarnedCredits` | const | 211:11
- `{ user, toast }` | const | 354:11
- `handleAgree` | const | 356:11
- `result` | const | 359:19
- `error` | const | 366:18

## src/app/dashboard/calculator/page.tsx

- `SpecificationPageContent` | const | 11:7
- `{ currentProject, currentGroup, setCurrentProject, isLoading: isContextLoading }` | const | 18:11
- `router` | const | 19:11

## src/app/dashboard/companies/page.tsx

- `companyTypeMap` | const | 19:7
- `{ user }` | const | 26:11
- `{ toast }` | const | 27:11
- `[companies, setCompanies]` | const | 28:11
- `[isLoading, setIsLoading]` | const | 29:11
- `[isRefreshing, setIsRefreshing]` | const | 30:11
- `[isDialogOpen, setIsDialogOpen]` | const | 31:11
- `[selectedCompany, setSelectedCompany]` | const | 32:11
- `[dialogIsClient, setDialogIsClient]` | const | 33:11
- `[isActionPending, startActionTransition]` | const | 34:11
- `buildQuery` | const | 37:11
- `refreshCompanies` | const | 47:11
- `q` | const | 48:15
- `snapshot` | const | 52:19
- `userCompanies` | const | 53:19
- `error` | const | 61:18
- `q` | const | 76:15
- `unsubscribe` | const | 82:15
- `userCompanies` | const | 83:19
- `handleAddClick` | const | 109:11
- `handleEditClick` | const | 115:11
- `handleDialogClose` | const | 121:11
- `handleDialogSuccess` | const | 126:11
- `handleDelete` | const | 131:11
- `result` | const | 133:19
- `handleSetDefault` | const | 142:11
- `result` | const | 145:19
- `canAddCompany` | const | 154:11
- `myCompanies` | const | 155:11
- `counterparties` | const | 156:11
- `renderCompanyGroup` | const | 158:11
- `typeInfo` | const | 195:35
- `TypeIcon` | const | 196:35

## src/app/dashboard/layout.tsx

- `{ user, isLoading: isUserLoading, telegram, setNavigating, currentProject, resetAppContextState }` | const | 52:11
- `[isNavigating, startNavigation]` | const | 53:11
- `router` | const | 54:11
- `pathname` | const | 55:11
- `{ toast }` | const | 56:11
- `[isUpgradeModalOpen, setIsUpgradeModalOpen]` | const | 57:11
- `[upgradeTargetRole, setUpgradeTargetRole]` | const | 58:11
- `[open, setOpen]` | const | 59:11
- `{ theme, setTheme }` | const | 60:11
- `previousPathnameRef` | const | 63:11
- `isMobile` | const | 64:11
- `handleLogout` | const | 99:11
- `handleNavigation` | const | 104:11
- `menuItems` | const | 116:9
- `adminMenuItem` | const | 123:11

## src/app/dashboard/mobile-panel/page.tsx

- `MAX_FILE_SIZE` | const | 21:7
- `{ user, effectivePlan, setCurrentProject: setGlobalProject }` | const | 24:11
- `{ toast }` | const | 25:11
- `[localCurrentProject, setLocalCurrentProject]` | const | 27:11
- `[selectedFile, setSelectedFile]` | const | 28:11
- `[isProcessingDialogOpen, setIsProcessingDialogOpen]` | const | 29:11
- `[isCreditsDialogOpen, setIsCreditsDialogOpen]` | const | 30:11
- `[searchQuery, setSearchQuery]` | const | 31:11
- `[isLoading, setIsLoading]` | const | 32:11
- `planKey` | const | 34:11
- `preference` | const | 35:11
- `selectedModel` | const | 36:11
- `q` | const | 45:15
- `unsubscribe` | const | 52:15
- `lastProject` | const | 54:23
- `onDrop` | const | 63:11
- `file` | const | 65:15
- `{ getRootProps, getInputProps, isDragActive }` | const | 84:11
- `handleProjectSelect` | const | 86:11
- `handleClearFile` | const | 91:11

## src/app/dashboard/page.tsx

- `LARGE_FILE_THRESHOLD_MB` | const | 38:7
- `PwaPrompt` | const | 40:7
- `[isVisible, setIsVisible]` | const | 41:11
- `isAndroid` | const | 44:15
- `isPwa` | const | 45:15
- `handleDismiss` | const | 54:11
- `{
    user,
    userAvailableModels, // Plan-based models from context
    effectivePlan,
  }` | const | 78:9
- `{ toast }` | const | 83:9
- `[isProcessingDialogOpen, setIsProcessingDialogOpen]` | const | 85:9
- `[selectedFile, setSelectedFile]` | const | 87:9
- `[isPdfEditorOpen, setIsPdfEditorOpen]` | const | 88:9
- `[showWelcomeModal, setShowWelcomeModal]` | const | 90:9
- `[isCreditsDialogOpen, setIsCreditsDialogOpen]` | const | 91:9
- `[isBusinessUpgradeOpen, setIsBusinessUpgradeOpen]` | const | 92:9
- `handleSharedFile` | const | 97:11
- `urlParams` | const | 99:15
- `shareReceived` | const | 100:15
- `pendingFile` | const | 104:23
- `error` | const | 112:22
- `[selectedModel, setSelectedModel]` | const | 131:9
- `canSelectModel` | const | 132:9
- `planKey` | const | 133:9
- `preference` | const | 134:9
- `resolvedModel` | const | 135:9
- `currentModelIsValid` | const | 146:11
- `defaultModel` | const | 148:13
- `activeModel` | const | 155:9
- `activeModelLabel` | const | 156:9
- `onDrop` | const | 162:9
- `file` | const | 164:13
- `{ getRootProps, getInputProps }` | const | 174:9
- `handleStartAnalysis` | const | 180:9

## src/app/dashboard/price-base/page.tsx

- `{ user }` | const | 30:11
- `{ toast }` | const | 31:11
- `[baseItems, setBaseItems]` | const | 34:11
- `[isLoading, setIsLoading]` | const | 35:11
- `[isSaving, startSavingTransition]` | const | 36:11
- `[markup, setMarkup]` | const | 38:11
- `[isImporting, setIsImporting]` | const | 40:11
- `[importData, setImportData]` | const | 41:11
- `[selection, setSelection]` | const | 43:11
- `[editingCell, setEditingCell]` | const | 44:11
- `[editingValue, setEditingValue]` | const | 45:11
- `[isAssignSectionOpen, setIsAssignSectionOpen]` | const | 47:11
- `[sectionName, setSectionName]` | const | 48:11
- `[sectionSelectionMode, setSectionSelectionMode]` | const | 49:11
- `[selectedExistingSection, setSelectedExistingSection]` | const | 50:11
- `q` | const | 59:15
- `unsubscribe` | const | 66:15
- `items` | const | 67:19
- `handleCellBlur` | const | 88:11
- `{ rowId, column }` | const | 91:15
- `originalItem` | const | 92:15
- `processedValue` | const | 93:15
- `result` | const | 97:23
- `handleExport` | const | 109:11
- `dataToExport` | const | 110:15
- `worksheet` | const | 114:15
- `workbook` | const | 115:15
- `onDrop` | const | 121:11
- `file` | const | 122:15
- `reader` | const | 124:15
- `data` | const | 127:23
- `workbook` | const | 128:23
- `sheetName` | const | 129:23
- `worksheet` | const | 130:23
- `jsonData` | const | 131:23
- `headers` | const | 133:23
- `dataRows` | const | 134:23
- `error` | const | 139:22
- `{ getRootProps, getInputProps, isDragActive }` | const | 146:11
- `handleImportedData` | const | 148:11
- `result` | const | 151:19
- `newIds` | const | 153:23
- `handleSelectionChange` | const | 166:11
- `newSelection` | const | 168:19
- `handleAssignSection` | const | 175:11
- `finalSectionName` | const | 178:15
- `updates` | const | 185:19
- `groupedItems` | const | 201:11
- `section` | const | 203:19
- `existingSections` | const | 210:12
- `sections` | const | 211:15
- `renderEditableCell` | const | 215:11
- `isEditing` | const | 216:15
- `value` | const | 217:15
- `sectionIds` | const | 304:71
- `newSet` | const | 309:79

## src/app/dashboard/profile/page.tsx

- `ProfileTab` | const | 12:7
- `BalanceTab` | const | 15:7
- `TicketsTab` | const | 18:7
- `CompaniesTab` | const | 21:7
- `PriceBaseTab` | const | 24:7
- `searchParams` | const | 30:11
- `tab` | const | 31:11

## src/app/dashboard/support/page.tsx

- `{ user }` | const | 24:9
- `{ toast }` | const | 25:9
- `[threads, setThreads]` | const | 26:9
- `[selectedThread, setSelectedThread]` | const | 27:9
- `[messages, setMessages]` | const | 28:9
- `[messageText, setMessageText]` | const | 29:9
- `[isLoading, setIsLoading]` | const | 30:9
- `[isRefreshing, setIsRefreshing]` | const | 31:9
- `[isSending, startSending]` | const | 32:9
- `canViewInbox` | const | 34:9
- `loadThreads` | const | 36:9
- `result` | const | 39:11
- `refresh` | const | 49:9
- `loadMessages` | const | 56:9
- `result` | const | 59:13
- `handleSend` | const | 81:9
- `text` | const | 83:11
- `result` | const | 86:13
- `handleCloseThread` | const | 102:9
- `result` | const | 104:11

## src/app/dashboard/tickets/page.tsx

- `{ user }` | const | 18:11
- `{ toast }` | const | 19:11
- `[tickets, setTickets]` | const | 20:11
- `[isLoading, setIsLoading]` | const | 21:11
- `ticketsQuery` | const | 28:15
- `unsubscribe` | const | 35:15
- `userTickets` | const | 36:19
- `getStatusBadge` | const | 61:11

## src/app/dashboard/training/page.tsx

- `KnowledgeBaseVideo` | const | 19:7
- `{ user }` | const | 47:9
- `{ toast }` | const | 48:9
- `[isRequestPending, startRequest]` | const | 49:9
- `canAccess` | const | 50:9
- `[articles, setArticles]` | const | 51:9
- `[isLoading, setIsLoading]` | const | 52:9
- `isEditor` | const | 53:9
- `featuredPlaylists` | const | 54:9
- `deepGuides` | const | 78:9
- `trainingModules` | const | 157:9
- `q` | const | 332:11
- `unsubscribe` | const | 333:11
- `fetchedArticles` | const | 334:15
- `handleEnterpriseRequest` | const | 481:9
- `result` | const | 484:13

## src/app/layout.tsx

- `montserrat` | const | 25:7
- `bebasNeue` | const | 30:7
- `viewport` | const | 36:14
- `SiteLayout` | const | 44:7
- `pathname` | const | 45:11
- `isSpecialPage` | const | 46:11
- `error` | const | 95:14

## src/app/legal/consent/page.tsx

- `entity` | const | 8:9
- `licensor` | const | 25:9

## src/app/legal/layout.tsx

- `router` | const | 15:9

## src/app/legal/license/page.tsx

- `entity` | const | 8:9
- `licensor` | const | 25:9

## src/app/legal/privacy-policy/page.tsx

- `entity` | const | 8:9
- `licensor` | const | 25:9

## src/app/page.tsx

- `VideoSection` | const | 20:7

## src/app/partnership/page.tsx

- `LoadingSpinner` | const | 11:7
- `VideoSection` | const | 17:7
- `UseCasesSection` | const | 18:7
- `TiersSection` | const | 19:7
- `IncomeCalculator` | const | 20:7
- `TestimonialsSection` | const | 21:7
- `HowItWorks` | const | 22:7
- `FinalCtaSection` | const | 23:7

## src/app/video-analysis/page.tsx

- None

## src/components/AIProcessingDialog.tsx

- `isProcessing` | const | 57:9
- `currentStageIndex` | const | 58:9
- `showApplyButton` | const | 59:9
- `showExportButtons` | const | 60:9
- `isDone` | const | 116:23
- `isCurrent` | const | 117:23

## src/components/AvatarCropDialog.tsx

- `createImage` | const | 18:7
- `image` | const | 20:11
- `getCroppedImage` | const | 27:7
- `image` | const | 28:9
- `canvas` | const | 29:9
- `ctx` | const | 32:9
- `[crop, setCrop]` | const | 57:9
- `[zoom, setZoom]` | const | 58:9
- `[croppedAreaPixels, setCroppedAreaPixels]` | const | 59:9
- `imageUrl` | const | 61:9
- `onCropComplete` | const | 69:9
- `handleConfirm` | const | 73:9
- `blob` | const | 75:11
- `croppedFile` | const | 76:11

## src/components/CompanyFormDialog.tsx

- `FormSchema` | const | 36:7
- `{ user }` | const | 77:9
- `{ toast }` | const | 78:9
- `[isPending, startTransition]` | const | 79:9
- `isEditMode` | const | 80:9
- `isClientValue` | const | 81:9
- `[createForClient, setCreateForClient]` | const | 82:9
- `[createForOwn, setCreateForOwn]` | const | 83:9
- `[dadataQuery, setDadataQuery]` | const | 85:9
- `[dadataSuggestions, setDadataSuggestions]` | const | 86:9
- `[isDadataLoading, setIsDadataLoading]` | const | 87:9
- `[isSuggestionsOpen, setIsSuggestionsOpen]` | const | 88:9
- `isClientDefault` | const | 92:11
- `form` | const | 97:9
- `companyType` | const | 120:9
- `debouncedSearch` | const | 123:9
- `result` | const | 131:13
- `handleDadataQueryChange` | const | 144:9
- `query` | const | 145:11
- `handleSuggestionSelect` | const | 150:9
- `{ data }` | const | 151:11
- `onSubmit` | const | 169:9
- `result` | let | 176:13
- `targets` | const | 184:19
- `results` | const | 188:19
- `targetIsClient` | const | 189:24
- `newCompanyData` | const | 190:23
- `failures` | const | 195:19
- `successCount` | const | 196:19
- `isPartial` | const | 207:19
- `renderFormField` | const | 220:9
- `nameLabel` | const | 239:9
- `fullNameLabel` | const | 240:9
- `ceoNameLabel` | const | 241:9
- `ceoBasisLabel` | const | 242:9
- `groupLabel` | const | 243:9

## src/components/CookieConsentDialog.tsx

- `COOKIE_CONSENT_KEY` | const | 14:7
- `[isOpen, setIsOpen]` | const | 25:11
- `[showSettings, setShowSettings]` | const | 26:11
- `[preferences, setPreferences]` | const | 27:11
- `storedConsent` | const | 37:19
- `parsedConsent` | const | 42:23
- `error` | const | 45:18
- `saveConsent` | const | 50:11
- `consentData` | const | 51:15
- `handleAcceptAll` | const | 58:11
- `allAccepted` | const | 59:15
- `handleRejectAll` | const | 63:11
- `onlyNecessary` | const | 64:15
- `handleSaveSettings` | const | 68:11
- `handleTogglePreference` | const | 72:11

## src/components/CountUp.tsx

- `CountUp` | const | 12:14
- `count` | const | 13:9
- `rounded` | const | 14:9
- `controls` | const | 17:11

## src/components/CreditHistory.tsx

- `typeLabels` | const | 21:7
- `typeVariants` | const | 28:7
- `[entries, setEntries]` | const | 36:9
- `[isLoading, setIsLoading]` | const | 37:9
- `[isRefreshing, startTransition]` | const | 38:9
- `[error, setError]` | const | 39:9
- `loadHistory` | const | 41:9
- `result` | const | 44:11
- `handleRefresh` | const | 58:9
- `date` | const | 98:25

## src/components/Details.tsx

- `[isOpen, setIsOpen]` | const | 15:11

## src/components/DocumentGenerationDialog.tsx

- `{ user, setUser, effectivePlan }` | const | 59:11
- `{ toast }` | const | 60:11
- `[isGenerating, startGenerating]` | const | 61:11
- `[docType, setDocType]` | const | 63:11
- `[contractorId, setContractorId]` | const | 64:11
- `[clientId, setClientId]` | const | 65:11
- `[advanceType, setAdvanceType]` | const | 66:11
- `[advanceValue, setAdvanceValue]` | const | 67:11
- `[isClientFormOpen, setIsClientFormOpen]` | const | 68:11
- `[invoiceKind, setInvoiceKind]` | const | 69:11
- `[advanceBasis, setAdvanceBasis]` | const | 70:11
- `[contractNumber, setContractNumber]` | const | 71:11
- `[contractDate, setContractDate]` | const | 72:11
- `[contractBasisText, setContractBasisText]` | const | 73:11
- `[generateAct, setGenerateAct]` | const | 74:11
- `[selectedTemplateId, setSelectedTemplateId]` | const | 75:11
- `{ finalTotal }` | const | 77:11
- `isGroupContext` | const | 78:11
- `{ templates: customTemplates }` | const | 80:11
- `{ templates: globalTemplates, settings: templateSettings }` | const | 81:11
- `customProposalTemplates` | const | 82:11
- `customTemplatesById` | const | 86:11
- `globalTemplatesById` | const | 90:11
- `baseTemplateOptions` | const | 101:11
- `options` | const | 102:15
- `fallbackId` | const | 104:17
- `defaultId` | const | 105:17
- `customTemplateOptions` | const | 111:11
- `templateOptions` | const | 115:11
- `fallbackId` | const | 117:11
- `defaultTemplateId` | const | 118:11
- `activeTemplateId` | const | 119:11
- `activeTemplateConfig` | const | 120:11
- `resolveProjectName` | const | 122:11
- `resolveProjectSpecs` | const | 123:11
- `resolveProjectQuoteConfig` | const | 124:11
- `resolveScopeProjects` | const | 125:11
- `scopeProjects` | const | 127:11
- `scopeTotalsSum` | const | 128:11
- `advanceBaseTotal` | const | 129:11
- `advanceAmount` | const | 130:11
- `safeAdvanceAmount` | const | 131:11
- `requiresClient` | const | 133:11
- `showInvoiceSettings` | const | 134:11
- `showAdvanceSettings` | const | 135:11
- `showContractAdvance` | const | 136:11
- `showContractBasisMeta` | const | 137:11
- `showContractMeta` | const | 138:11
- `allowDocx` | const | 139:11
- `allowXlsx` | const | 140:11
- `extractExpirationMs` | const | 142:11
- `refreshSignedUrl` | const | 152:11
- `refreshResponse` | const | 153:15
- `ensureAssetUrl` | const | 164:11
- `expirationMs` | const | 166:15
- `refreshed` | const | 170:15
- `fetchImageBuffer` | const | 174:11
- `response` | const | 176:19
- `error` | const | 179:18
- `getProjectTotals` | const | 187:11
- `specs` | const | 188:15
- `config` | const | 189:15
- `buildSections` | const | 193:11
- `generateDocuments` | const | 201:11
- `contractor` | const | 202:15
- `client` | const | 203:15
- `baseProject` | const | 205:15
- `groupName` | const | 212:15
- `baseName` | const | 213:15
- `signatureUrl` | let | 215:13
- `stampUrl` | let | 216:13
- `signatureObjectKey` | let | 217:13
- `stampObjectKey` | let | 218:13
- `signatureUrlExpirationTimestamp` | let | 219:13
- `stampUrlExpirationTimestamp` | let | 220:13
- `refreshedSignature` | const | 223:19
- `refreshedStamp` | const | 228:19
- `result` | const | 240:23
- `buildInvoiceItems` | const | 265:15
- `totalsByProject` | const | 266:19
- `totalSum` | const | 270:19
- `dateText` | const | 274:27
- `numberText` | const | 275:27
- `resolvedText` | const | 276:27
- `advanceTotal` | const | 278:27
- `baseTotal` | const | 300:23
- `scopeProjects` | const | 317:15
- `files` | const | 323:15
- `invoiceProjects` | const | 331:23
- `items` | const | 332:23
- `totalAmount` | const | 333:23
- `invoiceNumber` | const | 335:23
- `invoiceDate` | const | 336:23
- `invoiceDoc` | const | 337:23
- `invoiceBlob` | const | 349:23
- `invoiceFileName` | const | 350:23
- `presignedUrlResponse` | const | 354:27
- `{ uploadUrl, accessUrl }` | const | 362:27
- `fileUri` | const | 364:27
- `e` | const | 377:26
- `sections` | const | 382:27
- `actDoc` | const | 383:27
- `actBlob` | const | 392:27
- `contractNumber` | const | 403:23
- `contractDate` | const | 404:23
- `workStartDate` | const | 405:23
- `workEndDate` | const | 406:23
- `appendices` | const | 409:27
- `groupTotal` | const | 415:27
- `contractAdvanceAmount` | const | 416:27
- `contractDoc` | const | 417:27
- `contractBlob` | const | 436:27
- `contractDoc` | const | 441:23
- `contractBlob` | const | 459:23
- `excelBlob` | const | 467:31
- `sections` | const | 474:27
- `pdfDoc` | const | 475:27
- `groupBlob` | const | 486:27
- `docParams` | const | 491:23
- `signatureBuffer` | const | 500:27
- `stampBuffer` | const | 501:27
- `docxBlob` | const | 502:27
- `excelBlob` | const | 511:27
- `pdfDoc` | const | 514:27
- `pdfBlob` | const | 523:27
- `sections` | const | 533:23
- `actDoc` | const | 534:23
- `actBlob` | const | 543:23
- `sections` | const | 552:23
- `ks2Doc` | const | 553:23
- `ks2Blob` | const | 562:23
- `sections` | const | 571:23
- `ks3Doc` | const | 572:23
- `ks3Blob` | const | 581:23
- `sections` | const | 590:23
- `ks6aDoc` | const | 591:23
- `ks6aBlob` | const | 600:23
- `handleDownload` | const | 609:11
- `files` | const | 613:23
- `baseProject` | const | 621:23
- `groupName` | const | 622:23
- `zip` | const | 623:23
- `zipBlob` | const | 625:23
- `error` | const | 628:22
- `handleSendToBot` | const | 635:11
- `files` | const | 642:23
- `payloadBlob` | let | 645:21
- `payloadName` | let | 646:21
- `baseProject` | const | 649:27
- `groupName` | const | 650:27
- `zip` | const | 651:27
- `base64Data` | const | 657:23
- `reader` | const | 658:27
- `result` | const | 663:23
- `error` | const | 666:22

## src/components/DuplicateProjectDialog.tsx

- `ActionButton` | const | 18:7

## src/components/ExcelImportDialog.tsx

- `systemFields` | const | 22:7
- `lowerHeader` | const | 37:11
- `field` | const | 38:16
- `keyword` | const | 39:20
- `{ headers, data }` | const | 50:11
- `[mapping, setMapping]` | const | 51:11
- `initialMapping` | const | 54:15
- `handleMappingChange` | const | 61:11
- `handleConfirmImport` | const | 65:11
- `newItems` | const | 66:15
- `newItem` | const | 67:19
- `value` | const | 70:27
- `previewData` | const | 87:11

## src/components/FindMissingDialog.tsx

- `{ user }` | const | 30:11
- `{ toast }` | const | 31:11
- `[isProcessing, startProcessing]` | const | 32:11
- `[foundItems, setFoundItems]` | const | 33:11
- `[error, setError]` | const | 34:11
- `[hasRun, setHasRun]` | const | 35:11
- `handleRunSearch` | const | 46:11
- `resolvedModel` | const | 54:23
- `response` | const | 62:23
- `result` | const | 76:23
- `e` | const | 87:22
- `handleConfirm` | const | 93:11

## src/components/GroupZipDialog.tsx

- `sanitizeFileName` | const | 48:7
- `fetchImageBuffer` | const | 50:7
- `response` | const | 52:11
- `error` | const | 55:12
- `{ user, effectivePlan }` | const | 62:9
- `{ toast }` | const | 63:9
- `[docType, setDocType]` | const | 64:9
- `[formatType, setFormatType]` | const | 65:9
- `[exportMode, setExportMode]` | const | 66:9
- `[zipMode, setZipMode]` | const | 67:9
- `[selectedDocTypes, setSelectedDocTypes]` | const | 68:9
- `[contractorId, setContractorId]` | const | 69:9
- `[clientId, setClientId]` | const | 70:9
- `[advanceType, setAdvanceType]` | const | 71:9
- `[advanceValue, setAdvanceValue]` | const | 72:9
- `[invoiceKind, setInvoiceKind]` | const | 73:9
- `[advanceBasis, setAdvanceBasis]` | const | 74:9
- `[contractNumber, setContractNumber]` | const | 75:9
- `[contractDate, setContractDate]` | const | 76:9
- `[contractBasisText, setContractBasisText]` | const | 77:9
- `[activeTemplateId, setActiveTemplateId]` | const | 78:9
- `[isGenerating, startGenerating]` | const | 79:9
- `{ templates: customTemplates }` | const | 81:9
- `{ templates: globalTemplates, settings: templateSettings }` | const | 82:9
- `customProposalTemplates` | const | 83:9
- `customTemplatesById` | const | 87:9
- `globalTemplatesById` | const | 91:9
- `resolveTemplateIdFor` | const | 96:9
- `baseOptions` | const | 97:11
- `customOptions` | const | 98:11
- `options` | const | 99:11
- `fallbackId` | const | 100:11
- `defaultId` | const | 101:11
- `templateOptions` | const | 106:9
- `baseOptions` | const | 107:11
- `customOptions` | const | 108:11
- `fallbackId` | const | 110:13
- `defaultId` | const | 111:13
- `resolvedTemplateId` | const | 117:9
- `activeTemplateConfig` | const | 120:9
- `groupName` | const | 122:9
- `fallback` | const | 123:11
- `fallbackContractor` | const | 129:13
- `fallbackClient` | const | 133:13
- `handleDocTypeChange` | const | 152:9
- `invoiceActive` | const | 160:9
- `contractActive` | const | 163:9
- `showInvoiceSettings` | const | 166:9
- `showAdvanceSettings` | const | 167:9
- `showContractBasisMeta` | const | 168:9
- `allowDocx` | const | 169:9
- `allowXlsx` | const | 170:9
- `toggleDocTypeSelection` | const | 172:9
- `next` | const | 175:15
- `resolveProjectName` | const | 182:9
- `resolveProjectSpecs` | const | 183:9
- `resolveProjectQuoteConfig` | const | 184:9
- `buildSections` | const | 186:9
- `specs` | const | 187:11
- `config` | const | 188:11
- `buildInvoiceItemsForProjects` | const | 198:9
- `totalsByProject` | const | 199:11
- `totalSum` | const | 203:11
- `dateText` | const | 207:15
- `numberText` | const | 208:15
- `resolvedText` | const | 209:15
- `advanceTotal` | const | 211:15
- `baseTotal` | const | 233:13
- `generateCombinedFile` | const | 250:9
- `templateId` | const | 257:11
- `templateConfig` | const | 258:11
- `groupTitle` | const | 259:11
- `safeGroupName` | const | 260:11
- `blob` | const | 268:15
- `sections` | const | 271:13
- `pdfDoc` | const | 272:13
- `blob` | const | 283:13
- `appendices` | const | 292:13
- `groupTotal` | const | 298:13
- `totals` | const | 299:15
- `contractAdvanceAmount` | const | 302:13
- `contractNumberValue` | const | 303:13
- `contractDateValue` | const | 304:13
- `workStartDate` | const | 305:13
- `workEndDate` | const | 306:13
- `contractDoc` | const | 307:13
- `blob` | const | 326:13
- `items` | const | 331:13
- `invoiceNumber` | const | 332:13
- `invoiceDate` | const | 333:13
- `invoiceDoc` | const | 334:13
- `blob` | const | 346:13
- `sections` | const | 350:11
- `commonParams` | const | 351:11
- `actDoc` | const | 360:13
- `blob` | const | 361:13
- `ks2Doc` | const | 365:13
- `blob` | const | 366:13
- `ks3Doc` | const | 370:13
- `blob` | const | 371:13
- `ks6aDoc` | const | 375:13
- `blob` | const | 376:13
- `generateProjectFile` | const | 383:9
- `specifications` | const | 393:11
- `quoteConfig` | const | 394:11
- `totals` | const | 395:11
- `baseName` | const | 396:11
- `docParams` | const | 403:13
- `blob` | const | 413:15
- `blob` | const | 423:15
- `pdfDoc` | const | 426:13
- `blob` | const | 435:13
- `advanceAmount` | const | 443:11
- `safeAdvanceAmount` | const | 446:11
- `invoiceNumber` | const | 449:13
- `invoiceDate` | const | 450:13
- `items` | let | 451:11
- `dateText` | const | 455:17
- `numberText` | const | 456:17
- `resolvedText` | const | 457:17
- `invoiceDoc` | const | 467:13
- `blob` | const | 479:13
- `contractNumber` | const | 483:11
- `contractDate` | const | 484:11
- `workStartDate` | const | 485:11
- `workEndDate` | const | 486:11
- `contractDoc` | const | 487:11
- `blob` | const | 505:11
- `handleGenerateZip` | const | 509:9
- `contractor` | const | 516:15
- `client` | const | 517:15
- `needsClientFor` | const | 523:15
- `requiresClient` | const | 524:15
- `signatureUrl` | let | 535:13
- `stampUrl` | let | 536:13
- `signatureBuffer` | const | 537:15
- `stampBuffer` | const | 538:15
- `fileData` | const | 541:17
- `zip` | const | 551:17
- `types` | const | 552:17
- `type` | const | 553:22
- `fileData` | const | 554:19
- `zipBlob` | const | 559:17
- `archiveName` | const | 560:17
- `zip` | const | 567:15
- `index` | let | 568:18
- `project` | const | 569:17
- `fileData` | const | 570:17
- `zipBlob` | const | 576:15
- `archiveName` | const | 577:15
- `error` | const | 581:16

## src/components/HighTierPartnerDialog.tsx

- `tierDetails` | const | 19:7
- `{ user }` | const | 49:9
- `{ toast }` | const | 50:9
- `[isPending, startTransition]` | const | 51:9
- `details` | const | 52:9
- `handleSubmit` | const | 54:9
- `result` | const | 58:13

## src/components/InsufficientCreditsDialog.tsx

- `router` | const | 18:9
- `[isNavigating, startNavigation]` | const | 19:9
- `daysUntilNextMonth` | const | 21:9
- `now` | const | 22:11
- `startOfNextMonth` | const | 23:11
- `diffTime` | const | 24:11
- `handleNavigation` | const | 28:9
- `referralBonus` | const | 35:9

## src/components/InvoiceHistory.tsx

- `{ user, currentProject }` | const | 31:11
- `{ toast }` | const | 32:11
- `[invoices, setInvoices]` | const | 33:11
- `[isLoading, setIsLoading]` | const | 34:11
- `[isActionPending, startActionTransition]` | const | 35:11
- `[isRefreshing, setIsRefreshing]` | const | 36:11
- `buildQuery` | const | 38:11
- `safeFormatDate` | const | 56:11
- `date` | const | 58:15
- `q` | const | 69:15
- `unsubscribe` | const | 76:15
- `fetchedInvoices` | const | 77:19
- `refreshInvoices` | const | 88:11
- `q` | const | 89:15
- `snapshot` | const | 93:19
- `fetchedInvoices` | const | 94:19
- `error` | const | 102:18
- `handleAction` | const | 113:11
- `fileResponse` | const | 124:23
- `blob` | const | 125:23
- `fileName` | const | 126:23
- `file` | const | 127:23
- `link` | const | 130:27
- `base64Data` | const | 143:27
- `reader` | const | 144:31
- `result` | const | 149:27
- `error` | const | 160:22
- `message` | const | 161:23

## src/components/LegalEntityRegistrationDialog.tsx

- `createFormSchema` | const | 34:7
- `router` | const | 53:9
- `{ toast }` | const | 54:9
- `{ user }` | const | 55:9
- `[isPending, startTransition]` | const | 56:9
- `[dadataQuery, setDadataQuery]` | const | 58:9
- `[dadataSuggestions, setDadataSuggestions]` | const | 59:9
- `[isDadataLoading, setIsDadataLoading]` | const | 60:9
- `[isSuggestionsOpen, setIsSuggestionsOpen]` | const | 61:9
- `[selectedCompany, setSelectedCompany]` | const | 62:9
- `[isCalendarOpen, setIsCalendarOpen]` | const | 64:9
- `FormSchema` | const | 66:9
- `form` | const | 68:9
- `wantsDemo` | const | 79:9
- `selectedDate` | const | 80:9
- `isWeekday` | const | 82:9
- `timeSlots` | const | 83:9
- `debouncedSearch` | const | 85:9
- `result` | const | 92:13
- `handleDadataQueryChange` | const | 105:9
- `query` | const | 106:11
- `handleSuggestionSelect` | const | 111:9
- `onSubmit` | const | 119:9
- `result` | const | 121:15
- `companyData` | const | 124:19

## src/components/Logo.tsx

- `logoVariants` | const | 6:7
- `Logo` | const | 27:14
- `LogoIcon` | const | 39:14

## src/components/NotificationCenter.tsx

- `{ user }` | const | 25:9
- `[unreadNotifications, setUnreadNotifications]` | const | 26:9
- `[hiddenIds, setHiddenIds]` | const | 27:9
- `[isLoading, setIsLoading]` | const | 28:9
- `[processingId, setProcessingId]` | const | 29:9
- `[isOpen, setIsOpen]` | const | 30:9
- `fetchNotifications` | const | 40:11
- `globalQuery` | const | 43:15
- `globalSnapshot` | const | 47:15
- `allPublished` | const | 48:15
- `seenIds` | const | 50:15
- `globalNotifications` | const | 51:15
- `userQuery` | const | 55:15
- `userSnapshot` | const | 60:15
- `userNotifications` | const | 61:15
- `combined` | const | 63:15
- `aDate` | const | 65:19
- `bDate` | const | 66:19
- `error` | const | 71:16
- `markAsRead` | const | 81:9
- `userRef` | const | 86:15
- `notificationRef` | const | 92:15
- `error` | const | 100:14
- `hideNotification` | const | 107:9
- `getNotificationDate` | const | 111:9
- `rawDate` | const | 112:11
- `date` | const | 116:11
- `visibleNotifications` | const | 127:9
- `unreadCount` | const | 128:9
- `dateLabel` | const | 173:23

## src/components/PdfEditorDialog.tsx

- `[pdfDoc, setPdfDoc]` | const | 27:9
- `[pagePreviews, setPagePreviews]` | const | 28:9
- `[selectedPages, setSelectedPages]` | const | 29:9
- `[isLoading, setIsLoading]` | const | 30:9
- `[isProcessing, setIsProcessing]` | const | 31:9
- `[manualInput, setManualInput]` | const | 32:9
- `[manualInputError, setManualInputError]` | const | 33:9
- `{ toast }` | const | 34:9
- `loadPdf` | const | 36:9
- `arrayBuffer` | const | 43:13
- `doc` | const | 44:13
- `pageCount` | const | 47:13
- `initialSelected` | const | 48:13
- `error` | const | 51:14
- `generatePreviews` | const | 72:11
- `previews` | const | 75:19
- `pageIndices` | const | 76:19
- `pageIndex` | const | 77:24
- `tempDoc` | const | 80:23
- `[copiedPage]` | const | 81:23
- `dataUri` | const | 83:23
- `error` | const | 87:18
- `handlePageSelection` | const | 98:9
- `newSet` | const | 100:13
- `selectAll` | const | 107:9
- `allPages` | const | 109:11
- `invertSelection` | const | 113:9
- `allPages` | const | 115:11
- `newSet` | const | 117:15
- `ranges` | const | 127:11
- `sorted` | const | 128:11
- `start` | let | 134:9
- `end` | let | 135:9
- `i` | let | 137:14
- `applyManualSelection` | const | 151:9
- `newSelected` | const | 154:11
- `pageCount` | const | 155:11
- `parts` | const | 157:11
- `part` | const | 159:20
- `[start, end]` | const | 161:23
- `i` | let | 163:26
- `num` | const | 167:23
- `e` | const | 174:14
- `handleProcess` | const | 180:9
- `newPdfDoc` | const | 188:13
- `pagesToKeep` | const | 189:13
- `copiedPages` | const | 190:13
- `newPdfBytes` | const | 193:13
- `newFile` | const | 194:13
- `error` | const | 198:14
- `pagesToDeleteCount` | const | 206:9

## src/components/PlanBadge.tsx

- `planStyles` | const | 16:7
- `sizeStyles` | const | 23:7
- `isClickable` | const | 29:9
- `handleKeyDown` | const | 30:9

## src/components/PlanGate.tsx

- None

## src/components/PlanModelPreference.tsx

- `{ user, effectivePlan }` | const | 19:9
- `{ toast }` | const | 20:9
- `[isPending, startTransition]` | const | 21:9
- `variants` | const | 23:9
- `planKey` | const | 26:9
- `planForAction` | const | 27:9
- `storedValue` | const | 28:9
- `currentValue` | const | 29:9
- `handleChange` | const | 31:9
- `result` | const | 34:13

## src/components/PrivatePriceDialog.tsx

- `{ user, currentProject, effectivePlan }` | const | 40:9
- `{ toast }` | const | 41:9
- `isBusiness` | const | 42:9
- `businessButtonClass` | const | 43:9
- `[isLoading, setIsLoading]` | const | 45:9
- `[isProcessing, setIsProcessing]` | const | 46:9
- `[allSections, setAllSections]` | const | 48:9
- `[selectedSection, setSelectedSection]` | const | 49:9
- `[newSection, setNewSection]` | const | 50:9
- `[isCreatingNew, setIsCreatingNew]` | const | 51:9
- `[selectedSections, setSelectedSections]` | const | 52:9
- `itemsToProcess` | const | 54:9
- `validationError` | const | 59:9
- `invalidItem` | const | 61:11
- `projectHashtags` | const | 74:15
- `standardSectionsData` | const | 75:15
- `existingSections` | const | 76:15
- `suggestedSections` | const | 78:15
- `matchingSection` | const | 82:20
- `error` | const | 94:16
- `handleConfirmClick` | const | 105:9
- `finalSection` | const | 114:11
- `result` | const | 120:11
- `handleCreateNewToggle` | const | 132:9
- `handleSectionToggle` | const | 138:9
- `newSet` | const | 140:13
- `title` | const | 151:9
- `description` | const | 152:9

## src/components/ProcessingDialog.tsx

- `ANALYSIS_COST` | const | 34:7
- `stageInfo` | const | 60:7
- `{ user, setCurrentProject, effectivePlan }` | const | 92:11
- `{ toast }` | const | 93:11
- `router` | const | 94:11
- `[stage, setStage]` | const | 96:11
- `[isCreditsDialogOpen, setIsCreditsDialogOpen]` | const | 97:11
- `[errorMessage, setErrorMessage]` | const | 98:11
- `[serverSettings, setServerSettings]` | const | 99:11
- `[serverSettingsLoaded, setServerSettingsLoaded]` | const | 100:11
- `[processingProjectId, setProcessingProjectId]` | const | 101:11
- `[serverJobId, setServerJobId]` | const | 102:11
- `processingStarted` | const | 103:11
- `cancelRequested` | const | 104:11
- `modelInfo` | const | 106:11
- `effectiveTemperature` | const | 107:11
- `isSelectedOpenRouter` | const | 108:11
- `effectivePdfEngine` | const | 111:11
- `modelOverride` | const | 113:15
- `planForCheck` | const | 118:11
- `isPlanAllowedForServer` | const | 119:11
- `fallback` | const | 121:15
- `allowed` | const | 122:15
- `shouldUseServerPipeline` | const | 126:11
- `resetState` | const | 134:11
- `cancelled` | let | 149:13
- `loadSettings` | const | 150:15
- `data` | const | 152:23
- `error` | const | 156:22
- `processFile` | const | 177:15
- `fileDataForApi` | let | 178:17
- `fileHash` | let | 179:17
- `objectKey` | let | 180:17
- `draftId` | let | 181:17
- `lastStage` | let | 182:17
- `ensureDraftExists` | const | 184:19
- `draft` | const | 186:23
- `setProjectStage` | const | 205:19
- `abortIfCancelled` | const | 215:19
- `err` | const | 217:27
- `runAnalysis` | const | 223:19
- `promptConfig` | const | 224:23
- `missing` | const | 229:23
- `isPdf` | const | 241:23
- `pdfEngineToUse` | const | 242:23
- `response` | const | 256:23
- `resultJson` | const | 269:23
- `saveFinalResult` | const | 280:19
- `hydratedItems` | const | 283:23
- `finalizeResult` | const | 285:23
- `fileUri` | let | 331:21
- `s3CacheRef` | const | 335:23
- `s3CacheSnap` | const | 336:23
- `data` | const | 339:27
- `expirationDate` | const | 344:27
- `value` | const | 345:29
- `isExpired` | const | 352:27
- `refreshResponse` | const | 355:30
- `{ newAccessUrl, newExpirationTimestamp }` | const | 357:30
- `presignedUrlResponse` | const | 372:27
- `{ uploadUrl, accessUrl, objectKey: uploadObjectKey, urlExpirationTimestamp }` | const | 374:27
- `analysisCacheRef` | const | 395:23
- `analysisCacheSnap` | const | 396:23
- `cachedData` | const | 400:27
- `response` | const | 419:27
- `result` | const | 435:27
- `accumulatedResults` | let | 452:21
- `e` | const | 456:22
- `handleStop` | const | 484:11
- `err` | const | 501:18
- `isProcessing` | const | 507:11
- `stages` | const | 509:11
- `currentStageIndex` | const | 513:11
- `isDone` | const | 545:39
- `isCurrent` | const | 546:39
- `StageIcon` | const | 547:39

## src/components/ProjectUpdateDialog.tsx

- `{ user }` | const | 36:9
- `{ toast }` | const | 37:9
- `[projects, setProjects]` | const | 38:9
- `[isLoading, setIsLoading]` | const | 39:9
- `[selectedProjectId, setSelectedProjectId]` | const | 40:9
- `[isRefreshing, setIsRefreshing]` | const | 41:9
- `buildQuery` | const | 43:9
- `safeFormatDateTime` | const | 52:9
- `date` | const | 54:11
- `q` | const | 66:11
- `unsubscribe` | const | 73:11
- `fetchedProjects` | const | 74:13
- `refreshVersions` | const | 87:9
- `q` | const | 88:11
- `snapshot` | const | 92:13
- `fetchedProjects` | const | 93:13
- `error` | const | 102:14
- `handleConfirm` | const | 109:9

## src/components/PurchaseCreditsDialog.tsx

- `{ user, setUser }` | const | 73:11
- `{ toast }` | const | 74:11
- `[paymentMethod, setPaymentMethod]` | const | 76:11
- `[companies, setCompanies]` | const | 77:11
- `[selectedCompanyId, setSelectedCompanyId]` | const | 78:11
- `[isLoadingCompanies, setIsLoadingCompanies]` | const | 79:11
- `[isGenerating, startGenerating]` | const | 80:11
- `[isConsentPending, startConsentTransition]` | const | 81:11
- `[needsConsent, setNeedsConsent]` | const | 82:11
- `[receiptFile, setReceiptFile]` | const | 83:11
- `sbpPhone` | const | 84:11
- `sbpBank` | const | 85:11
- `sbpLink` | const | 86:11
- `q` | const | 92:19
- `unsubscribe` | const | 93:19
- `fetchedCompanies` | const | 94:23
- `ownCompanies` | const | 95:23
- `defaultCompany` | const | 97:23
- `handleConfirmConsent` | const | 117:11
- `userRef` | const | 120:19
- `generateInvoice` | const | 131:11
- `buyerCompany` | const | 132:15
- `sellerCompany` | const | 141:19
- `invoiceNumber` | const | 146:19
- `invoiceDate` | const | 147:19
- `docToRender` | const | 149:19
- `blob` | const | 166:19
- `fileName` | const | 167:19
- `presignedUrlResponse` | const | 169:19
- `{ uploadUrl, accessUrl }` | const | 177:19
- `fileUri` | const | 179:19
- `error` | const | 207:18
- `handleSubmitSbp` | const | 213:11
- `presignedUrlResponse` | const | 221:23
- `{ uploadUrl, accessUrl, objectKey }` | const | 229:23
- `result` | const | 232:23
- `error` | const | 247:22
- `handleGenerateInvoiceClick` | const | 253:11

## src/components/PurchaseProDialog.tsx

- `{ user }` | const | 37:9
- `{ toast }` | const | 38:9
- `[paymentMethod, setPaymentMethod]` | const | 39:9
- `[isSubmitting, startSubmitting]` | const | 40:9
- `[isTrialPending, startTrialTransition]` | const | 41:9
- `[companies, setCompanies]` | const | 43:9
- `[selectedCompanyId, setSelectedCompanyId]` | const | 44:9
- `[isLoadingCompanies, setIsLoadingCompanies]` | const | 45:9
- `[receiptFile, setReceiptFile]` | const | 47:9
- `hasUsedTrial` | const | 48:9
- `planOptions` | const | 50:9
- `durations` | const | 51:11
- `lifetimeMonths` | const | 52:11
- `monthlyPrice` | const | 53:11
- `options` | const | 54:11
- `[selectedMonths, setSelectedMonths]` | const | 68:9
- `selectedPlan` | const | 70:9
- `sbpPhone` | const | 71:9
- `sbpBank` | const | 72:9
- `sbpLink` | const | 73:9
- `handleActivateTrial` | const | 81:9
- `result` | const | 84:13
- `q` | const | 97:13
- `unsubscribe` | const | 98:13
- `fetchedCompanies` | const | 101:17
- `ownCompanies` | const | 102:17
- `defaultCompany` | const | 104:17
- `handleSubmitSbp` | const | 120:9
- `presignedUrlResponse` | const | 128:15
- `{ uploadUrl, accessUrl, objectKey }` | const | 136:15
- `result` | const | 139:15
- `error` | const | 155:16
- `handleGenerateInvoice` | const | 161:9
- `buyerCompany` | const | 165:15
- `sellerCompany` | const | 170:15
- `invoiceNumber` | const | 175:15
- `invoiceDate` | const | 176:15
- `docToRender` | const | 178:15
- `blob` | const | 197:15
- `fileName` | const | 198:15
- `presignedUrlResponse` | const | 200:15
- `{ uploadUrl, accessUrl }` | const | 208:15
- `error` | const | 234:16

## src/components/RefineProjectDialog.tsx

- `ANALYSIS_TIMEOUT_MS` | const | 20:7
- `{ user, setCurrentProject, setShowTimeoutWarning, effectivePlan }` | const | 34:9
- `[isProcessing, startProcessing]` | const | 35:9
- `timeoutRef` | const | 36:9
- `{ toast, dismiss }` | const | 38:9
- `[isUpgradeModalOpen, setIsUpgradeModalOpen]` | const | 40:9
- `actionConfig` | const | 42:9
- `cleanupTimeout` | const | 56:9
- `handleProcess` | const | 63:9
- `aiCallLimit` | const | 69:11
- `currentAiCalls` | const | 70:11
- `callsLeft` | const | 86:11
- `warningThreshold` | const | 87:11
- `toastId` | let | 97:13
- `countdownInterval` | let | 98:13
- `{ id }` | const | 106:19
- `itemsToRefine` | const | 113:17
- `message` | const | 118:19
- `remaining` | let | 127:15
- `result` | let | 146:15
- `flowInput` | const | 148:21
- `flowInput` | const | 157:21
- `hydrateRefinedData` | const | 186:17
- `tempSpecs` | let | 202:19
- `processedSplitIds` | const | 203:21
- `hydratedItem` | const | 206:24
- `index` | const | 209:27
- `originalItem` | const | 211:30
- `newComment` | const | 212:30
- `nextProject` | const | 226:21
- `newItems` | const | 241:25
- `nextProject` | const | 246:25
- `nextProject` | const | 258:25
- `error` | const | 274:18
- `{ name, description }` | const | 288:9

## src/components/RegistrationDialog.tsx

- `{ apiModels }` | const | 24:7
- `router` | const | 34:9
- `{ toast }` | const | 35:9
- `[email, setEmail]` | const | 37:9
- `[password, setPassword]` | const | 38:9
- `[phone, setPhone]` | const | 39:9
- `[promoCode, setPromoCode]` | const | 40:9
- `[agreedToTerms, setAgreedToTerms]` | const | 41:9
- `[agreedToPrivacy, setAgreedToPrivacy]` | const | 42:9
- `[agreedToMarketing, setAgreedToMarketing]` | const | 43:9
- `[agreedToThirdParty, setAgreedToThirdParty]` | const | 44:9
- `[isPending, startTransition]` | const | 46:9
- `[error, setError]` | const | 47:9
- `[showPromoInput, setShowPromoInput]` | const | 49:9
- `handleRegister` | const | 58:9
- `defaultModel` | const | 67:15
- `response` | const | 70:15
- `errorPayload` | const | 88:17
- `loginResult` | const | 92:15
- `error` | const | 101:16
- `isSubmitDisabled` | const | 107:9

## src/components/SpecificationPageContent.tsx

- `SpecificationPageContent` | const | 11:7
- `{ currentProject, isLoading: isContextLoading }` | const | 18:11
- `router` | const | 19:11

## src/components/UpgradeAccountDialog.tsx

- `{ user, effectivePlan }` | const | 23:9
- `{ toast }` | const | 24:9
- `[isPending, startTransition]` | const | 25:9
- `[isPurchaseOpen, setIsPurchaseOpen]` | const | 26:9
- `handleActivateTrial` | const | 28:9
- `result` | const | 31:13
- `hasUsedTrial` | const | 49:9
- `roleHierarchy` | const | 51:9
- `currentRoleIndex` | const | 52:9
- `targetRoleIndex` | const | 53:9
- `isAlreadyOnHigherPlan` | const | 55:9
- `isRequestOnly` | const | 56:9
- `isTrialAvailable` | const | 57:9
- `targetRoleLabel` | const | 58:9
- `planExpiresAt` | const | 63:9
- `expiresText` | const | 66:9
- `descriptionText` | const | 68:9
- `handleRequestPlan` | const | 78:9
- `result` | const | 81:13

## src/components/admin/EnvSettings.tsx

- `PasswordInput` | const | 19:7
- `[isVisible, setIsVisible]` | const | 20:11
- `{ toast }` | const | 46:9
- `{ user }` | const | 47:9
- `[initialSettings, setInitialSettings]` | const | 48:9
- `[settings, setSettings]` | const | 49:9
- `[isLoading, setIsLoading]` | const | 50:9
- `[isPending, startTransition]` | const | 51:9
- `[isTesting, startTesting]` | const | 52:9
- `[status, setStatus]` | const | 53:9
- `[ozonStatus, setOzonStatus]` | const | 54:9
- `[isOzonSyncing, startOzonSync]` | const | 55:9
- `hasUnsavedChanges` | const | 57:9
- `fetchSettings` | const | 61:11
- `currentSettings` | const | 65:15
- `error` | const | 68:16
- `handleSave` | const | 90:9
- `result` | const | 93:13
- `handleTest` | const | 103:9
- `result` | const | 107:19
- `err` | const | 110:18
- `handleOzonSync` | const | 116:9
- `result` | const | 119:13
- `statusResult` | const | 125:13

## src/components/admin/GeneralSettings.tsx

- `[confirmationText, setConfirmationText]` | const | 21:11
- `CONFIRM_PHRASE` | const | 22:11
- `{ toast }` | const | 67:9
- `{ user }` | const | 68:9
- `[settings, setSettings]` | const | 69:9
- `[isLoading, setIsLoading]` | const | 76:9
- `[isPending, startTransition]` | const | 77:9
- `[isWipePending, startWipeTransition]` | const | 78:9
- `fetchSettings` | const | 85:11
- `currentSettings` | const | 88:15
- `error` | const | 90:16
- `handleSave` | const | 103:9
- `result` | const | 106:13
- `handleWipeData` | const | 122:9
- `result` | const | 125:17
- `isChecked` | const | 225:23
- `next` | const | 231:31

## src/components/admin/LegalEntitySettings.tsx

- `{ toast }` | const | 20:9
- `{ user }` | const | 21:9
- `[isLoading, setIsLoading]` | const | 22:9
- `[isPending, startTransition]` | const | 23:9
- `[dadataQuery, setDadataQuery]` | const | 24:9
- `[dadataSuggestions, setDadataSuggestions]` | const | 25:9
- `[isDadataLoading, setIsDadataLoading]` | const | 26:9
- `form` | const | 28:9
- `fetchSettings` | const | 50:11
- `currentSettings` | const | 53:15
- `error` | const | 57:16
- `query` | const | 67:11
- `onSubmit` | const | 83:9
- `result` | const | 86:13
- `handleSuggestionSelect` | const | 95:9
- `data` | const | 96:11
- `renderFormField` | const | 114:9

## src/components/admin/UserRow.tsx

- `safeFormatDate` | const | 23:7
- `date` | const | 25:11
- `isCurrentUser` | const | 31:11
- `superAdminEmail` | const | 32:11
- `isProtectedAdmin` | const | 33:11

## src/components/admin/dialogs/AddCreditsDialog.tsx

- `[creditsToAdd, setCreditsToAdd]` | const | 24:9
- `[isPending, startTransition]` | const | 25:9
- `{ toast }` | const | 26:9
- `handleUpdate` | const | 28:9
- `result` | const | 34:13

## src/components/admin/dialogs/AddModelFromProviderDialog.tsx

- `[isLoading, startLoading]` | const | 25:9
- `[allModels, setAllModels]` | const | 26:9
- `[searchTerm, setSearchTerm]` | const | 27:9
- `[selectedModels, setSelectedModels]` | const | 28:9
- `[expandedModelId, setExpandedModelId]` | const | 29:9
- `{ toast }` | const | 30:9
- `loadModels` | const | 32:9
- `models` | const | 35:15
- `error` | const | 37:16
- `filteredAndSortedModels` | const | 56:9
- `existingModelIds` | const | 57:13
- `search` | const | 58:13
- `haystack` | const | 63:17
- `handleSelectionChange` | const | 78:9
- `newSet` | const | 80:15
- `handleConfirm` | const | 90:9
- `modelsToAdd` | const | 91:13
- `formatPrice` | const | 108:9
- `value` | const | 109:11
- `getModelCapabilities` | const | 114:9
- `capabilities` | const | 115:13
- `lowerId` | const | 121:13
- `arch` | const | 122:13
- `toggleExpanded` | const | 137:9
- `addSingleModel` | const | 141:9
- `handleSelectAllFiltered` | const | 146:9
- `handleClearSelection` | const | 150:9
- `renderModelDetails` | const | 154:9
- `capabilities` | const | 216:31
- `pricing` | const | 217:31

## src/components/admin/dialogs/BulkUpdateDialog.tsx

- `[isPending, startTransition]` | const | 21:9
- `[model, setModel]` | const | 22:9
- `[filterType, setFilterType]` | const | 23:9
- `[filterValue, setFilterValue]` | const | 24:9
- `plans` | const | 26:9
- `roles` | const | 27:9
- `handleConfirm` | const | 29:9

## src/components/admin/dialogs/ConfirmActionDialog.tsx

- `descriptions` | const | 22:9
- `titles` | const | 28:9
- `buttonLabels` | const | 34:9

## src/components/admin/dialogs/ModelConfigDialog.tsx

- `[modelId, setModelId]` | const | 25:9
- `[modelLabel, setModelLabel]` | const | 26:9
- `[pdfEngineOverride, setPdfEngineOverride]` | const | 27:9
- `[isDefault, setIsDefault]` | const | 28:9
- `[isPending, startTransition]` | const | 29:9
- `{ toast }` | const | 30:9
- `isEditMode` | const | 32:9
- `handleConfirm` | const | 49:9

## src/components/admin/dialogs/UserCreditHistoryDialog.tsx

- None

## src/components/admin/dialogs/UserPermissionsDialog.tsx

- `{ apiModels }` | const | 24:7
- `[isPending, startTransition]` | const | 36:9
- `{ toast }` | const | 37:9
- `[editablePermissions, setEditablePermissions]` | const | 38:9
- `expiryDate` | let | 42:13
- `handlePermissionChange` | const | 70:9
- `handleModelSelectionChange` | const | 74:9
- `currentModels` | const | 76:15
- `handleUpdate` | const | 85:9
- `updates` | const | 88:13
- `result` | const | 96:13
- `isSuperAdminUser` | const | 108:9

## src/components/admin/s3/S3Info.tsx

- `{ toast }` | const | 17:9
- `{ user }` | const | 18:9
- `[settings, setSettings]` | const | 19:9
- `[isLoading, setIsLoading]` | const | 20:9
- `fetchSettings` | const | 23:11
- `currentSettings` | const | 27:15
- `error` | const | 29:16
- `copyToClipboard` | const | 42:9

## src/components/admin/s3/S3Settings.tsx

- `PasswordInput` | const | 20:7
- `[isVisible, setIsVisible]` | const | 21:11
- `providerDefaults` | const | 45:7
- `{ toast }` | const | 52:9
- `[corsConfig, setCorsConfig]` | const | 53:9
- `[isActionLoading, setIsActionLoading]` | const | 54:9
- `[allowedOrigin, setAllowedOrigin]` | const | 55:9
- `[s3Preset, setS3Preset]` | const | 56:9
- `[newPresetName, setNewPresetName]` | const | 57:9
- `[bucketPresetId, setBucketPresetId]` | const | 58:9
- `[bucketList, setBucketList]` | const | 59:9
- `[isBucketsLoading, setIsBucketsLoading]` | const | 60:9
- `[newBucketName, setNewBucketName]` | const | 61:9
- `[newBucketPurpose, setNewBucketPurpose]` | const | 62:9
- `found` | const | 78:15
- `presets` | const | 85:9
- `resolvePresetId` | const | 86:9
- `loadBuckets` | const | 88:9
- `presetId` | const | 91:11
- `result` | const | 92:11
- `handleCreateBucket` | const | 101:9
- `presetId` | const | 104:11
- `result` | const | 105:11
- `trimmed` | const | 112:11
- `nextSettings` | const | 113:11
- `applyDefaults` | const | 136:9
- `defaults` | const | 138:11
- `inferProviderFromEndpoint` | const | 145:9
- `buildPresetConfig` | const | 153:9
- `handleApplyPreset` | const | 167:9
- `preset` | const | 169:11
- `inferredProvider` | const | 171:11
- `nextProvider` | const | 176:11
- `handleSavePreset` | const | 196:9
- `presetId` | const | 198:11
- `preset` | const | 199:11
- `handleUpdatePreset` | const | 214:9
- `handleRemovePreset` | const | 231:9
- `filtered` | const | 233:11
- `newActive` | const | 234:11
- `newSecondary` | const | 235:11
- `handleCorsAction` | const | 245:9
- `result` | let | 248:15
- `error` | const | 266:16
- `buildCorsXml` | const | 273:9
- `safeOrigin` | const | 274:11
- `generateCorsRule` | const | 315:9
- `generateCorsRuleForAll` | const | 319:9
- `v` | const | 372:80
- `isActive` | const | 622:31
- `isSecondary` | const | 623:31
- `presetProvider` | const | 624:31
- `nextName` | const | 634:41
- `nextProvider` | const | 653:41

## src/components/admin/s3/S3Testing.tsx

- `initialState` | const | 41:7
- `ACTIVE_PRESET_VALUE` | const | 48:7
- `[testState, setTestState]` | const | 52:9
- `[isLoading, startStepTransition]` | const | 53:9
- `[status, setStatus]` | const | 54:9
- `[stepStatus, setStepStatus]` | const | 60:9
- `[selectedPreset, setSelectedPreset]` | const | 67:9
- `presets` | const | 68:9
- `resolvePresetId` | const | 69:9
- `onDrop` | const | 72:9
- `{ getRootProps, getInputProps, isDragActive }` | const | 77:9
- `resetAfterFileSelect` | const | 79:9
- `statusMap` | const | 90:9
- `handleStep` | const | 98:9
- `key` | const | 101:15
- `hash` | const | 107:27
- `cacheRef` | const | 112:27
- `cacheSnap` | const | 113:27
- `expirationDate` | const | 124:27
- `value` | const | 125:29
- `isValid` | const | 132:27
- `refreshResponse` | const | 137:27
- `{ newAccessUrl, newExpirationTimestamp }` | const | 142:27
- `presignedUrlResponse` | const | 149:27
- `{ uploadUrl, accessUrl, objectKey, urlExpirationTimestamp }` | const | 154:27
- `error` | const | 172:18
- `errorMessage` | const | 173:19
- `renderStatusIcon` | const | 180:9
- `renderStep` | const | 187:9
- `state` | const | 188:13
- `statusBadge` | const | 209:9
- `value` | const | 210:11
- `map` | const | 211:11
- `runMicroAction` | const | 215:9
- `e` | const | 220:14
- `res` | const | 255:29
- `e` | const | 259:28
- `res` | const | 268:29
- `e` | const | 272:28
- `res` | const | 281:29
- `e` | const | 285:28
- `e` | const | 297:28
- `resp` | const | 357:44
- `blob` | const | 359:44
- `url` | const | 360:44
- `a` | const | 361:44
- `e` | const | 366:45

## src/components/calculator/AiAssistantSettings.tsx

- `{ user, effectivePlan }` | const | 34:11
- `canUseThoughts` | const | 35:11
- `canSelectModel` | const | 36:11
- `planKey` | const | 38:11
- `preference` | const | 39:11
- `resolvedModel` | const | 40:11
- `displayModel` | const | 41:11
- `displayLabel` | const | 42:11
- `planModelOptions` | const | 47:11

## src/components/calculator/AiNotes.tsx

- `hasNotes` | const | 17:11

## src/components/calculator/AiRecommendations.tsx

- None

## src/components/calculator/Calculator.tsx

- `recommendedValues` | const | 31:7
- `COMPLEXITY_MIN` | const | 41:7
- `COMPLEXITY_MAX` | const | 42:7
- `complexityPresets` | const | 44:7
- `clampComplexity` | const | 52:7
- `getRecommendedComplexityByHeight` | const | 57:7
- `match` | const | 59:11
- `height` | const | 61:11
- `reader` | const | 88:15
- `{
        initialProjectData,
        calculatedDevices,
        calculatedCable,
        calculatedCableSupport,
        onProFeatureClick,
        onApplyPricesFromPrivateBase,
        onSmrCostChange,
        externalUpdates,
        onExternalUpdatesApplied,
        onComplexityChange,
    }` | const | 105:11
- `{ toast }` | const | 117:11
- `{ user, currentProject, setCurrentProject, effectivePlan, logAction, companies }` | const | 118:11
- `[isAdjustCostDialogOpen, setIsAdjustCostDialogOpen]` | const | 119:11
- `numericFields` | const | 124:11
- `[inputValues, setInputValues]` | const | 130:11
- `isPro` | const | 137:11
- `recommendedByHeight` | const | 140:15
- `calculatedShiftCost` | const | 146:11
- `{ totalInstallationCost: recommendedSmrCost }` | const | 152:11
- `{ normDevicesPerShift, normCablePerShift, normCableSupportPerShift, infraCost, marginPercent, complexityMultiplier }` | const | 153:15
- `deviceShifts` | const | 154:15
- `cableShifts` | const | 155:15
- `cableSupportShifts` | const | 156:15
- `totalShifts` | const | 157:15
- `totalInstallationCost` | const | 158:15
- `[manualSmrCost, setManualSmrCost]` | const | 162:11
- `[desiredTotalInput, setDesiredTotalInput]` | const | 163:11
- `normalizedComplexity` | const | 171:19
- `displaySmrCost` | const | 178:11
- `isCostOverridden` | const | 179:11
- `handleAdjustCostConfirm` | const | 188:11
- `newTotal` | const | 189:15
- `handleRevertToRecommended` | const | 202:11
- `handleInputChange` | const | 207:11
- `finalValue` | let | 208:13
- `handleSliderChange` | const | 218:11
- `handlePresetClick` | const | 219:11
- `handleModeSwitch` | const | 221:11
- `newMode` | const | 222:15

## src/components/calculator/HistoryActions.tsx

- None

## src/components/calculator/ProjectDetails.tsx

- None

## src/components/calculator/QuoteSettings.tsx

- `ServiceItem` | const | 19:7

## src/components/calculator/SpecificationPageContent.tsx

- `dynamic` | const | 57:14
- `router` | const | 77:9
- `{ user, currentProject, setCurrentProject, currentGroup, setCurrentGroup, effectivePlan, resetAppContextState, isNavigating }` | const | 78:9
- `{ toast }` | const | 79:9
- `[isSaving, startSavingTransition]` | const | 81:9
- `[isActionPending, startActionTransition]` | const | 82:9
- `[isAiEditPending, startAiEditTransition]` | const | 83:9
- `autoSaveTimerRef` | const | 84:9
- `lastAutoSaveSnapshotRef` | const | 85:9
- `lastAutoSaveAtRef` | const | 86:9
- `isAutoSavingRef` | const | 87:9
- `groupFileInputRef` | const | 88:9
- `lastComplexityMultiplierRef` | const | 89:9
- `[initialProjectStates, setInitialProjectStates]` | const | 91:9
- `[isRefineDialogOpen, setIsRefineDialogOpen]` | const | 93:9
- `[refineAction, setRefineAction]` | const | 94:9
- `[isFindMissingDialogOpen, setIsFindMissingDialogOpen]` | const | 95:9
- `[isPriceBaseDialogOpen, setIsPriceBaseDialogOpen]` | const | 96:9
- `[isUpgradeModalOpen, setIsUpgradeModalOpen]` | const | 97:9
- `[upgradeTargetRole, setUpgradeTargetRole]` | const | 98:9
- `[companies, setCompanies]` | const | 100:9
- `[isLoadingCompanies, setIsLoadingCompanies]` | const | 101:9
- `[actionHistoryByProject, setActionHistoryByProject]` | const | 102:9
- `[selectedModel, setSelectedModel]` | const | 105:9
- `[includeThoughts, setIncludeThoughts]` | const | 106:9
- `[aiDialogState, setAiDialogState]` | const | 107:9
- `[isSyncDialogOpen, setIsSyncDialogOpen]` | const | 115:9
- `[syncConflicts, setSyncConflicts]` | const | 116:9
- `[syncSelections, setSyncSelections]` | const | 117:9
- `[syncScope, setSyncScope]` | const | 118:9
- `[groupUploadFile, setGroupUploadFile]` | const | 119:9
- `[isGroupProcessingOpen, setIsGroupProcessingOpen]` | const | 120:9
- `[isGroupZipDialogOpen, setIsGroupZipDialogOpen]` | const | 121:9
- `[isAiEditDialogOpen, setIsAiEditDialogOpen]` | const | 122:9
- `[aiEditText, setAiEditText]` | const | 123:9
- `[isAiEditRecording, setIsAiEditRecording]` | const | 124:9
- `[isAiEditTranscribing, setIsAiEditTranscribing]` | const | 125:9
- `[calculatorUpdates, setCalculatorUpdates]` | const | 126:9
- `mediaRecorderRef` | const | 127:9
- `aiEditStreamRef` | const | 128:9
- `audioChunksRef` | const | 129:9
- `[isGroupWorkEnabled, setIsGroupWorkEnabled]` | const | 131:9
- `[activeProjectId, setActiveProjectId]` | const | 132:9
- `isGroupMode` | const | 133:9
- `isGroupWorkActive` | const | 134:9
- `initialProjectState` | const | 135:9
- `actionHistory` | const | 136:9
- `isPro` | const | 140:9
- `canSelectModel` | const | 141:9
- `planKey` | const | 142:9
- `planPreference` | const | 143:9
- `planModelOptions` | const | 144:9
- `planModelIds` | const | 145:9
- `resolvedPlanModel` | const | 146:9
- `proButtonClass` | const | 147:9
- `withProLabel` | const | 148:9
- `groupActionButtonClass` | const | 149:9
- `canUsePrivatePriceBase` | const | 154:9
- `calculateSmrFromSpecs` | const | 162:9
- `installation` | const | 165:13
- `groupSmrTotal` | const | 170:9
- `hasUnsavedChanges` | const | 175:9
- `snapshot` | const | 185:11
- `projectId` | const | 194:11
- `now` | const | 201:11
- `minIntervalMs` | const | 202:11
- `baseDelayMs` | const | 203:11
- `lastSavedAt` | const | 204:11
- `delayMs` | const | 205:11
- `result` | const | 211:15
- `error` | const | 240:16
- `handleBeforeUnload` | const | 255:11
- `q` | const | 280:11
- `unsubscribe` | const | 281:11
- `fetchedCompanies` | const | 282:15
- `buildSnapshot` | const | 289:9
- `MAX_ACTION_HISTORY` | const | 298:9
- `setActionHistoryForCurrent` | const | 300:9
- `currentList` | const | 303:13
- `nextList` | const | 304:13
- `persistActionHistory` | const | 309:9
- `error` | const | 317:14
- `logActionForProject` | const | 322:9
- `newAction` | const | 323:11
- `currentList` | const | 324:11
- `nextList` | const | 325:11
- `logAction` | const | 332:9
- `newAction` | const | 333:11
- `updateCurrentProject` | const | 337:9
- `nextProject` | const | 344:11
- `handleAiProjectUpdate` | const | 354:9
- `previousProject` | const | 355:11
- `seededHistory` | const | 370:13
- `nextModel` | let | 382:9
- `fallbackId` | const | 398:11
- `nextProject` | const | 403:13
- `handleModelChange` | const | 415:9
- `handleProjectTabChange` | const | 421:9
- `nextProject` | const | 425:11
- `handleGroupFileSelect` | const | 431:9
- `file` | const | 432:11
- `handleGroupProcessingClose` | const | 438:9
- `handleGroupProjectProcessed` | const | 446:9
- `formatCurrency` | const | 456:9
- `buildSyncConflicts` | const | 461:9
- `grouped` | const | 463:11
- `name` | const | 468:15
- `materialPrice` | const | 470:15
- `installationPrice` | const | 471:15
- `key` | const | 472:15
- `options` | const | 476:15
- `handleOpenSyncDialog` | const | 497:9
- `conflicts` | const | 499:11
- `defaults` | const | 505:11
- `currentOption` | const | 507:13
- `handleApplySync` | const | 515:9
- `targetProjectIds` | const | 523:11
- `conflictMap` | const | 526:11
- `updatedGroup` | const | 527:11
- `updatedSpecs` | const | 531:13
- `name` | const | 533:15
- `conflict` | const | 535:15
- `selectionKey` | const | 536:15
- `selected` | const | 537:15
- `updatedCurrent` | const | 547:11
- `updateSpecificationItem` | const | 560:9
- `oldSpecs` | const | 562:11
- `oldItem` | const | 564:11
- `matchName` | const | 565:11
- `shouldSyncByName` | const | 566:11
- `applyUpdates` | const | 568:11
- `updatedSpec` | const | 571:15
- `updatedGroup` | const | 581:13
- `updatedSpecs` | const | 582:15
- `updatedCurrent` | const | 589:13
- `fallbackSpecs` | const | 593:15
- `newSpecs` | const | 599:11
- `applyComplexityMultiplier` | const | 603:9
- `prevMultiplier` | const | 605:11
- `ratio` | const | 611:11
- `adjustSpecs` | const | 612:11
- `basePrice` | const | 614:13
- `nextPrice` | const | 615:13
- `updatedGroup` | const | 623:13
- `updatedCurrent` | const | 628:13
- `handleAddItem` | const | 640:9
- `newItem` | const | 642:11
- `newSpecs` | const | 643:11
- `handleRemoveItem` | const | 647:9
- `oldSpecs` | const | 649:11
- `newSpecs` | const | 650:11
- `removedItem` | const | 651:11
- `handleAddRecommendation` | const | 655:9
- `updatedItem` | const | 657:11
- `specs` | let | 658:9
- `hasRecommendedSection` | const | 659:11
- `handleAddAllRecommendations` | const | 666:9
- `specs` | let | 668:9
- `itemsWereAdded` | let | 669:9
- `hasRecommendedSection` | const | 680:15
- `handleSaveChanges` | const | 688:9
- `parentId` | const | 691:15
- `nextVersionNumber` | let | 692:13
- `q` | const | 694:20
- `querySnapshot` | const | 695:20
- `versions` | const | 696:20
- `mainProjectDoc` | const | 698:23
- `result` | const | 704:15
- `previousProjectId` | const | 721:20
- `hasDirectMatch` | const | 727:25
- `handleFeatureClick` | const | 748:9
- `handleS3Request` | const | 755:9
- `result` | const | 758:13
- `[smrCost, setSmrCost]` | const | 773:9
- `handleAIPricing` | const | 775:8
- `useGroupScope` | const | 778:11
- `targets` | const | 779:11
- `unapprovedProjects` | const | 780:11
- `listPreview` | const | 785:15
- `serviceModelId` | const | 815:19
- `itemsToPrice` | const | 816:19
- `groupedItems` | const | 841:19
- `totalSmrCost` | const | 863:19
- `pricingAnalysisDetails` | const | 868:19
- `pricingQuoteConfig` | const | 876:19
- `pricingCalculatorInputs` | const | 884:19
- `result` | const | 892:19
- `error` | const | 914:18
- `errorMessage` | const | 916:19
- `handleApplyPrices` | const | 922:9
- `parsePricedItems` | const | 923:11
- `pricedItems` | let | 924:11
- `textToParse` | let | 926:15
- `jsonMatch` | const | 938:17
- `jsonString` | const | 940:21
- `content` | const | 941:21
- `content` | const | 944:21
- `e` | const | 953:16
- `pricedItems` | let | 963:9
- `e` | const | 966:14
- `updatesMap` | const | 977:13
- `rawId` | const | 979:15
- `[projectId, itemId]` | const | 980:15
- `updatedGroup` | const | 988:13
- `nextSpecs` | const | 989:15
- `key` | const | 990:17
- `update` | const | 992:17
- `newPrice` | const | 993:17
- `newComment` | const | 994:17
- `updatedCurrent` | const | 1001:13
- `priceMap` | const | 1010:11
- `updatedSpecs` | const | 1012:11
- `pricedData` | const | 1014:15
- `newPrice` | const | 1015:15
- `newComment` | const | 1016:15
- `{ devicesCount, cableMeters, cableSupportMeters }` | const | 1029:9
- `devices` | let | 1032:9
- `cable` | let | 1033:9
- `cableSupport` | let | 1034:9
- `[isVersionDialogOpen, setIsVersionDialogOpen]` | const | 1047:9
- `handleLoadVersion` | const | 1049:9
- `previousProjectId` | const | 1051:11
- `projectRef` | const | 1053:13
- `projectSnap` | const | 1054:13
- `newProjectData` | const | 1056:15
- `handleRefineProject` | const | 1072:9
- `normalizeText` | const | 1081:9
- `getComparisonKey` | const | 1088:9
- `name` | const | 1089:11
- `model` | const | 1090:11
- `getTextSimilarity` | const | 1094:9
- `aSet` | const | 1098:11
- `bSet` | const | 1099:11
- `intersection` | let | 1101:9
- `union` | const | 1105:11
- `ensureItemType` | const | 1109:9
- `findInsertionIndex` | const | 1114:9
- `bestIndex` | let | 1115:9
- `bestScore` | let | 1116:9
- `score` | let | 1119:11
- `i` | let | 1132:16
- `candidate` | const | 1133:15
- `informationalIndex` | const | 1139:11
- `handleApplyFoundItems` | const | 1143:9
- `totalAdded` | let | 1149:11
- `updatedGroup` | const | 1150:13
- `existingKeys` | const | 1151:15
- `seenNewKeys` | const | 1157:15
- `dedupedItems` | const | 1158:15
- `key` | const | 1161:19
- `nextSpecs` | const | 1175:15
- `insertIndex` | const | 1177:17
- `updatedCurrent` | const | 1188:13
- `existingKeys` | const | 1201:11
- `seenNewKeys` | const | 1207:11
- `dedupedItems` | const | 1208:11
- `key` | const | 1211:15
- `nextSpecs` | const | 1226:11
- `insertIndex` | const | 1228:13
- `blobToBase64` | const | 1242:9
- `reader` | const | 1244:13
- `transcribeAiEditAudio` | const | 1251:9
- `modelId` | const | 1254:13
- `base64Data` | const | 1258:13
- `prompt` | const | 1259:13
- `result` | const | 1265:13
- `rawText` | const | 1275:13
- `cleaned` | const | 1276:13
- `parsed` | const | 1277:13
- `error` | const | 1281:14
- `startAiEditRecording` | const | 1289:9
- `stream` | const | 1300:13
- `recorder` | const | 1302:13
- `audioBlob` | const | 1310:15
- `error` | const | 1322:14
- `stopAiEditRecording` | const | 1328:9
- `applyAiEdits` | const | 1340:9
- `updates` | const | 1342:11
- `normalizeNumber` | const | 1345:11
- `num` | const | 1347:13
- `applyUpdatesToProject` | const | 1351:11
- `nextSpecs` | let | 1352:11
- `findSpecIndex` | const | 1353:13
- `indexById` | const | 1355:17
- `lookup` | const | 1359:17
- `removalIds` | const | 1366:15
- `index` | const | 1369:21
- `index` | const | 1379:17
- `updatesPayload` | const | 1381:17
- `normalized` | const | 1382:17
- `nextQuoteConfig` | const | 1416:13
- `nextAnalysisDetails` | const | 1419:13
- `updatedGroup` | const | 1435:13
- `updatedCurrent` | const | 1437:13
- `updatedProject` | const | 1443:13
- `handleAiEditSubmit` | const | 1459:9
- `modelId` | const | 1467:15
- `promptTemplate` | const | 1468:15
- `projectContext` | const | 1469:15
- `prompt` | const | 1517:15
- `result` | const | 1521:15
- `rawText` | const | 1522:15
- `cleaned` | const | 1523:15
- `parsed` | const | 1524:15
- `error` | const | 1529:16
- `isMobile` | const | 1536:9
- `resolvedActiveProjectId` | const | 1552:9
- `optionId` | const | 1592:27
- `actionIndex` | const | 1755:25
- `action` | const | 1757:25
- `snapshot` | const | 1758:25
- `nextProject` | const | 1759:25
- `nextHistory` | const | 1775:25

## src/components/calculator/SpecificationRow.tsx

- `getStatusIcon` | const | 19:7
- `SpecificationRow` | const | 36:14
- `itemSum` | const | 37:11
- `showMaterialColumns` | const | 39:11
- `handleItemTypeChange` | const | 42:11

## src/components/calculator/SpecificationTable.tsx

- None

## src/components/calculator/TotalsAndActions.tsx

- `[isDocGenDialogOpen, setIsDocGenDialogOpen]` | const | 56:9
- `constructorActions` | const | 58:9
- `{ subtotalBeforeTax, taxAmount, taxLabel, finalTotal }` | const | 62:9

## src/components/dashboard/HistorySection.tsx

- `{ user, setCurrentProject, setCurrentGroup, effectivePlan }` | const | 49:11
- `{ toast }` | const | 50:11
- `router` | const | 51:11
- `[history, setHistory]` | const | 53:11
- `[isLoadingHistory, setIsLoadingHistory]` | const | 54:11
- `[isRefreshing, setIsRefreshing]` | const | 55:11
- `[activeTab, setActiveTab]` | const | 56:11
- `[selection, setSelection]` | const | 57:11
- `[searchTerm, setSearchTerm]` | const | 58:11
- `[isNavigating, startNavigation]` | const | 60:11
- `[isActionPending, startActionTransition]` | const | 61:11
- `[isUpgradeModalOpen, setIsUpgradeModalOpen]` | const | 63:11
- `[upgradeTargetRole, setUpgradeTargetRole]` | const | 64:11
- `[isBatchPriceDialogOpen, setIsBatchPriceDialogOpen]` | const | 65:11
- `[projectsToUpdate, setProjectsToUpdate]` | const | 66:11
- `[isGroupDialogOpen, setIsGroupDialogOpen]` | const | 67:11
- `[newGroupName, setNewGroupName]` | const | 68:11
- `[density, setDensity]` | const | 69:11
- `[pendingGroupEdit, setPendingGroupEdit]` | const | 70:11
- `[isVersionDialogOpen, setIsVersionDialogOpen]` | const | 72:11
- `[projectForVersions, setProjectForVersions]` | const | 73:11
- `historyQuery` | const | 79:11
- `applyHistorySnapshot` | const | 88:11
- `grouped` | const | 89:15
- `parent` | const | 91:19
- `pickLatest` | const | 96:15
- `getTs` | const | 98:23
- `val` | const | 99:27
- `collapsed` | const | 108:15
- `main` | const | 110:19
- `sorted` | const | 114:15
- `getTs` | const | 115:19
- `val` | const | 116:23
- `refreshHistory` | const | 128:11
- `snapshot` | const | 132:19
- `historyList` | const | 133:19
- `filtered` | const | 134:19
- `error` | const | 141:18
- `unsubscribe` | const | 162:15
- `historyList` | const | 163:19
- `handleAction` | const | 185:11
- `result` | const | 188:19
- `handleRetry` | const | 197:11
- `accessUrl` | let | 201:21
- `refresh` | const | 203:27
- `{ newAccessUrl }` | const | 205:31
- `err` | const | 208:31
- `restartResult` | const | 215:23
- `modelToUse` | const | 223:23
- `response` | const | 224:23
- `result` | const | 238:23
- `err` | const | 243:22
- `handleReportAction` | const | 249:11
- `result` | const | 252:18
- `handleCreditReturnAction` | const | 261:11
- `result` | const | 264:18
- `handleDeleteForever` | const | 273:11
- `result` | const | 276:19
- `handleFeatureClick` | const | 286:11
- `handleViewResult` | const | 293:11
- `handleLoadVersion` | const | 310:11
- `projectRef` | const | 311:15
- `projectSnap` | const | 312:15
- `isPro` | const | 319:11
- `startGroupEdit` | const | 321:11
- `[firstProject]` | const | 324:19
- `handleEditGroup` | const | 331:11
- `filteredHistory` | const | 347:11
- `lowerSearch` | const | 350:19
- `groupedHistory` | const | 360:11
- `objects` | const | 361:15
- `ungroupedActive` | const | 362:15
- `ungroupedArchived` | const | 363:15
- `project` | const | 365:20
- `activeObjects` | const | 378:15
- `archivedObjects` | const | 379:15
- `handleCreateGroup` | const | 384:11
- `objectId` | const | 391:19
- `projectIds` | const | 392:19
- `handleUngroup` | const | 400:11
- `handleDownloadObjectReport` | const | 408:11
- `blob` | const | 411:19
- `e` | const | 413:18
- `handleSelectionChange` | const | 418:11
- `newSelection` | const | 420:19
- `handleBatchPriceUpdate` | const | 430:11
- `projectIds` | const | 432:15
- `result` | const | 434:19
- `handleRenameProject` | const | 447:11
- `HistoryRenderer` | const | 656:7
- `{ isLoading, activeTab, groupedHistory }` | const | 657:11
- `renderEmptyState` | const | 659:11
- `renderContent` | const | 686:11
- `{ activeObjects, ungroupedActive, archivedObjects, ungroupedArchived }` | const | 687:15
- `objectsToRender` | let | 689:13
- `ungroupedToRender` | let | 689:30
- `emptyTitle` | let | 689:49
- `emptyDescription` | let | 689:61

## src/components/dashboard/ProjectCard.tsx

- `getStatusBadge` | const | 21:7
- `safeFormatDate` | const | 33:7
- `date` | const | 35:11
- `isActionDisabled` | const | 41:11
- `[isRenaming, setIsRenaming]` | const | 42:11
- `[newName, setNewName]` | const | 43:11
- `isCompact` | const | 44:11
- `stageKey` | const | 45:11
- `stageLabel` | const | 46:11
- `stageIndex` | const | 47:11
- `progressValue` | const | 48:11
- `showStage` | const | 49:11
- `errorDetail` | const | 50:11
- `handleRename` | const | 52:11

## src/components/dashboard/ProjectGroup.tsx

- `projectIds` | const | 31:11
- `isActionDisabled` | const | 32:11
- `isCompact` | const | 33:11

## src/components/landing/CtaButton.tsx

- `CtaButton` | const | 6:14
- `commonProps` | const | 8:11

## src/components/landing/CtaSection.tsx

- `CtaSection` | const | 8:14
- `[isRegisterOpen, setIsRegisterOpen]` | const | 9:11

## src/components/landing/FaqSection.tsx

- `FaqSection` | const | 8:14
- `faqs` | const | 9:11

## src/components/landing/FeaturesSection.tsx

- `FeaturesSection` | const | 9:14
- `features` | const | 10:11
- `cardVariants` | const | 19:11

## src/components/landing/Footer.tsx

- `FooterLink` | const | 9:7
- `router` | const | 10:11
- `pathname` | const | 11:11
- `isPartnershipPage` | const | 12:11
- `handleNavigate` | const | 14:11
- `Footer` | const | 70:14
- `pathname` | const | 71:11
- `isPartnershipPage` | const | 72:11
- `logoVariant` | const | 74:11
- `logoHref` | const | 75:11

## src/components/landing/Header.tsx

- `NavItemWithAlert` | const | 22:7
- `title` | const | 23:11
- `description` | const | 24:11
- `triggerClass` | const | 26:11
- `NavLink` | const | 51:7
- `ThemeSwitcher` | const | 60:7
- `{ theme, setTheme }` | const | 61:11
- `[mounted, setMounted]` | const | 62:11
- `renderIcon` | const | 68:11
- `Header` | const | 95:14
- `pathname` | const | 96:11
- `router` | const | 97:11
- `isPartnershipPage` | const | 98:11
- `[isOpen, setIsOpen]` | const | 100:11
- `[isRegisterOpen, setIsRegisterOpen]` | const | 101:11
- `[isPartnerRegisterOpen, setIsPartnerRegisterOpen]` | const | 102:11
- `navItems` | const | 104:11
- `ctaButton` | const | 118:11
- `secondaryAction` | const | 124:11
- `isAlertLink` | const | 147:27
- `isAlertLink` | const | 171:39

## src/components/landing/HeroSection.tsx

- `TypingAnimation` | const | 9:7
- `[wordIndex, setWordIndex]` | const | 10:11
- `count` | const | 11:11
- `rounded` | const | 12:11
- `displayText` | const | 13:11
- `typingAnimation` | const | 18:15
- `deletingAnimation` | const | 25:27
- `HeroSection` | const | 50:14
- `[isRegisterOpen, setIsRegisterOpen]` | const | 51:11

## src/components/landing/HowItWorksSection.tsx

- `HowItWorksSection` | const | 9:14
- `steps` | const | 10:11
- `cardVariants` | const | 16:11

## src/components/landing/IntegrationsSection.tsx

- `IntegrationsSection` | const | 4:14

## src/components/landing/PartnershipSection.tsx

- `PartnershipSection` | const | 10:14
- `router` | const | 11:11
- `handleNavigate` | const | 13:11

## src/components/landing/PricingSection.tsx

- `PlanCard` | const | 18:7
- `featureList` | const | 47:7
- `FeatureComparisonTable` | const | 66:7
- `PricingSection` | const | 108:14
- `[isLegalEntityModalOpen, setIsLegalEntityModalOpen]` | const | 109:11
- `[isRegisterModalOpen, setIsRegisterModalOpen]` | const | 110:11
- `[employeeCount, setEmployeeCount]` | const | 111:11
- `handleCorporateClick` | const | 113:11
- `handleRegisterClick` | const | 118:11
- `proPrice` | const | 123:11
- `businessPrice` | const | 124:11
- `plans` | const | 126:11

## src/components/landing/SuccessStoriesSection.tsx

- `stories` | const | 6:7
- `SuccessStoriesSection` | const | 30:14

## src/components/landing/TestDriveSection.tsx

- `MAX_FILE_SIZE` | const | 18:7
- `{ toast }` | const | 21:11
- `{ user }` | const | 22:11
- `[selectedFile, setSelectedFile]` | const | 24:11
- `[isDialogOpen, setIsDialogOpen]` | const | 25:11
- `[isCreditsDialogOpen, setIsCreditsDialogOpen]` | const | 26:11
- `guestModel` | const | 28:11
- `[guestCredits, setGuestCredits]` | const | 33:11
- `onDrop` | const | 35:11
- `file` | const | 37:19
- `{ getRootProps, getInputProps, isDragActive }` | const | 50:11
- `handleAnalysis` | const | 57:11
- `handleClearFile` | const | 80:11
- `input` | const | 108:39

## src/components/landing/TestimonialsSection.tsx

- `TestimonialsSection` | const | 5:14
- `testimonials` | const | 6:11
- `duplicatedTestimonials` | const | 19:11

## src/components/mobile-panel/ActionBlock.tsx

- `ActionBlock` | const | 23:14
- `[isDocGenOpen, setIsDocGenOpen]` | const | 24:11
- `{ toast }` | const | 25:11
- `handleAction` | const | 27:11

## src/components/mobile-panel/MobileCalculator.tsx

- `recommendedValues` | const | 15:7
- `COMPLEXITY_MIN` | const | 25:7
- `COMPLEXITY_MAX` | const | 26:7
- `complexityPresets` | const | 28:7
- `clampComplexity` | const | 36:7
- `getRecommendedComplexityByHeight` | const | 41:7
- `match` | const | 43:11
- `height` | const | 45:11
- `{ user, effectivePlan }` | const | 59:11
- `[inputValues, setInputValues]` | const | 64:11
- `isPro` | const | 71:11
- `recommendedByHeight` | const | 74:15
- `{ devicesCount, cableMeters, cableSupportMeters }` | const | 80:11
- `devices` | let | 82:13
- `cable` | let | 83:13
- `cableSupport` | let | 84:13
- `calculatedShiftCost` | const | 94:11
- `{ totalInstallationCost: recommendedSmrCost }` | const | 100:11
- `{ normDevicesPerShift, normCablePerShift, normCableSupportPerShift, infraCost, marginPercent, complexityMultiplier }` | const | 101:15
- `deviceShifts` | const | 102:15
- `cableShifts` | const | 103:15
- `cableSupportShifts` | const | 104:15
- `totalShifts` | const | 105:15
- `totalInstallationCost` | const | 106:15
- `handleInputChange` | const | 114:11
- `numericFields` | const | 115:15
- `finalValue` | let | 116:13
- `handleSliderChange` | const | 123:11
- `handlePresetClick` | const | 124:11
- `handleModeSwitch` | const | 126:11
- `newMode` | const | 127:15

## src/components/mobile-panel/ProjectView.tsx

- `fadeUp` | const | 19:7
- `ProjectView` | const | 29:14
- `{ user }` | const | 30:11
- `[project, setProject]` | const | 31:11
- `[companies, setCompanies]` | const | 32:11
- `[smrCost, setSmrCost]` | const | 35:11
- `[showSpecs, setShowSpecs]` | const | 37:11
- `[isClientFormOpen, setIsClientFormOpen]` | const | 38:11
- `[selectedContractorId, setSelectedContractorId]` | const | 40:11
- `[selectedClientId, setSelectedClientId]` | const | 41:11
- `projectTotals` | const | 44:11
- `specsWithManualSmr` | const | 45:15
- `[price, setPrice]` | const | 58:11
- `q` | const | 66:15
- `unsubscribe` | const | 67:15
- `fetchedCompanies` | const | 68:19
- `handleUpdateItem` | const | 80:11
- `newSpecs` | const | 83:19
- `handleRemoveItem` | const | 88:11
- `handleAddItem` | const | 95:11
- `contractorOptions` | const | 99:11
- `clientOptions` | const | 100:11

## src/components/partnership/FinalCtaSection.tsx

- `FinalCtaSection` | const | 9:14
- `[isPartnerRegisterOpen, setIsPartnerRegisterOpen]` | const | 10:9
- `[timeLeft, setTimeLeft]` | const | 11:9
- `[isClient, setIsClient]` | const | 12:9
- `calculateTimeLeft` | const | 17:11
- `initialSeconds` | const | 18:13
- `startTimeItem` | const | 19:13
- `now` | const | 20:13
- `startTimestamp` | let | 21:11
- `elapsedSeconds` | const | 30:13
- `difference` | let | 31:11
- `newTimeLeft` | let | 33:11
- `timer` | const | 48:11
- `timerComponents` | const | 55:9

## src/components/partnership/HowItWorks.tsx

- `steps` | const | 9:7
- `IncomeSourceCard` | const | 36:7
- `HowItWorks` | const | 74:14
- `[openCard, setOpenCard]` | const | 75:11
- `handleToggle` | const | 77:11

## src/components/partnership/IncomeCalculator.tsx

- `partnerRates` | const | 10:7
- `calculateMonthlyIncome` | const | 16:7
- `{ partnerStatus, proClients, businessClients, avgBusinessUsers, integrations, freeClientsBuyingCredits, attractedPartners }` | const | 25:11
- `rate` | const | 26:11
- `proIncome` | const | 28:11
- `businessUsersTotal` | const | 29:11
- `businessIncome` | const | 30:11
- `integrationIncome` | const | 31:11
- `freeClientIncome` | const | 32:11
- `subPartnerAvgIncome` | const | 33:11
- `subPartnerIncome` | const | 34:11
- `IncomeCalculator` | const | 39:14
- `[partnerStatus, setPartnerStatus]` | const | 40:11
- `[proClients, setProClients]` | const | 41:11
- `[businessClients, setBusinessClients]` | const | 42:11
- `[avgBusinessUsers, setAvgBusinessUsers]` | const | 43:11
- `[integrations, setIntegrations]` | const | 44:11
- `[freeClientsBuyingCredits, setFreeClientsBuyingCredits]` | const | 45:11
- `[attractedPartners, setAttractedPartners]` | const | 46:11
- `monthlyIncome` | const | 48:11
- `cumulativePlan` | const | 52:12
- `calculateIncomeForPeriod` | const | 53:15
- `month1Income` | const | 63:15
- `month2Income` | const | 64:15
- `month3Income` | const | 65:15

## src/components/partnership/MarketNumbersSection.tsx

- `stats` | const | 8:7
- `MarketNumbersSection` | const | 29:14

## src/components/partnership/MarketPotentialSection.tsx

- `FormattedCountUp` | const | 12:7
- `displayValue` | let | 13:9
- `suffix` | let | 14:9
- `formattedValue` | const | 25:11
- `MarketPotentialSection` | const | 36:7
- `proYearlyPrice` | const | 37:11
- `businessYearlyPrice` | const | 38:11
- `freeWithCreditsPrice` | const | 39:11
- `enterprisePrice` | const | 40:11
- `calculations` | const | 42:11
- `totalMarket` | const | 77:11
- `cardVariants` | const | 79:11
- `Icon` | const | 116:31
- `itemTotal` | const | 117:31

## src/components/partnership/PartnershipHero.tsx

- `TypingAnimation` | const | 8:7
- `[wordIndex, setWordIndex]` | const | 9:11
- `count` | const | 10:11
- `rounded` | const | 11:11
- `displayText` | const | 12:11
- `typingAnimation` | const | 17:15
- `deletingAnimation` | const | 23:27
- `PartnershipHero` | const | 48:14
- `[isPartnerRegisterOpen, setIsPartnerRegisterOpen]` | const | 49:11

## src/components/partnership/TargetAudienceSection.tsx

- `chartData` | const | 10:7
- `COLORS` | const | 16:7
- `chartConfig` | const | 18:7
- `TargetAudienceSection` | const | 36:14
- `[isClient, setIsClient]` | const | 37:9
- `Icon` | const | 86:31

## src/components/partnership/TestimonialsSection.tsx

- `TestimonialsSection` | const | 5:14
- `testimonials` | const | 6:11
- `duplicatedTestimonials` | const | 30:11

## src/components/partnership/TiersSection.tsx

- `TiersSection` | const | 12:14
- `[isRegisterOpen, setIsRegisterOpen]` | const | 13:11
- `levels` | const | 15:11

## src/components/partnership/UseCasesSection.tsx

- `cases` | const | 13:7
- `DesktopView` | const | 40:7
- `MobileView` | const | 70:7
- `[activeIndex, setActiveIndex]` | const | 71:11
- `nextCase` | const | 73:11
- `prevCase` | const | 74:11
- `isActive` | const | 80:27
- `isNext` | const | 81:27
- `isPrev` | const | 82:27
- `animateState` | let | 84:25
- `variants` | const | 91:27
- `UseCasesSection` | const | 150:14
- `[isPartnerRegisterOpen, setIsPartnerRegisterOpen]` | const | 151:11
- `isMobile` | const | 152:11
- `handleCtaClick` | const | 154:11

## src/components/partnership/VideoSection.tsx

- `VideoSection` | const | 6:14

## src/components/partnership/WindowOfOpportunitySection.tsx

- `WindowOfOpportunitySection` | const | 10:14
- `[isPartnerRegisterOpen, setIsPartnerRegisterOpen]` | const | 11:11

## src/components/pdf/ActTemplate.tsx

- `styles` | const | 19:7
- `formatContractDate` | const | 99:7
- `parsed` | const | 102:9
- `ActTemplate` | const | 107:7
- `rows` | const | 111:15
- `total` | const | 112:15

## src/components/pdf/ContractTemplate.tsx

- `styles` | const | 23:7
- `numberToWordsRu` | const | 129:7
- `roundedNum` | const | 130:9
- `ContractTemplate` | const | 134:7
- `tpl` | const | 151:9
- `accentColor` | const | 152:9
- `isModern` | const | 153:9
- `pageStyle` | const | 155:9
- `appendixPages` | const | 160:9

## src/components/pdf/DocumentTemplate.tsx

- `baseStyles` | const | 26:7
- `DocumentTemplate` | const | 159:7
- `tpl` | const | 171:9
- `resolved` | const | 172:9
- `accentColor` | const | 173:9
- `headerStyle` | const | 174:9
- `isCompact` | const | 180:9
- `isModern` | const | 181:9
- `showSignature` | const | 182:9
- `showStamp` | const | 183:9
- `pageStyle` | const | 185:9
- `titleStyle` | const | 191:9
- `commissioningTotal` | const | 192:9
- `qtyInstall` | const | 251:23
- `priceInstall` | const | 252:23
- `sumInstall` | const | 253:23
- `qtyMaterial` | const | 254:23
- `priceMaterial` | const | 255:23
- `sumMaterial` | const | 256:23
- `itemTotal` | const | 257:23

## src/components/pdf/GroupDocumentTemplate.tsx

- `baseStyles` | const | 21:7
- `GroupDocumentTemplate` | const | 154:7
- `tpl` | const | 163:9
- `resolved` | const | 164:9
- `accentColor` | const | 165:9
- `headerStyle` | const | 166:9
- `isCompact` | const | 172:9
- `isModern` | const | 173:9
- `showSignature` | const | 174:9
- `showStamp` | const | 175:9
- `pageStyle` | const | 177:9
- `titleStyle` | const | 183:9
- `projectLabel` | const | 203:21
- `totals` | const | 224:15
- `commissioningTotal` | const | 225:15
- `headerObjectName` | const | 226:15
- `qtyInstall` | const | 269:23
- `priceInstall` | const | 270:23
- `sumInstall` | const | 271:23
- `qtyMaterial` | const | 272:23
- `priceMaterial` | const | 273:23
- `sumMaterial` | const | 274:23
- `itemTotal` | const | 275:23

## src/components/pdf/InvoiceTemplate.tsx

- `baseStyles` | const | 26:7
- `numberToWordsRu` | const | 123:7
- `words` | const | 125:11
- `InvoiceTemplate` | const | 129:7
- `tpl` | const | 140:11
- `accentColor` | const | 141:11
- `isModern` | const | 142:11
- `isCompact` | const | 143:11
- `showSignature` | const | 144:11
- `showStamp` | const | 145:11
- `styles` | const | 146:11
- `totalSum` | const | 156:11
- `taxAmount` | const | 157:11
- `finalTotal` | const | 158:11
- `totalInWords` | const | 161:11

## src/components/pdf/Ks2Template.tsx

- `styles` | const | 19:7
- `formatContractDate` | const | 93:7
- `parsed` | const | 96:9
- `Ks2Template` | const | 101:7
- `rows` | const | 104:13
- `total` | const | 105:13

## src/components/pdf/Ks3Template.tsx

- `styles` | const | 19:7
- `formatContractDate` | const | 93:7
- `parsed` | const | 96:9
- `Ks3Template` | const | 101:7
- `rows` | const | 104:13
- `total` | const | 105:13

## src/components/pdf/Ks6aTemplate.tsx

- `styles` | const | 19:7
- `formatContractDate` | const | 93:7
- `parsed` | const | 96:9
- `Ks6aTemplate` | const | 101:7
- `rows` | const | 104:13
- `total` | const | 105:13

## src/components/pdf/PDFPreview.tsx

- `PDFPreview` | const | 12:7

## src/components/support/FloatingSupportChat.tsx

- `{ isOpen, toggle }` | const | 11:9

## src/components/support/SupportChat.tsx

- `{ user }` | const | 23:9
- `{ toast }` | const | 24:9
- `[thread, setThread]` | const | 25:9
- `[manager, setManager]` | const | 26:9
- `[messages, setMessages]` | const | 27:9
- `[messageText, setMessageText]` | const | 28:9
- `[isLoading, setIsLoading]` | const | 29:9
- `[isRefreshing, setIsRefreshing]` | const | 30:9
- `[isSending, startSending]` | const | 31:9
- `loadThread` | const | 33:9
- `result` | const | 35:11
- `loadMessages` | const | 45:9
- `result` | const | 48:13
- `refresh` | const | 58:9
- `threadId` | const | 61:11
- `init` | const | 75:11
- `threadId` | const | 81:13
- `handleSend` | const | 90:9
- `text` | const | 92:11
- `result` | const | 96:13
- `updated` | const | 108:13
- `handleSatisfaction` | const | 115:9
- `result` | const | 117:11
- `updated` | const | 127:11
- `formatResponseTime` | const | 133:9
- `seconds` | const | 135:11
- `minutes` | const | 136:11
- `hours` | const | 138:11

## src/components/tabs/ProfileTab.tsx

- `{ user, setUser, telegramUser, effectivePlan }` | const | 40:9
- `{ toast }` | const | 41:9
- `{ open: openSupportChat }` | const | 42:9
- `[isPending, startTransition]` | const | 43:9
- `[isTemplatePending, startTemplateTransition]` | const | 44:9
- `[isUpgradeOpen, setIsUpgradeOpen]` | const | 45:9
- `[upgradeTargetRole, setUpgradeTargetRole]` | const | 46:9
- `[isPurchaseOpen, setIsPurchaseOpen]` | const | 47:9
- `{ templates: customTemplates, isLoading: isTemplatesLoading }` | const | 49:9
- `{ templates: globalTemplates, settings: templateSettings }` | const | 50:9
- `[isTemplateDialogOpen, setIsTemplateDialogOpen]` | const | 51:9
- `[editingTemplate, setEditingTemplate]` | const | 52:9
- `[displayName, setDisplayName]` | const | 54:9
- `[telegramUsernameState, setTelegramUsernameState]` | const | 55:9
- `[documentTemplates, setDocumentTemplates]` | const | 56:9
- `[signatureState, setSignatureState]` | const | 61:9
- `[stampState, setStampState]` | const | 66:9
- `[avatarState, setAvatarState]` | const | 71:9
- `[avatarFile, setAvatarFile]` | const | 76:9
- `[isAvatarCropOpen, setIsAvatarCropOpen]` | const | 77:9
- `[isUploadingSignature, setIsUploadingSignature]` | const | 78:9
- `[isUploadingStamp, setIsUploadingStamp]` | const | 79:9
- `[isUploadingAvatar, setIsUploadingAvatar]` | const | 80:9
- `[botUrl, setBotUrl]` | const | 82:9
- `[isSyncingChat, setIsSyncingChat]` | const | 83:9
- `{ theme, setTheme }` | const | 84:9
- `fetchBotUrl` | const | 87:11
- `settings` | const | 88:19
- `referralLink` | const | 94:9
- `chatLink` | const | 95:9
- `handleCopy` | const | 122:9
- `handleProfileUpdate` | const | 130:9
- `result` | const | 133:13
- `openUpgradeDialog` | const | 173:9
- `currentPlan` | const | 178:9
- `nextPlan` | const | 179:9
- `nextPlanLabel` | const | 180:9
- `handleNextPlanClick` | const | 182:9
- `handleMarketingToggle` | const | 191:9
- `result` | const | 194:13
- `handleSyncChatId` | const | 204:9
- `result` | const | 208:13
- `error` | const | 217:14
- `openTemplateDialog` | const | 224:9
- `handleTemplateSubmit` | const | 229:9
- `payload` | const | 232:13
- `result` | const | 240:13
- `handleTemplateDelete` | const | 262:9
- `confirmed` | const | 264:11
- `result` | const | 267:13
- `templatesChanged` | const | 276:9
- `isProfileChanged` | const | 282:9
- `canEditTemplates` | const | 293:9
- `customProposalTemplates` | const | 294:9
- `templateOptions` | const | 299:9
- `templateLimit` | const | 310:9
- `templateCount` | const | 311:9
- `canUseConstructor` | const | 312:9
- `isLimitReached` | const | 313:9
- `proposalDefault` | const | 316:11
- `invoiceDefault` | const | 317:11
- `contractDefault` | const | 318:11
- `uploadAsset` | const | 327:9
- `presignedUrlResponse` | const | 328:11
- `{ uploadUrl, accessUrl, objectKey, urlExpirationTimestamp }` | const | 336:11
- `uploadResponse` | const | 337:11
- `handleAssetChange` | const | 348:9
- `uploaded` | const | 358:13
- `error` | const | 367:14
- `handleAvatarSelect` | const | 376:9
- `handleAssetRemove` | const | 386:9

## src/components/templates/AdminTemplateEditorDialog.tsx

- `defaultValues` | const | 32:7
- `[values, setValues]` | const | 49:9
- `handleChange` | const | 68:9
- `handleSubmit` | const | 72:9

## src/components/templates/TemplateConstructorDialog.tsx

- `defaultValues` | const | 32:7
- `[values, setValues]` | const | 48:9
- `handleChange` | const | 66:9
- `handleSubmit` | const | 70:9

## src/components/ui/accordion.tsx

- `Accordion` | const | 9:7
- `AccordionItem` | const | 11:7
- `AccordionTrigger` | const | 23:7
- `AccordionContent` | const | 43:7

## src/components/ui/aceternity-ui.tsx

- `BottomGradient` | const | 7:14
- `LabelInputContainer` | const | 16:14

## src/components/ui/alert-dialog.tsx

- `AlertDialog` | const | 9:7
- `AlertDialogTrigger` | const | 11:7
- `AlertDialogPortal` | const | 13:7
- `AlertDialogOverlay` | const | 15:7
- `AlertDialogContent` | const | 30:7
- `AlertDialogHeader` | const | 48:7
- `AlertDialogFooter` | const | 62:7
- `AlertDialogTitle` | const | 76:7
- `AlertDialogDescription` | const | 88:7
- `AlertDialogAction` | const | 101:7
- `AlertDialogCancel` | const | 113:7

## src/components/ui/alert.tsx

- `alertVariants` | const | 6:7
- `Alert` | const | 22:7
- `AlertTitle` | const | 35:7
- `AlertDescription` | const | 47:7

## src/components/ui/avatar.tsx

- `Avatar` | const | 8:7
- `AvatarImage` | const | 23:7
- `AvatarFallback` | const | 35:7

## src/components/ui/badge.tsx

- `badgeVariants` | const | 6:7

## src/components/ui/button.tsx

- `buttonVariants` | const | 7:7
- `Button` | const | 45:7
- `Comp` | const | 47:11

## src/components/ui/calendar.tsx

- None

## src/components/ui/card.tsx

- `Card` | const | 5:7
- `CardHeader` | const | 20:7
- `CardTitle` | const | 32:7
- `CardDescription` | const | 47:7
- `CardContent` | const | 59:7
- `CardFooter` | const | 67:7

## src/components/ui/chart.tsx

- `THEMES` | const | 9:7
- `ChartContext` | const | 25:7
- `context` | const | 28:9
- `ChartContainer` | const | 37:7
- `uniqueId` | const | 46:9
- `chartId` | const | 47:9
- `ChartStyle` | const | 72:7
- `colorConfig` | const | 73:9
- `color` | const | 90:11
- `ChartTooltip` | const | 105:7
- `ChartTooltipContent` | const | 107:7
- `{ config }` | const | 136:11
- `tooltipLabel` | const | 138:11
- `[item]` | const | 143:13
- `key` | const | 144:13
- `itemConfig` | const | 145:13
- `value` | const | 146:13
- `nestLabel` | const | 178:11
- `key` | const | 191:19
- `itemConfig` | const | 192:19
- `indicatorColor` | const | 193:19
- `ChartLegend` | const | 261:7
- `ChartLegendContent` | const | 263:7
- `{ config }` | const | 275:11
- `key` | const | 291:17
- `itemConfig` | const | 292:17
- `payloadPayload` | const | 331:9
- `configLabelKey` | let | 338:7

## src/components/ui/checkbox.tsx

- `Checkbox` | const | 9:7

## src/components/ui/dialog.tsx

- `Dialog` | const | 9:7
- `DialogTrigger` | const | 11:7
- `DialogPortal` | const | 13:7
- `DialogClose` | const | 15:7
- `DialogOverlay` | const | 17:7
- `DialogContent` | const | 32:7
- `DialogHeader` | const | 56:7
- `DialogFooter` | const | 70:7
- `DialogTitle` | const | 84:7
- `DialogDescription` | const | 99:7

## src/components/ui/dropdown-menu.tsx

- `DropdownMenu` | const | 9:7
- `DropdownMenuTrigger` | const | 11:7
- `DropdownMenuGroup` | const | 13:7
- `DropdownMenuPortal` | const | 15:7
- `DropdownMenuSub` | const | 17:7
- `DropdownMenuRadioGroup` | const | 19:7
- `DropdownMenuSubTrigger` | const | 21:7
- `DropdownMenuSubContent` | const | 43:7
- `DropdownMenuContent` | const | 59:7
- `DropdownMenuItem` | const | 77:7
- `DropdownMenuCheckboxItem` | const | 95:7
- `DropdownMenuRadioItem` | const | 119:7
- `DropdownMenuLabel` | const | 141:7
- `DropdownMenuSeparator` | const | 159:7
- `DropdownMenuShortcut` | const | 171:7

## src/components/ui/form.tsx

- `Form` | const | 18:7
- `FormFieldContext` | const | 27:7
- `FormField` | const | 31:7
- `useFormField` | const | 44:7
- `fieldContext` | const | 45:9
- `itemContext` | const | 46:9
- `{ getFieldState, formState }` | const | 47:9
- `fieldState` | const | 49:9
- `{ id }` | const | 55:9
- `FormItemContext` | const | 71:7
- `FormItem` | const | 75:7
- `id` | const | 79:9
- `FormLabel` | const | 89:7
- `{ error, formItemId }` | const | 93:9
- `FormControl` | const | 106:7
- `{ error, formItemId, formDescriptionId, formMessageId }` | const | 110:9
- `FormDescription` | const | 128:7
- `{ formDescriptionId }` | const | 132:9
- `FormMessage` | const | 145:7
- `{ error, formMessageId }` | const | 149:9
- `body` | const | 150:9

## src/components/ui/glass-button.tsx

- `buttonVariants` | const | 9:7
- `GlassButton` | const | 39:14

## src/components/ui/glass-card.tsx

- `GlassCard` | const | 17:14
- `gradientClasses` | const | 26:9
- `whileHover` | const | 33:9

## src/components/ui/glass-container.tsx

- `GlassContainer` | const | 16:14
- `blurMap` | const | 24:9
- `variantClasses` | const | 32:9

## src/components/ui/glass-navbar.tsx

- `GlassNavbar` | const | 24:14
- `containerVariants` | const | 32:9

## src/components/ui/input.tsx

- `Input` | const | 5:7

## src/components/ui/label.tsx

- `labelVariants` | const | 9:7
- `Label` | const | 13:7

## src/components/ui/liquid-glass-filter.tsx

- `LiquidGlassFilter` | const | 3:14

## src/components/ui/menubar.tsx

- `MenubarMenu` | const | 9:7
- `MenubarGroup` | const | 10:7
- `MenubarPortal` | const | 11:7
- `MenubarSub` | const | 12:7
- `MenubarRadioGroup` | const | 13:7
- `Menubar` | const | 15:7
- `MenubarTrigger` | const | 30:7
- `MenubarSubTrigger` | const | 45:7
- `MenubarSubContent` | const | 66:7
- `MenubarContent` | const | 81:7
- `MenubarItem` | const | 106:7
- `MenubarCheckboxItem` | const | 124:7
- `MenubarRadioItem` | const | 147:7
- `MenubarLabel` | const | 169:7
- `MenubarSeparator` | const | 187:7
- `MenubarShortcut` | const | 199:7

## src/components/ui/popover.tsx

- `Popover` | const | 8:7
- `PopoverTrigger` | const | 10:7
- `PopoverContent` | const | 12:7

## src/components/ui/progress.tsx

- `Progress` | const | 8:7

## src/components/ui/radio-group.tsx

- `RadioGroup` | const | 9:7
- `RadioGroupItem` | const | 23:7

## src/components/ui/scroll-area.tsx

- `ScrollArea` | const | 8:7
- `ScrollBar` | const | 26:7

## src/components/ui/select.tsx

- `Select` | const | 9:7
- `SelectGroup` | const | 11:7
- `SelectValue` | const | 13:7
- `SelectTrigger` | const | 15:7
- `SelectScrollUpButton` | const | 35:7
- `SelectScrollDownButton` | const | 52:7
- `SelectContent` | const | 70:7
- `SelectLabel` | const | 102:7
- `SelectItem` | const | 114:7
- `SelectSeparator` | const | 137:7

## src/components/ui/separator.tsx

- `Separator` | const | 8:7

## src/components/ui/sheet.tsx

- `Sheet` | const | 10:7
- `SheetTrigger` | const | 12:7
- `SheetClose` | const | 14:7
- `SheetPortal` | const | 16:7
- `SheetOverlay` | const | 18:7
- `sheetVariants` | const | 33:7
- `SheetContent` | const | 56:7
- `SheetHeader` | const | 77:7
- `SheetFooter` | const | 91:7
- `SheetTitle` | const | 105:7
- `SheetDescription` | const | 117:7

## src/components/ui/sidebar.tsx

- `SidebarContext` | const | 14:7
- `useSidebar` | const | 16:14
- `context` | const | 17:9
- `Sidebar` | const | 24:14
- `[isAnimating, setIsAnimating]` | const | 35:11
- `SidebarBody` | const | 92:14
- `SidebarLink` | const | 115:14
- `{ open, isAnimating }` | const | 124:9
- `handleClick` | const | 126:9

## src/components/ui/skeleton.tsx

- None

## src/components/ui/slider.tsx

- `Slider` | const | 8:7

## src/components/ui/sticky-banner.tsx

- `StickyBanner` | const | 10:14
- `[isDismissed, setIsDismissed]` | const | 22:9
- `closed` | const | 28:15
- `error` | const | 34:16
- `handleClose` | const | 45:9
- `error` | const | 50:16
- `isVisible` | const | 57:9

## src/components/ui/switch.tsx

- `Switch` | const | 8:7

## src/components/ui/table.tsx

- `Table` | const | 6:7
- `TableHeader` | const | 19:7
- `TableBody` | const | 27:7
- `TableFooter` | const | 39:7
- `TableRow` | const | 54:7
- `TableHead` | const | 69:7
- `TableCell` | const | 84:7
- `TableCaption` | const | 96:7

## src/components/ui/tabs.tsx

- `Tabs` | const | 8:7
- `TabsList` | const | 10:7
- `TabsTrigger` | const | 25:7
- `TabsContent` | const | 40:7

## src/components/ui/textarea.tsx

- `Textarea` | const | 5:7

## src/components/ui/toast.tsx

- `ToastProvider` | const | 10:7
- `ToastViewport` | const | 12:7
- `toastVariants` | const | 27:7
- `Toast` | const | 43:7
- `ToastAction` | const | 58:7
- `ToastClose` | const | 73:7
- `ToastTitle` | const | 91:7
- `ToastDescription` | const | 103:7

## src/components/ui/toaster.tsx

- `{ toasts }` | const | 14:9

## src/components/ui/tooltip.tsx

- `TooltipProvider` | const | 8:7
- `Tooltip` | const | 10:7
- `TooltipTrigger` | const | 12:7
- `TooltipContent` | const | 14:7

## src/contexts/AppContext.tsx

- `SystemRole` | const | 23:14
- `UserPlan` | const | 30:14
- `initialQuoteConfig` | const | 451:14
- `AppContext` | const | 473:7
- `convertTimestampsToDates` | const | 476:7
- `newObj` | const | 485:15
- `key` | const | 486:20
- `AppProvider` | const | 495:14
- `{ toast }` | const | 496:9
- `[user, setUser]` | const | 497:9
- `[isLoading, setIsLoading]` | const | 498:9
- `[effectivePlan, setEffectivePlan]` | const | 499:9
- `[effectiveRole, setEffectiveRole]` | const | 500:9
- `{ data: session, status }` | const | 501:9
- `sessionUser` | const | 502:9
- `authLoading` | const | 503:9
- `authError` | const | 504:9
- `router` | const | 505:9
- `pathname` | const | 506:9
- `searchParams` | const | 507:9
- `[currentProject, setCurrentProject]` | const | 509:9
- `[currentGroup, setCurrentGroup]` | const | 510:9
- `[showTimeoutWarning, setShowTimeoutWarning]` | const | 512:9
- `[actionHistory, setActionHistory]` | const | 513:9
- `[changeCounter, setChangeCounter]` | const | 516:9
- `[useFileUpload]` | const | 517:9
- `incrementChangeCounter` | const | 520:9
- `resetChangeCounter` | const | 521:9
- `telegram` | const | 523:9
- `telegramUser` | const | 530:9
- `[isNavigating, setNavigating]` | const | 537:9
- `[isTransitioning, startTransition]` | const | 538:9
- `userAvailableModels` | const | 540:9
- `checkUserPlan` | const | 545:9
- `changed` | let | 546:9
- `now` | const | 547:11
- `userRef` | const | 548:11
- `tempPlan` | let | 549:9
- `resetAppContextState` | const | 572:9
- `userDocRef` | const | 593:11
- `unsubscribe` | const | 594:11
- `rawData` | const | 596:19
- `userData` | const | 597:19
- `managerDocRef` | const | 600:23
- `managerDoc` | const | 601:23
- `managerData` | const | 603:27
- `isPwa` | const | 621:23
- `handleThemeChange` | const | 647:15
- `root` | const | 648:17
- `cssVar` | const | 650:21
- `handleBackButton` | const | 656:15
- `logAction` | const | 693:9
- `newAction` | const | 694:11
- `value` | const | 698:9
- `useAppContext` | const | 732:14
- `context` | const | 733:9

## src/contexts/SupportChatContext.tsx

- `SupportChatContext` | const | 12:7
- `[isOpen, setIsOpen]` | const | 15:9
- `open` | const | 17:9
- `close` | const | 18:9
- `toggle` | const | 19:9
- `value` | const | 21:9
- `ctx` | const | 27:9

## src/hooks/use-document-templates.ts

- `{ enabled = true }` | const | 8:9
- `[templates, setTemplates]` | const | 9:9
- `[settings, setSettings]` | const | 10:9
- `[isLoading, setIsLoading]` | const | 11:9
- `isMounted` | let | 15:9

## src/hooks/use-engagement-tracking.ts

- `sendEvent` | const | 6:7
- `e` | const | 22:12
- `useEngagementTracking` | const | 27:14
- `logOnce` | const | 28:9
- `storageKey` | const | 31:13
- `handleInstalled` | const | 43:11
- `isStandalone` | const | 47:11

## src/hooks/use-mobile.tsx

- `MOBILE_BREAKPOINT` | const | 6:7
- `[isMobile, setIsMobile]` | const | 10:9
- `checkIsMobile` | const | 14:11
- `handleResize` | const | 19:11

## src/hooks/use-toast.ts

- `TOAST_LIMIT` | const | 11:7
- `TOAST_REMOVE_DELAY` | const | 12:7
- `actionTypes` | const | 21:7
- `count` | let | 28:5
- `toastTimeouts` | const | 59:7
- `addToRemoveQueue` | const | 61:7
- `timeout` | const | 66:9
- `reducer` | const | 77:14
- `{ toastId }` | const | 94:13
- `listeners` | const | 132:7
- `memoryState` | let | 134:5
- `id` | const | 146:9
- `update` | const | 148:9
- `dismiss` | const | 153:9
- `[state, setState]` | const | 175:9
- `index` | const | 180:13

## src/hooks/use-user-templates.ts

- `{ enabled = true }` | const | 15:9
- `{ user }` | const | 16:9
- `[templates, setTemplates]` | const | 17:9
- `[isLoading, setIsLoading]` | const | 18:9
- `q` | const | 28:11
- `unsubscribe` | const | 34:11
- `nextTemplates` | const | 37:15

## src/lib/auth.ts

- `authOptions` | const | 8:14
- `db` | const | 26:15
- `email` | const | 27:15
- `user` | const | 28:15
- `isValid` | const | 36:15
- `updates` | const | 41:15
- `{ apiModels }` | const | 42:15
- `defaultModel` | const | 43:15

## src/lib/calculation.ts

- `materialCostComponent` | let | 9:9
- `showMaterials` | const | 12:11
- `quantityForMaterial` | const | 15:15
- `installationCostComponent` | const | 19:11
- `specItemsTotalSum` | const | 27:11
- `servicesSubtotal` | let | 29:9
- `pnrCost` | const | 31:11
- `subtotalBeforeTax` | const | 41:11
- `taxAmount` | let | 43:9
- `taxLabel` | let | 44:9
- `finalTotal` | let | 45:9

## src/lib/document-constructor.ts

- `buildTemplateMap` | const | 26:7
- `runtimeCatalog` | let | 44:5
- `runtimeMap` | let | 45:5
- `registerTemplateCatalog` | const | 47:14
- `templateMap` | const | 63:14
- `getTemplateConfig` | const | 65:14
- `getTemplatesByType` | const | 70:14
- `demoPreviewData` | const | 73:14

## src/lib/document-template-utils.ts

- `planKey` | const | 3:7
- `resolveDefaultTemplateId` | const | 10:14
- `key` | const | 16:9
- `id` | const | 17:9
- `filterTemplatesForPlan` | const | 21:14
- `key` | const | 27:9
- `filteredByType` | const | 28:9
- `allowedIds` | const | 33:9
- `allowedSet` | const | 35:9

## src/lib/db.ts

- `db` | const | 2:14

## src/lib/fonts.ts

- `montserratRegular` | const | 7:14
- `montserratBold` | const | 10:14

## src/lib/item-type-classifier.ts

- `ITEM_TYPES` | const | 1:14
- `CABLE_SUPPORT_KEYWORDS` | const | 5:7
- `CABLE_KEYWORDS` | const | 28:7
- `CABLE_ABBREVIATION_REGEX` | const | 38:7
- `CABLE_SECTION_REGEX` | const | 41:7
- `CABLE_PAIRS_REGEX` | const | 44:7
- `CONSUMABLE_KEYWORDS` | const | 46:7
- `DEVICE_KEYWORDS` | const | 72:7
- `METER_UNITS` | const | 97:7
- `DEVICE_UNITS` | const | 98:7
- `normalize` | const | 100:7
- `includesAny` | const | 108:7
- `hasCableSignal` | const | 111:7
- `lowerName` | const | 120:9
- `normalizedName` | const | 121:9
- `normalizedUnit` | const | 122:9

## src/lib/logger.ts

- `logUserAction` | const | 61:14
- `error` | const | 69:12
- `MAX_LOG_JSON_CHARS` | const | 92:7
- `MAX_LOG_STRING_CHARS` | const | 93:7
- `truncateString` | const | 95:7
- `safeJsonPayload` | const | 100:7
- `json` | const | 103:11
- `error` | const | 110:12
- `sanitizeDetails` | const | 118:7
- `safeDetails` | const | 120:9
- `logAiApiCall` | const | 127:14
- `safeDetails` | const | 129:15
- `safeRawResponse` | const | 130:15
- `error` | const | 146:14
- `MAX_EVENT_JSON_CHARS` | const | 192:7
- `sanitizeLogPayload` | const | 194:7
- `serializeError` | const | 196:7
- `logProjectEvent` | const | 212:14
- `{
    projectId,
    userId,
    jobId,
    action,
    stage,
    status = 'info',
    message,
    source = 'server',
    model,
    tags,
    file,
    metadata,
    request,
    response,
    error,
    durationMs,
    correlationId,
  }` | const | 213:9
- `err` | const | 261:12

## src/lib/mailer.ts

- `settings` | const | 16:9
- `enabled` | const | 17:9
- `host` | const | 19:9
- `port` | const | 20:9
- `secure` | const | 21:9
- `user` | const | 22:9
- `pass` | const | 23:9
- `from` | const | 24:9
- `config` | const | 38:9
- `config` | const | 43:9
- `config` | const | 48:9

## src/lib/db-client.ts

- `isServer` | const | 43:7
- `collectionName` | const | 51:11
- `docId` | const | 52:11
- `docId` | const | 58:9
- `filters` | const | 75:9
- `orderByClauses` | const | 76:9
- `limitValue` | let | 77:7
- `{ _id, ...rest }` | const | 111:9
- `exists` | const | 116:9
- `docSnapshots` | const | 126:9
- `res` | const | 142:9
- `errorText` | const | 149:11
- `data` | const | 159:9
- `data` | const | 168:11
- `queryRef` | const | 171:9
- `data` | const | 172:9
- `result` | const | 180:9
- `isDoc` | const | 222:9
- `descriptor` | const | 223:9
- `fetchSnapshot` | const | 233:9
- `res` | const | 235:13
- `payload` | const | 244:13
- `error` | const | 250:14
- `realtimeMode` | const | 255:9
- `intervalMs` | const | 262:11
- `intervalId` | const | 264:11
- `url` | const | 268:9
- `eventSource` | const | 281:9

## src/lib/db-server.ts

- `collectionName` | const | 55:11
- `docId` | const | 56:11
- `docId` | const | 62:9
- `filters` | const | 79:9
- `orderByClauses` | const | 80:9
- `limitValue` | let | 81:7
- `{ _id, ...rest }` | const | 122:9
- `mongoFilter` | const | 127:9
- `filter` | const | 128:14
- `value` | const | 129:11
- `set` | const | 160:9
- `inc` | const | 161:9
- `addToSet` | const | 162:9
- `update` | const | 176:9
- `exists` | const | 191:9
- `docSnapshots` | const | 201:9
- `db` | const | 217:9
- `filter` | const | 218:9
- `cursor` | const | 219:9
- `sort` | const | 221:11
- `docs` | const | 230:9
- `db` | const | 235:9
- `doc` | const | 236:9
- `queryRef` | const | 248:9
- `db` | const | 253:9
- `docId` | const | 254:9
- `db` | const | 260:9
- `update` | const | 262:11
- `db` | const | 270:9
- `update` | const | 271:9
- `db` | const | 276:9
- `client` | const | 281:9
- `dbName` | const | 282:9
- `db` | const | 286:9
- `session` | const | 287:9
- `runWithoutTransaction` | const | 288:9
- `transaction` | const | 289:11
- `doc` | const | 291:15
- `update` | const | 295:15
- `update` | const | 300:17
- `isTransactionUnsupported` | const | 312:9
- `message` | const | 313:11
- `transaction` | const | 318:13
- `doc` | const | 320:17
- `update` | const | 324:17
- `update` | const | 329:19
- `error` | const | 341:12
- `ops` | const | 353:9
- `db` | const | 365:13
- `opsByCollection` | const | 366:13
- `list` | const | 368:15
- `[collectionName, collectionOps]` | const | 373:18
- `bulkOps` | const | 374:15

## src/lib/mongodb.ts

- `mongoUri` | const | 3:7
- `mongoDbName` | const | 4:7
- `_mongoClientPromise` | var | 16:7
- `clientPromise` | const | 19:7
- `client` | const | 32:9

## src/lib/plan-models.ts

- `modelMap` | const | 14:7
- `sanitizeList` | const | 16:7
- `unique` | const | 18:9
- `normalizePlanKey` | const | 27:7
- `getFallbackModelId` | const | 41:7
- `getPlanModelConfig` | const | 49:14
- `planKey` | const | 50:9
- `rawConfig` | const | 51:9
- `defaultModel` | const | 52:9
- `getPlanModelIds` | const | 60:14
- `config` | const | 61:9
- `isBusiness` | const | 62:9
- `candidates` | let | 63:7
- `fallback` | const | 80:11
- `getPlanDefaultModelId` | const | 87:14
- `config` | const | 88:9
- `fallback` | const | 89:9
- `resolvePlanModelId` | const | 98:14
- `candidates` | const | 99:9
- `config` | const | 103:9
- `getPlanAbTestModels` | const | 110:14
- `config` | const | 112:9
- `getPlanModelOptions` | const | 116:14
- `getModelLabel` | const | 122:14

## src/lib/plan-utils.ts

- `PLAN_ORDER` | const | 4:14
- `getNextPlan` | const | 6:14
- `index` | const | 7:9
- `getPlanLabel` | const | 12:14

## src/lib/pwa-helpers.ts

- `DB_NAME` | const | 3:7
- `DB_VERSION` | const | 4:7
- `PENDING_FILES_STORE` | const | 5:7
- `request` | const | 9:11
- `db` | const | 21:9
- `transaction` | const | 23:11
- `store` | const | 24:11
- `getAllRequest` | const | 26:11
- `results` | const | 29:13
- `db` | const | 46:9
- `transaction` | const | 48:11
- `store` | const | 49:11
- `request` | const | 50:11

## src/lib/server-analysis-stages.ts

- `SERVER_STAGE_ORDER` | const | 17:14
- `SERVER_STAGE_LABELS` | const | 31:14

## src/lib/template-utils.ts

- `CUSTOM_TEMPLATE_PREFIX` | const | 23:14
- `isCustomTemplateId` | const | 25:14
- `getTemplateLimitForPlan` | const | 28:14
- `isTemplateConstructorAvailable` | const | 41:14
- `normalizeHexColor` | const | 43:14
- `trimmed` | const | 45:9

## src/lib/utils.ts

- `unit` | const | 17:11
- `itemType` | const | 18:11
- `status` | const | 21:11
- `getFileSha1` | const | 39:14
- `buffer` | const | 40:11
- `hashBuffer` | const | 41:11
- `hashArray` | const | 42:11
- `parts` | const | 47:11
- `mimeMatch` | const | 49:11

## src/server-functions/admin/actions.ts

- `jobsRef` | const | 11:9
- `jobsQuery` | const | 12:9
- `snapshot` | const | 13:9
- `job` | const | 22:9
- `result` | const | 28:9
- `message` | const | 30:9
- `jobsRef` | const | 37:9
- `jobsQuery` | const | 38:9
- `snapshot` | const | 39:9
- `count` | let | 40:7
- `docSnap` | const | 41:14

## src/server-functions/analysis/jobRunner.ts

- `prompt` | const | 21:9
- `cacheRef` | const | 29:9
- `cacheSnap` | const | 30:9
- `data` | const | 32:9
- `cacheRef` | const | 39:9
- `cacheSnap` | const | 40:9
- `aiResult` | const | 61:9
- `parsed` | let | 74:7
- `match` | const | 79:13
- `validation` | const | 90:9
- `job` | const | 98:9
- `lastStage` | let | 103:7
- `setStage` | const | 104:9
- `ensureNotCancelled` | const | 114:9
- `latest` | const | 115:11
- `err` | const | 117:13
- `cached` | const | 162:11
- `projectId` | const | 178:13
- `promptText` | const | 215:11
- `aiOutput` | const | 216:11
- `projectId` | const | 237:11
- `error` | const | 254:12
- `message` | const | 255:11
- `status` | const | 256:11
- `fallbackStage` | const | 259:11
- `stageLabel` | const | 278:13
- `fileUri` | const | 279:13
- `hydratedItems` | const | 296:9
- `finalizeResult` | const | 298:9
- `title` | const | 324:11
- `content` | const | 325:11
- `e` | const | 338:12

## src/server-functions/analysis/jobService.ts

- `collectionRef` | const | 10:9
- `jobRef` | const | 11:9
- `jobData` | const | 13:9
- `jobRef` | const | 41:9
- `snap` | const | 42:9
- `jobRef` | const | 48:9
- `jobRef` | const | 60:9
- `jobsRef` | const | 69:9
- `q` | const | 70:9
- `snapshot` | const | 71:9

## src/server-functions/analysis/types.ts

- None

## src/server-functions/analysis/worker.ts

- `jobs` | const | 14:9
- `errors` | const | 19:9
- `jobIds` | const | 20:9
- `job` | const | 21:14
- `error` | const | 25:14

## src/server-functions/config.ts

- `SERVER_ANALYSIS_COLLECTION` | const | 4:14
- `SERVER_ANALYSIS_CREDIT_COST` | const | 5:14
- `DEFAULT_SERVER_QUOTE_CONFIG` | const | 30:14

## src/server-functions/monitoring/health.ts

- `readEnvSettings` | const | 31:7
- `snap` | const | 32:9
- `toIso` | const | 36:7
- `date` | const | 39:9
- `jobsRef` | const | 44:9
- `queuedQuery` | const | 45:9
- `snapshot` | const | 46:9
- `oldest` | const | 47:9
- `successQuery` | const | 48:9
- `successSnap` | const | 49:9
- `lastSuccessDoc` | const | 50:9
- `settings` | const | 61:9
- `enabled` | const | 62:9
- `mode` | const | 63:9
- `token` | const | 64:9
- `latencyMs` | let | 65:7
- `latencyError` | let | 66:7
- `start` | const | 68:11
- `bot` | const | 70:13
- `err` | const | 73:14
- `runtime` | let | 77:7
- `[queue, telegram]` | const | 98:9

## src/server-functions/notifications/dispatch.ts

- `channels` | const | 38:9
- `inAppId` | let | 39:7
- `notifRef` | const | 41:11
- `telegramResult` | let | 55:7
- `message` | const | 57:11

## src/server-functions/notifications/telegram.ts

- `sendBot` | let | 28:5
- `sendBotToken` | let | 29:5
- `getSendBot` | const | 31:7
- `env` | const | 32:9
- `token` | const | 33:9
- `resolveChatId` | const | 45:7
- `userRef` | const | 48:9
- `userSnap` | const | 49:9
- `chatId` | const | 51:9
- `checkCooldown` | const | 55:7
- `limitRef` | const | 56:9
- `limitSnap` | const | 57:9
- `lastSentAt` | const | 59:9
- `lastDate` | const | 60:9
- `saveCooldown` | const | 65:7
- `limitRef` | const | 66:9
- `checkIdempotency` | const | 70:7
- `dispatchRef` | const | 71:9
- `dispatchSnap` | const | 72:9
- `writeDispatchLog` | const | 77:7
- `dispatchRef` | const | 78:9
- `chatId` | const | 87:9
- `existing` | const | 93:11
- `cooldownSeconds` | const | 99:9
- `rateKey` | const | 100:9
- `limited` | const | 102:11
- `bot` | const | 118:11
- `response` | const | 119:11
- `error` | const | 138:12

## src/server-functions/telegram/bot.ts

- `readEnvSettings` | const | 8:7
- `snap` | const | 9:9
- `parseStartPayload` | const | 18:7
- `text` | const | 19:9
- `parts` | const | 20:9
- `payload` | const | 21:9
- `refMatch` | const | 23:9
- `resolveWebAppUrl` | const | 30:7
- `envUrl` | const | 31:9
- `findUserByChatId` | const | 40:7
- `q` | const | 41:9
- `snap` | const | 42:9
- `docSnap` | const | 44:9
- `webhookBot` | let | 48:5
- `webhookBotToken` | let | 49:5
- `ensureBotToken` | const | 51:7
- `envSettings` | const | 52:9
- `token` | const | 53:9
- `registerHandlers` | const | 60:7
- `webAppUrl` | const | 61:9
- `saveChat` | const | 63:9
- `chatId` | const | 64:11
- `userId` | const | 65:11
- `isPremium` | const | 66:11
- `chatRef` | const | 67:11
- `existing` | const | 68:11
- `base` | const | 69:11
- `userRef` | const | 87:13
- `sendWelcome` | const | 98:9
- `keyboard` | const | 99:11
- `sendProfile` | const | 112:9
- `user` | const | 113:11
- `credits` | const | 118:11
- `plan` | const | 119:11
- `username` | const | 120:11
- `sendHistory` | const | 128:9
- `user` | const | 129:11
- `sendNew` | const | 141:9
- `sendHelp` | const | 149:9
- `sendPay` | const | 156:9
- `sendPing` | const | 164:9
- `payload` | const | 169:11
- `err` | const | 172:14
- `err` | const | 214:14
- `description` | const | 220:11
- `token` | const | 226:9
- `bot` | const | 227:9
- `getWebhookBot` | const | 232:7
- `token` | const | 233:9
- `bot` | const | 237:9
- `bot` | const | 245:9

## src/server-functions/telegram/controller.ts

- `readEnvSettings` | const | 9:7
- `snap` | const | 10:9
- `runtime` | const | 42:7
- `getLockRef` | const | 50:7
- `instanceId` | const | 51:7
- `lockPayload` | const | 53:7
- `refreshLock` | const | 59:7
- `readLock` | const | 63:7
- `snap` | const | 64:9
- `isLockFresh` | const | 68:7
- `lastHeartbeat` | const | 69:9
- `acquireLock` | const | 73:7
- `lockData` | const | 74:9
- `releaseLock` | const | 81:7
- `lockData` | const | 83:11
- `log` | const | 92:7
- `entry` | const | 93:9
- `toSafeRuntime` | const | 99:7
- `lockData` | const | 111:11
- `payload` | const | 112:11
- `settings` | const | 125:9
- `mode` | const | 131:9
- `lockData` | const | 139:11
- `payload` | const | 142:13
- `bot` | const | 155:11
- `errorCode` | const | 164:13
- `description` | const | 165:13
- `payload` | const | 173:11
- `newLock` | const | 174:11
- `err` | const | 186:12
- `e` | const | 198:14
- `payload` | const | 211:9
- `lockData` | const | 212:9
- `payload` | const | 240:9
- `lockData` | const | 241:9

## src/server-functions/webhooks/telegram.ts

- `readEnvSettings` | const | 16:7
- `snap` | const | 17:9
- `resolveWebhookToken` | const | 21:7
- `settings` | const | 22:9
- `settings` | const | 27:9
- `expected` | const | 28:9
- `settings` | const | 39:9
- `token` | const | 43:9
- `webhookUrl` | const | 47:9
- `secretToken` | const | 51:9
- `bot` | const | 53:9
- `token` | const | 59:9
- `bot` | const | 63:9

## src/services/ai.ts

- `getDefaultModel` | const | 9:14
- `model` | const | 10:11
- `getVoiceModel` | const | 14:14
- `model` | const | 15:11
- `finalModelId` | const | 34:11
- `modelInfo` | const | 35:11
- `providerInfo` | const | 37:11
- `processedPrompt` | let | 39:9
- `itemsString` | const | 41:15
- `groupedItemsString` | const | 45:15
- `analysisDetailsString` | const | 49:15
- `quoteConfigString` | const | 53:15
- `calculatorInputsString` | const | 57:15
- `requestDetails` | const | 67:11
- `finalParams` | const | 74:11
- `openRouterResult` | const | 76:11
- `result` | const | 77:11
- `finalModelId` | const | 97:12
- `providerInfo` | const | 98:12
- `modelInfo` | const | 99:12

## src/services/credits.ts

- `DEFAULT_BONUS_DAYS` | const | 22:7
- `DEFAULT_PURCHASED_DAYS` | const | 23:7
- `isTransactionUnsupported` | const | 25:7
- `message` | const | 26:9
- `addDays` | const | 30:7
- `withSession` | const | 32:7
- `existingLots` | const | 35:9
- `user` | const | 40:9
- `legacyBonus` | const | 43:9
- `total` | const | 44:9
- `purchased` | const | 45:9
- `now` | const | 48:9
- `docs` | const | 49:9
- `client` | const | 82:9
- `dbName` | const | 83:9
- `db` | const | 87:9
- `session` | const | 88:9
- `runWithoutTransaction` | const | 90:9
- `error` | const | 94:12
- `lots` | const | 106:9
- `bonusLots` | const | 111:9
- `purchasedLots` | const | 112:9
- `sumRemaining` | const | 114:9
- `minExpiry` | const | 115:9
- `dates` | const | 116:11
- `bonus` | const | 123:9
- `purchased` | const | 124:9
- `summary` | const | 125:9
- `now` | const | 153:9
- `expiredLots` | const | 154:9
- `ledgerEntries` | const | 163:9
- `lot` | const | 164:14
- `remaining` | const | 165:11
- `db` | const | 204:9
- `user` | const | 205:9
- `{ userId, amount, type, expiresAt, source, metadata }` | const | 223:9
- `{ userId, amount, type, expiresAt, source, metadata }` | const | 243:9
- `now` | const | 244:9
- `finalExpiry` | const | 245:9
- `lotId` | const | 246:9
- `summary` | const | 276:9
- `{ userId, amount, reason, metadata }` | const | 286:9
- `{ userId, amount, reason, metadata }` | const | 304:9
- `bonusLots` | const | 308:9
- `purchasedLots` | const | 313:9
- `remainingToDeduct` | let | 319:7
- `ledgerEntries` | const | 320:9
- `now` | const | 321:9
- `processLot` | const | 323:9
- `available` | const | 325:11
- `used` | const | 327:11
- `lot` | const | 346:14
- `lot` | const | 351:16
- `summary` | const | 365:9
- `{ userId, amount, reason, originalDebitId, metadata }` | const | 376:9
- `{ userId, amount, reason, originalDebitId, metadata }` | const | 395:9
- `now` | const | 396:9
- `targetLot` | let | 397:7
- `targetType` | let | 398:7
- `originalDebit` | const | 401:11
- `lot` | const | 405:13
- `lotId` | let | 415:7
- `expiresAt` | const | 423:11
- `summary` | const | 455:9
- `{ userId, lotId, reason, metadata }` | const | 465:9
- `lot` | const | 471:11
- `remaining` | const | 478:11
- `now` | const | 483:11
- `db` | const | 510:9

## src/services/docxGenerator.ts

- `generateDocx` | const | 30:14
- `tpl` | const | 42:11
- `resolved` | const | 43:11
- `accentColor` | const | 44:11
- `isModern` | const | 45:11
- `styles` | const | 47:11
- `headerChildren` | const | 81:11
- `showMaterials` | const | 120:11
- `colHeaders` | const | 122:11
- `colWidths` | let | 123:9
- `tableHeader` | const | 134:11
- `tableRows` | const | 142:11
- `fullName` | const | 152:15
- `rowCells` | const | 153:15
- `qtyInstall` | const | 159:15
- `priceInstall` | const | 160:15
- `sumInstall` | const | 161:15
- `itemTotal` | const | 162:15
- `qtyMaterial` | const | 165:19
- `priceMaterial` | const | 166:19
- `sumMaterial` | const | 167:19
- `emptyRow` | const | 190:11
- `createTotalRow` | const | 191:11
- `totalsRows` | const | 203:11
- `table` | const | 217:11
- `doc` | const | 226:11

## src/services/excelGenerator.ts

- `ws_data` | let | 24:9
- `colHeaders` | const | 38:11
- `tableStartRow` | const | 44:11
- `fullName` | const | 48:15
- `headerRow` | const | 52:19
- `row` | const | 58:19
- `qtyInstall` | const | 60:19
- `priceInstall` | const | 61:19
- `qtyMaterial` | const | 62:19
- `priceMaterial` | const | 63:19
- `materialSumRef` | const | 70:19
- `installSumRef` | const | 71:19
- `currentRow` | let | 78:9
- `totalColIndex` | const | 81:11
- `labelColIndex` | const | 82:11
- `itemsTotalRow` | const | 84:11
- `servicesRow` | const | 92:15
- `subtotalRow` | const | 99:11
- `taxRow` | const | 106:15
- `finalTotalRow` | const | 113:11
- `ws` | const | 118:11
- `cell` | const | 130:20
- `c` | let | 133:22
- `cell` | const | 134:24
- `labelCell` | const | 144:19
- `valueCell` | const | 147:19
- `generateExcel` | const | 160:14
- `wb` | const | 161:11
- `ws` | const | 162:11
- `wbout` | const | 164:11
- `generateObjectSummaryExcel` | const | 169:14
- `wb` | const | 170:11
- `summary_data` | const | 173:11
- `totalObjectSum` | let | 178:9
- `projectTotals` | const | 180:11
- `totals` | const | 181:15
- `totalRow` | const | 194:11
- `summary_ws` | const | 197:11
- `totalRowNum` | const | 200:11
- `totalCell` | const | 202:11
- `project` | const | 211:16
- `projectTotalsFull` | const | 213:20
- `paramsForSheet` | const | 215:20
- `ws` | const | 222:20
- `sheetName` | let | 224:18
- `wbout` | const | 229:11

## src/services/openrouter.ts

- `envSettings` | const | 46:11
- `apiKey` | const | 47:11
- `apiKey` | const | 62:15
- `response` | const | 63:15
- `errorBody` | const | 69:19
- `data` | const | 72:15
- `error` | const | 74:14
- `apiKey` | const | 96:11
- `headers` | const | 98:11
- `body` | const | 105:11
- `userContent` | const | 111:11
- `response` | const | 137:11
- `requestId` | const | 139:11
- `contentType` | const | 140:11
- `errorBody` | const | 143:15
- `errorMessage` | const | 144:15
- `expectedStreamType` | const | 148:11
- `isStreamCorrect` | const | 149:11
- `errorBody` | const | 152:15
- `errorMessage` | const | 153:15
- `providerPriority` | const | 164:11
- `modelOverride` | const | 165:11
- `engineFromParam` | const | 166:11
- `resolvedEngine` | const | 167:11
- `error` | const | 175:14
- `errorStream` | const | 177:15
- `{ userId = 'anonymous', modelInfo }` | const | 194:11
- `providerPriority` | const | 195:11
- `modelOverride` | const | 196:11
- `engineFromParam` | const | 197:11
- `resolvedEngine` | const | 199:11
- `processResponse` | const | 205:11
- `rawResponse` | const | 206:15
- `responseText` | const | 207:15
- `response` | const | 227:15
- `error` | const | 229:14

## tailwind.config.ts

- None

## tests/api-health.test.ts

- `response` | const | 11:11
- `json` | const | 12:11

## tests/api-server-analysis.test.ts

- `getDocMock` | const | 3:7
- `getCreditSummaryMock` | const | 4:7
- `createJobMock` | const | 5:7
- `runJobMock` | const | 6:7
- `basePayload` | const | 36:7
- `response` | const | 58:11
- `json` | const | 62:11
- `response` | const | 74:11
- `json` | const | 78:11

## tests/credits.test.ts

- `normalizeValue` | const | 19:7
- `[key, condition]` | const | 22:14
- `value` | const | 23:11
- `[field, direction]` | const | 66:11
- `multiplier` | const | 67:11
- `av` | const | 69:13
- `bv` | const | 70:13
- `items` | const | 85:11
- `doc` | const | 104:11
- `[key, value]` | const | 110:18
- `createContext` | const | 129:7
- `db` | const | 130:9
- `ctx` | const | 131:9
- `addDays` | const | 135:7
- `ctx` | let | 138:7
- `db` | let | 139:7
- `setup` | const | 142:11
- `result` | const | 149:11
- `user` | const | 150:11
- `lots` | const | 151:11
- `ledger` | const | 152:11
- `now` | const | 163:11
- `bonusLot` | const | 173:11
- `firstPurchased` | const | 174:11
- `secondPurchased` | const | 175:11
- `now` | const | 184:11
- `result` | const | 190:11
- `expiredLot` | const | 191:11
- `ledger` | const | 192:11
- `now` | const | 201:11
- `lot` | const | 222:11

## tests/e2e/flows.spec.ts

- `baseURL` | const | 3:7
- `userEmail` | const | 4:7
- `userPassword` | const | 5:7
- `shouldRun` | const | 7:7
- `shouldRunAuthenticated` | const | 8:7
- `login` | const | 23:9

## vitest.config.ts

- None

