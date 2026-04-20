# Inventario global window (F0/F1)

- Fecha: 10 de marzo de 2026
- Metodo: escaneo estatico de *.js y *.html (excluye dist/ y node_modules/) + revision manual de modulos criticos.
- Total entradas detectadas: 334
- Archivo fuente machine-readable: docs/migration/global-window-inventory.csv

## Resumen ejecutivo

- Contrato global legacy altamente acoplado por window.* (334 entradas detectadas).
- Se confirma dependencia critica en auth/guards, limites de plan, onboarding y documentos (facturas/presupuestos).
- En F1 se introduce namespace de transicion window.facturalesServices.* para aislar consumo futuro sin romper el legado.

## Inventario exhaustivo

| Simbolo en window | Origen | Consumidores detectados | Criticidad | Sustitucion propuesta |
|---|---|---|---|---|
| __confirmEmailParams | C:\FacturalesNuevo\confirm-email.html:146 | C:\FacturalesNuevo\confirm-email.html:1 | Media | Encapsular en modulo de feature y retirar del contrato global en F10. |
| _chartScaleK | C:\FacturalesNuevo\index.html:1281 | C:\FacturalesNuevo\index.html:3 | Media | Encapsular en modulo de feature y retirar del contrato global en F10. |
| _chartScaleK | C:\FacturalesNuevo\index.html:1285 | C:\FacturalesNuevo\index.html:3 | Media | Encapsular en modulo de feature y retirar del contrato global en F10. |
| _currentIncomeGoal | C:\FacturalesNuevo\index.html:2595 | - | Baja | Encapsular en modulo de feature y retirar del contrato global en F10. |
| _customFormatStr | C:\FacturalesNuevo\complete-profile.html:1049 | C:\FacturalesNuevo\complete-profile.html:2 | Media | Encapsular en modulo de feature y retirar del contrato global en F10. |
| _goals | C:\FacturalesNuevo\index.html:2431 | C:\FacturalesNuevo\index.html:4 | Media | Encapsular en modulo de feature y retirar del contrato global en F10. |
| _goals | C:\FacturalesNuevo\index.html:2594 | C:\FacturalesNuevo\index.html:4 | Media | Encapsular en modulo de feature y retirar del contrato global en F10. |
| _isResultadoContable | C:\FacturalesNuevo\assets\js\fiscal-page.js:321 | C:\FacturalesNuevo\assets\js\fiscal-page.js:1 | Media | Encapsular en modulo de feature y retirar del contrato global en F10. |
| _productosPage | C:\FacturalesNuevo\assets\js\productos-page.js:502 | C:\FacturalesNuevo\productos.html:5, C:\FacturalesNuevo\assets\js\productos-page.js:5 | Alta | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| _subStatus | C:\FacturalesNuevo\settings.html:5336 | - | Baja | Encapsular en modulo de feature y retirar del contrato global en F10. |
| _userInterval | C:\FacturalesNuevo\settings.html:5335 | - | Baja | Encapsular en modulo de feature y retirar del contrato global en F10. |
| _userPlan | C:\FacturalesNuevo\settings.html:5334 | C:\FacturalesNuevo\settings.html:3 | Alta | Mover a src/services/billing-limits y servicio de suscripcion; quitar acoplamiento UI. |
| addPaymentMethod | C:\FacturalesNuevo\assets\js\invoice.js:430 | - | Baja | Encapsular en modulo de feature y retirar del contrato global en F10. |
| applyCategoryFilter | C:\FacturalesNuevo\assets\js\expenses-page.js:1193 | - | Baja | Mantener en legacy durante F1; migrar a handlers locales React por feature (F3+). |
| applyContactCityFilter | C:\FacturalesNuevo\index.html:1955 | - | Baja | Mantener en legacy durante F1; migrar a handlers locales React por feature (F3+). |
| applyContactPriceFilter | C:\FacturalesNuevo\index.html:1982 | - | Baja | Mantener en legacy durante F1; migrar a handlers locales React por feature (F3+). |
| applyContactStatusFilter | C:\FacturalesNuevo\index.html:1966 | - | Baja | Mantener en legacy durante F1; migrar a handlers locales React por feature (F3+). |
| applyDateFilter | C:\FacturalesNuevo\assets\js\expenses-page.js:1206 | - | Baja | Mantener en legacy durante F1; migrar a handlers locales React por feature (F3+). |
| applyFilters | C:\FacturalesNuevo\assets\js\expenses-page.js:1188 | - | Baja | Mantener en legacy durante F1; migrar a handlers locales React por feature (F3+). |
| applyInvoiceDefaults | C:\FacturalesNuevo\assets\js\invoice-defaults.js:345 | - | Alta | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| applyPriceFilter | C:\FacturalesNuevo\assets\js\expenses-page.js:1204 | - | Baja | Mantener en legacy durante F1; migrar a handlers locales React por feature (F3+). |
| auth | C:\FacturalesNuevo\assets\js\auth.js:447 | C:\FacturalesNuevo\assets\js\auth-guard.js:1 | Critica | Mover a src/services/supabase y src/services/auth; consumo por inyeccion de dependencias. |
| authGuard | C:\FacturalesNuevo\assets\js\auth-guard.js:271 | - | Critica | Mover a src/services/supabase y src/services/auth; consumo por inyeccion de dependencias. |
| businessInfo | C:\FacturalesNuevo\assets\js\businessInfo.js:252 | - | Baja | Encapsular en modulo de feature y retirar del contrato global en F10. |
| calculateProgress | C:\FacturalesNuevo\assets\js\onboardingProgress.js:535 | - | Baja | Mover a src/services/onboarding; exponer solo contratos de dominio. |
| cancelSubscription | C:\FacturalesNuevo\settings.html:4979 | - | Alta | Mover a src/services/billing-limits y servicio de suscripcion; quitar acoplamiento UI. |
| checkAuth | C:\FacturalesNuevo\assets\js\auth.js:470 | C:\FacturalesNuevo\signin.html:2, C:\FacturalesNuevo\signup.html:2, C:\FacturalesNuevo\assets\js\auth-guard.js:1, ... | Critica | Mover a src/services/supabase y src/services/auth; consumo por inyeccion de dependencias. |
| checkAuth | C:\FacturalesNuevo\signin.html:873 | C:\FacturalesNuevo\signup.html:2, C:\FacturalesNuevo\signin.html:1, C:\FacturalesNuevo\assets\js\auth-guard.js:1, ... | Critica | Mover a src/services/supabase y src/services/auth; consumo por inyeccion de dependencias. |
| checkAuth | C:\FacturalesNuevo\signup.html:579 | C:\FacturalesNuevo\signin.html:2, C:\FacturalesNuevo\signup.html:1, C:\FacturalesNuevo\assets\js\checkBusinessInfo.js:1, ... | Critica | Mover a src/services/supabase y src/services/auth; consumo por inyeccion de dependencias. |
| checkAuthOnly | C:\FacturalesNuevo\assets\js\checkBusinessInfo.js:80 | - | Alta | Mover a src/services/supabase y src/services/auth; consumo por inyeccion de dependencias. |
| checkBusinessInfoComplete | C:\FacturalesNuevo\assets\js\checkBusinessInfo.js:79 | C:\FacturalesNuevo\scan-ocr.html:1, C:\FacturalesNuevo\index.html:1, C:\FacturalesNuevo\expenses.html:1 | Critica | Encapsular en modulo de feature y retirar del contrato global en F10. |
| checkNifCifExists | C:\FacturalesNuevo\assets\js\businessInfo.js:267 | - | Baja | Encapsular en modulo de feature y retirar del contrato global en F10. |
| checkUserHasClients | C:\FacturalesNuevo\assets\js\onboardingProgress.js:532 | - | Alta | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| checkUserHasCustomizedInvoice | C:\FacturalesNuevo\assets\js\onboardingProgress.js:533 | - | Alta | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| checkUserHasIssuedInvoice | C:\FacturalesNuevo\assets\js\onboardingProgress.js:534 | - | Alta | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| clearBulkSelection | C:\FacturalesNuevo\assets\js\expenses-page.js:1218 | - | Baja | Encapsular en modulo de feature y retirar del contrato global en F10. |
| clearFilters | C:\FacturalesNuevo\assets\js\expenses-page.js:1189 | - | Baja | Encapsular en modulo de feature y retirar del contrato global en F10. |
| clearInvoiceDefaults | C:\FacturalesNuevo\assets\js\invoice-defaults.js:346 | - | Alta | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| ClienteModal | C:\FacturalesNuevo\assets\js\modal-cliente.js:569 | - | Alta | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| clientsUtils | C:\FacturalesNuevo\assets\js\clients.js:580 | - | Alta | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| closeAllFilterDropdowns | C:\FacturalesNuevo\assets\js\expenses-page.js:1190 | - | Baja | Mantener en legacy durante F1; migrar a handlers locales React por feature (F3+). |
| closeBulkDeleteModal | C:\FacturalesNuevo\assets\js\expenses-page.js:1219 | C:\FacturalesNuevo\assets\js\users-page.js:1 | Media | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| closeBulkDeleteModal | C:\FacturalesNuevo\assets\js\users-page.js:1072 | C:\FacturalesNuevo\assets\js\expenses-page.js:1 | Media | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| closeCancelModal | C:\FacturalesNuevo\assets\js\issued-page.js:467 | C:\FacturalesNuevo\settings.html:1, C:\FacturalesNuevo\assets\js\quote-issued-page.js:1 | Media | Mantener en legacy durante F1; migrar a handlers locales React por feature (F3+). |
| closeCancelModal | C:\FacturalesNuevo\assets\js\quote-issued-page.js:465 | C:\FacturalesNuevo\settings.html:1, C:\FacturalesNuevo\assets\js\issued-page.js:1 | Media | Mantener en legacy durante F1; migrar a handlers locales React por feature (F3+). |
| closeCancelModal | C:\FacturalesNuevo\settings.html:4967 | C:\FacturalesNuevo\assets\js\quote-issued-page.js:1, C:\FacturalesNuevo\assets\js\issued-page.js:1 | Media | Mantener en legacy durante F1; migrar a handlers locales React por feature (F3+). |
| closeClientModal | C:\FacturalesNuevo\assets\js\users-page.js:1079 | - | Alta | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| closeCreateClientModal | C:\FacturalesNuevo\assets\js\invoice.js:425 | - | Alta | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| closeDeleteModal | C:\FacturalesNuevo\assets\js\drafts-page.js:319 | C:\FacturalesNuevo\assets\js\users-page.js:1, C:\FacturalesNuevo\assets\js\quote-drafts-page.js:1 | Media | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| closeDeleteModal | C:\FacturalesNuevo\assets\js\quote-drafts-page.js:319 | C:\FacturalesNuevo\assets\js\users-page.js:1, C:\FacturalesNuevo\assets\js\drafts-page.js:1 | Media | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| closeDeleteModal | C:\FacturalesNuevo\assets\js\users-page.js:1081 | C:\FacturalesNuevo\assets\js\quote-drafts-page.js:1, C:\FacturalesNuevo\assets\js\drafts-page.js:1 | Media | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| closeDeleteTransactionModal | C:\FacturalesNuevo\assets\js\expenses-page.js:1199 | - | Alta | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| closeExpenseModal | C:\FacturalesNuevo\assets\js\expenses-page.js:1181 | - | Baja | Mantener en legacy durante F1; migrar a handlers locales React por feature (F3+). |
| closeImportModal | C:\FacturalesNuevo\assets\js\users-page.js:1085 | - | Baja | Mantener en legacy durante F1; migrar a handlers locales React por feature (F3+). |
| closeInvoiceCreateClientModal | C:\FacturalesNuevo\assets\js\invoice-clients.js:326 | - | Alta | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| closePaymentMethodModal | C:\FacturalesNuevo\assets\js\invoice.js:428 | - | Baja | Mantener en legacy durante F1; migrar a handlers locales React por feature (F3+). |
| closePlanChangeModal | C:\FacturalesNuevo\subscribe.html:754 | - | Alta | Mover a src/services/billing-limits y servicio de suscripcion; quitar acoplamiento UI. |
| closePlanModal | C:\FacturalesNuevo\settings.html:4961 | - | Alta | Mover a src/services/billing-limits y servicio de suscripcion; quitar acoplamiento UI. |
| closeQuoteCreateClientModal | C:\FacturalesNuevo\assets\js\quote-clients.js:326 | - | Alta | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| closeRecoveryModal | C:\FacturalesNuevo\signin.html:929 | C:\FacturalesNuevo\signin.html:2 | Media | Mantener en legacy durante F1; migrar a handlers locales React por feature (F3+). |
| closeTeamDeleteModal | C:\FacturalesNuevo\settings.html:5843 | C:\FacturalesNuevo\settings.html:1 | Media | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| closeTeamUserModal | C:\FacturalesNuevo\settings.html:5798 | C:\FacturalesNuevo\settings.html:1 | Media | Mantener en legacy durante F1; migrar a handlers locales React por feature (F3+). |
| collectFormData | C:\FacturalesNuevo\assets\js\new-page.js:820 | C:\FacturalesNuevo\assets\js\quote-page.js:1 | Media | Encapsular en modulo de feature y retirar del contrato global en F10. |
| collectFormData | C:\FacturalesNuevo\assets\js\quote-page.js:926 | C:\FacturalesNuevo\assets\js\new-page.js:1 | Media | Encapsular en modulo de feature y retirar del contrato global en F10. |
| confirmBulkDelete | C:\FacturalesNuevo\assets\js\expenses-page.js:1220 | C:\FacturalesNuevo\assets\js\users-page.js:1 | Media | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| confirmBulkDelete | C:\FacturalesNuevo\assets\js\users-page.js:1073 | C:\FacturalesNuevo\assets\js\expenses-page.js:1 | Media | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| confirmCancelInvoice | C:\FacturalesNuevo\assets\js\issued-page.js:468 | - | Alta | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| confirmCancelQuote | C:\FacturalesNuevo\assets\js\quote-issued-page.js:466 | - | Alta | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| confirmDeleteClient | C:\FacturalesNuevo\assets\js\users-page.js:1082 | - | Alta | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| confirmDeleteDraft | C:\FacturalesNuevo\assets\js\drafts-page.js:320 | C:\FacturalesNuevo\assets\js\quote-drafts-page.js:1 | Media | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| confirmDeleteDraft | C:\FacturalesNuevo\assets\js\quote-drafts-page.js:320 | C:\FacturalesNuevo\assets\js\drafts-page.js:1 | Media | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| confirmDeleteTeamUser | C:\FacturalesNuevo\settings.html:5849 | - | Baja | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| confirmDeleteTransaction | C:\FacturalesNuevo\assets\js\expenses-page.js:1200 | - | Alta | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| confirmPlanChange | C:\FacturalesNuevo\subscribe.html:761 | - | Alta | Mover a src/services/billing-limits y servicio de suscripcion; quitar acoplamiento UI. |
| createClient | C:\FacturalesNuevo\assets\js\clients.js:391 | C:\FacturalesNuevo\assets\js\modal-cliente.js:1 | Alta | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| createInvoice | C:\FacturalesNuevo\assets\js\invoices.js:599 | C:\FacturalesNuevo\assets\js\new-page.js:4, C:\FacturalesNuevo\assets\js\invoices.js:1 | Critica | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| createQuote | C:\FacturalesNuevo\assets\js\quotes.js:505 | C:\FacturalesNuevo\assets\js\quote-page.js:8, C:\FacturalesNuevo\assets\js\quotes.js:1 | Critica | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| createSeries | C:\FacturalesNuevo\assets\js\invoice-series-db.js:184 | C:\FacturalesNuevo\settings.html:1, C:\FacturalesNuevo\invoices\quote.html:1, C:\FacturalesNuevo\invoices\new.html:1 | Media | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| createTransaction | C:\FacturalesNuevo\assets\js\transactions.js:510 | C:\FacturalesNuevo\assets\js\scan-ocr-page.js:2, C:\FacturalesNuevo\assets\js\expenses-page.js:1 | Critica | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| createUserProgress | C:\FacturalesNuevo\assets\js\onboardingProgress.js:530 | - | Baja | Mover a src/services/onboarding; exponer solo contratos de dominio. |
| csvImport | C:\FacturalesNuevo\assets\js\csv-import.js:279 | C:\FacturalesNuevo\assets\js\users-page.js:2 | Media | Encapsular en modulo de feature y retirar del contrato global en F10. |
| currentFinancePeriod | C:\FacturalesNuevo\index.html:2675 | C:\FacturalesNuevo\index.html:3 | Media | Encapsular en modulo de feature y retirar del contrato global en F10. |
| currentFinancePeriod | C:\FacturalesNuevo\index.html:2686 | C:\FacturalesNuevo\index.html:3 | Media | Encapsular en modulo de feature y retirar del contrato global en F10. |
| currentRevenueRange | C:\FacturalesNuevo\index.html:1418 | C:\FacturalesNuevo\index.html:2 | Media | Encapsular en modulo de feature y retirar del contrato global en F10. |
| currentRevenueRange | C:\FacturalesNuevo\index.html:1425 | C:\FacturalesNuevo\index.html:2 | Media | Encapsular en modulo de feature y retirar del contrato global en F10. |
| deleteBusinessInfo | C:\FacturalesNuevo\assets\js\businessInfo.js:265 | - | Baja | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| deleteClient | C:\FacturalesNuevo\assets\js\clients.js:395 | - | Alta | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| deleteInvoice | C:\FacturalesNuevo\assets\js\invoices.js:603 | C:\FacturalesNuevo\assets\js\issued-page.js:1 | Alta | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| deleteQuote | C:\FacturalesNuevo\assets\js\quotes.js:509 | C:\FacturalesNuevo\assets\js\quote-issued-page.js:1 | Alta | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| deleteSeriesDB | C:\FacturalesNuevo\assets\js\invoice-series-db.js:186 | C:\FacturalesNuevo\settings.html:1 | Media | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| deleteTransaction | C:\FacturalesNuevo\assets\js\transactions.js:514 | C:\FacturalesNuevo\assets\js\expenses-page.js:2 | Critica | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| editDraft | C:\FacturalesNuevo\assets\js\drafts-page.js:317 | C:\FacturalesNuevo\assets\js\quote-drafts-page.js:1 | Media | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| editDraft | C:\FacturalesNuevo\assets\js\quote-drafts-page.js:317 | C:\FacturalesNuevo\assets\js\drafts-page.js:1 | Media | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| editTeamUser | C:\FacturalesNuevo\settings.html:5803 | - | Baja | Encapsular en modulo de feature y retirar del contrato global en F10. |
| editTransaction | C:\FacturalesNuevo\assets\js\expenses-page.js:1196 | - | Alta | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| emitInvoice | C:\FacturalesNuevo\assets\js\invoices.js:606 | C:\FacturalesNuevo\invoices\preview.html:3 | Critica | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| emitQuote | C:\FacturalesNuevo\assets\js\quotes.js:512 | C:\FacturalesNuevo\invoices\quote-preview.html:3, C:\FacturalesNuevo\assets\js\quote-page.js:3 | Critica | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| emitQuoteDirectly | C:\FacturalesNuevo\assets\js\quote-page.js:924 | - | Alta | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| exportContactsCSV | C:\FacturalesNuevo\assets\js\users-page.js:1125 | - | Baja | Encapsular en modulo de feature y retirar del contrato global en F10. |
| exportFiscalZIP | C:\FacturalesNuevo\assets\js\fiscal-page.js:501 | C:\FacturalesNuevo\fiscal.html:1 | Media | Encapsular en modulo de feature y retirar del contrato global en F10. |
| filterClients | C:\FacturalesNuevo\assets\js\invoice.js:422 | - | Alta | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| fiscalCalc | C:\FacturalesNuevo\assets\js\fiscal-calc.js:231 | C:\FacturalesNuevo\assets\js\fiscal-page.js:20 | Alta | Encapsular en modulo de feature y retirar del contrato global en F10. |
| formatCurrency | C:\FacturalesNuevo\assets\js\invoices.js:609 | C:\FacturalesNuevo\assets\js\issued-page.js:1, C:\FacturalesNuevo\assets\js\transactions.js:1, C:\FacturalesNuevo\assets\js\drafts-page.js:1, ... | Media | Encapsular en modulo de feature y retirar del contrato global en F10. |
| formatCurrency | C:\FacturalesNuevo\assets\js\transactions.js:515 | C:\FacturalesNuevo\assets\js\invoices.js:1, C:\FacturalesNuevo\assets\js\issued-page.js:1, C:\FacturalesNuevo\assets\js\drafts-page.js:1, ... | Media | Encapsular en modulo de feature y retirar del contrato global en F10. |
| formatDate | C:\FacturalesNuevo\assets\js\invoices.js:608 | C:\FacturalesNuevo\assets\js\issued-page.js:2, C:\FacturalesNuevo\assets\js\drafts-page.js:2, C:\FacturalesNuevo\assets\js\transactions.js:1, ... | Alta | Encapsular en modulo de feature y retirar del contrato global en F10. |
| formatDate | C:\FacturalesNuevo\assets\js\transactions.js:516 | C:\FacturalesNuevo\assets\js\issued-page.js:2, C:\FacturalesNuevo\assets\js\drafts-page.js:2, C:\FacturalesNuevo\assets\js\expenses-page.js:1, ... | Alta | Encapsular en modulo de feature y retirar del contrato global en F10. |
| formatFullAddress | C:\FacturalesNuevo\assets\js\clients.js:398 | C:\FacturalesNuevo\index.html:1 | Media | Encapsular en modulo de feature y retirar del contrato global en F10. |
| formatInvoiceNumber | C:\FacturalesNuevo\assets\js\invoice-numbering.js:211 | C:\FacturalesNuevo\assets\js\invoices.js:1 | Alta | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| formatInvoiceNumber | C:\FacturalesNuevo\assets\js\invoices.js:607 | C:\FacturalesNuevo\assets\js\invoice-numbering.js:1 | Alta | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| formatQuoteCurrency | C:\FacturalesNuevo\assets\js\quotes.js:515 | C:\FacturalesNuevo\assets\js\quote-issued-page.js:1, C:\FacturalesNuevo\assets\js\quote-drafts-page.js:1 | Alta | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| formatQuoteDate | C:\FacturalesNuevo\assets\js\quotes.js:514 | C:\FacturalesNuevo\assets\js\quote-issued-page.js:2, C:\FacturalesNuevo\assets\js\quote-drafts-page.js:2 | Alta | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| formatQuoteNumber | C:\FacturalesNuevo\assets\js\quotes.js:513 | - | Alta | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| getBusinessInfo | C:\FacturalesNuevo\assets\js\businessInfo.js:263 | C:\FacturalesNuevo\assets\js\user-header.js:3, C:\FacturalesNuevo\invoices\quote.html:3, C:\FacturalesNuevo\invoices\new.html:3, ... | Alta | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| getBusinessInfo | C:\FacturalesNuevo\assets\js\user-header.js:76 | C:\FacturalesNuevo\invoices\quote.html:3, C:\FacturalesNuevo\settings.html:3, C:\FacturalesNuevo\invoices\new.html:3, ... | Alta | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| getBusinessInfo | C:\FacturalesNuevo\signin.html:742 | C:\FacturalesNuevo\assets\js\user-header.js:3, C:\FacturalesNuevo\settings.html:3, C:\FacturalesNuevo\invoices\quote.html:3, ... | Alta | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| getCategoryLabel | C:\FacturalesNuevo\assets\js\transactions.js:519 | C:\FacturalesNuevo\assets\js\expenses-page.js:1 | Media | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| getClientById | C:\FacturalesNuevo\assets\js\clients.js:393 | C:\FacturalesNuevo\assets\js\transactions.js:1, C:\FacturalesNuevo\assets\js\modal-cliente.js:1 | Alta | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| getClientName | C:\FacturalesNuevo\assets\js\transactions.js:517 | - | Alta | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| getClients | C:\FacturalesNuevo\assets\js\clients.js:392 | C:\FacturalesNuevo\index.html:2 | Alta | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| getCurrentSession | C:\FacturalesNuevo\assets\js\auth.js:469 | - | Critica | Mover a src/services/supabase y src/services/auth; consumo por inyeccion de dependencias. |
| getCurrentUser | C:\FacturalesNuevo\assets\js\auth.js:468 | C:\FacturalesNuevo\settings.html:7, C:\FacturalesNuevo\invoices\new.html:3, C:\FacturalesNuevo\invoices\quote.html:3, ... | Critica | Mover a src/services/supabase y src/services/auth; consumo por inyeccion de dependencias. |
| getInitials | C:\FacturalesNuevo\assets\js\clients.js:397 | C:\FacturalesNuevo\index.html:1, C:\FacturalesNuevo\assets\js\expenses-page.js:1 | Media | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| getInvoiceById | C:\FacturalesNuevo\assets\js\invoices.js:601 | C:\FacturalesNuevo\invoices\preview.html:3, C:\FacturalesNuevo\assets\js\new-page.js:3, C:\FacturalesNuevo\assets\js\invoices.js:1 | Alta | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| getInvoiceDefaults | C:\FacturalesNuevo\assets\js\invoice-defaults.js:343 | - | Alta | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| getInvoices | C:\FacturalesNuevo\assets\js\invoices.js:600 | C:\FacturalesNuevo\assets\js\issued-page.js:4, C:\FacturalesNuevo\assets\js\drafts-page.js:3, C:\FacturalesNuevo\assets\js\invoice-numbering.js:1 | Alta | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| getInvoiceSeriesStats | C:\FacturalesNuevo\assets\js\invoice-numbering.js:209 | - | Alta | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| getNextInvoiceNumber | C:\FacturalesNuevo\assets\js\invoice-numbering.js:208 | - | Alta | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| getQuoteById | C:\FacturalesNuevo\assets\js\quotes.js:507 | C:\FacturalesNuevo\invoices\quote-preview.html:3, C:\FacturalesNuevo\assets\js\quote-page.js:3, C:\FacturalesNuevo\assets\js\quotes.js:1 | Alta | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| getQuotes | C:\FacturalesNuevo\assets\js\quotes.js:506 | C:\FacturalesNuevo\assets\js\quote-issued-page.js:4, C:\FacturalesNuevo\assets\js\quote-drafts-page.js:3, C:\FacturalesNuevo\assets\js\quotes.js:1 | Alta | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| getQuoteStatusBadge | C:\FacturalesNuevo\assets\js\quotes.js:516 | - | Alta | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| getSelectedClientId | C:\FacturalesNuevo\assets\js\invoice-clients.js:328 | C:\FacturalesNuevo\assets\js\quote-page.js:2, C:\FacturalesNuevo\assets\js\new-page.js:2, C:\FacturalesNuevo\assets\js\quote-clients.js:1 | Alta | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| getSelectedClientId | C:\FacturalesNuevo\assets\js\new-page.js:563 | C:\FacturalesNuevo\assets\js\quote-page.js:2, C:\FacturalesNuevo\assets\js\invoice-clients.js:1, C:\FacturalesNuevo\assets\js\quote-clients.js:1, ... | Alta | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| getSelectedClientId | C:\FacturalesNuevo\assets\js\quote-clients.js:328 | C:\FacturalesNuevo\assets\js\quote-page.js:2, C:\FacturalesNuevo\assets\js\new-page.js:2, C:\FacturalesNuevo\assets\js\invoice-clients.js:1 | Alta | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| getSelectedClientId | C:\FacturalesNuevo\assets\js\quote-page.js:571 | C:\FacturalesNuevo\assets\js\new-page.js:2, C:\FacturalesNuevo\assets\js\quote-page.js:1, C:\FacturalesNuevo\assets\js\quote-clients.js:1, ... | Alta | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| getStatusBadge | C:\FacturalesNuevo\assets\js\invoices.js:610 | - | Baja | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| getTransactionById | C:\FacturalesNuevo\assets\js\transactions.js:512 | C:\FacturalesNuevo\assets\js\expenses-page.js:1 | Alta | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| getTransactions | C:\FacturalesNuevo\assets\js\transactions.js:511 | C:\FacturalesNuevo\index.html:4, C:\FacturalesNuevo\assets\js\expenses-page.js:1, C:\FacturalesNuevo\assets\js\transactions.js:1 | Critica | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| getTransactionStats | C:\FacturalesNuevo\assets\js\transactions.js:521 | - | Alta | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| getUserProgress | C:\FacturalesNuevo\assets\js\onboardingProgress.js:529 | C:\FacturalesNuevo\settings.html:2 | Critica | Mover a src/services/onboarding; exponer solo contratos de dominio. |
| getUserProvider | C:\FacturalesNuevo\assets\js\auth.js:476 | C:\FacturalesNuevo\settings.html:3 | Media | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| getUserProvider | C:\FacturalesNuevo\settings.html:4795 | C:\FacturalesNuevo\settings.html:2, C:\FacturalesNuevo\assets\js\auth.js:1 | Media | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| getUserSeries | C:\FacturalesNuevo\assets\js\invoice-series-db.js:183 | C:\FacturalesNuevo\settings.html:3, C:\FacturalesNuevo\invoices\quote.html:3, C:\FacturalesNuevo\invoices\new.html:3 | Alta | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| globalSearch | C:\FacturalesNuevo\assets\js\global-search.js:407 | C:\FacturalesNuevo\components\header-unified.html:1 | Media | Encapsular en modulo de feature y retirar del contrato global en F10. |
| goToPage | C:\FacturalesNuevo\assets\js\expenses-page.js:1207 | - | Baja | Encapsular en modulo de feature y retirar del contrato global en F10. |
| goToPreview | C:\FacturalesNuevo\assets\js\new-page.js:819 | C:\FacturalesNuevo\invoices\quote.html:2, C:\FacturalesNuevo\invoices\new.html:2, C:\FacturalesNuevo\assets\js\quote-page.js:1 | Alta | Encapsular en modulo de feature y retirar del contrato global en F10. |
| goToPreview | C:\FacturalesNuevo\assets\js\quote-page.js:925 | C:\FacturalesNuevo\invoices\quote.html:2, C:\FacturalesNuevo\invoices\new.html:2, C:\FacturalesNuevo\assets\js\new-page.js:1 | Alta | Encapsular en modulo de feature y retirar del contrato global en F10. |
| handleAmountFilter | C:\FacturalesNuevo\assets\js\expenses-page.js:1185 | - | Baja | Mantener en legacy durante F1; migrar a handlers locales React por feature (F3+). |
| handleBulkDelete | C:\FacturalesNuevo\assets\js\expenses-page.js:1217 | - | Baja | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| handleClientSearch | C:\FacturalesNuevo\assets\js\invoice-clients.js:321 | C:\FacturalesNuevo\assets\js\quote-clients.js:1 | Alta | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| handleClientSearch | C:\FacturalesNuevo\assets\js\quote-clients.js:321 | C:\FacturalesNuevo\assets\js\invoice-clients.js:1 | Alta | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| handleContactAutocomplete | C:\FacturalesNuevo\assets\js\expenses-page.js:1194 | - | Baja | Mantener en legacy durante F1; migrar a handlers locales React por feature (F3+). |
| handleDashboardSearchClients | C:\FacturalesNuevo\index.html:2071 | - | Alta | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| handleDateFilter | C:\FacturalesNuevo\assets\js\expenses-page.js:1186 | - | Baja | Mantener en legacy durante F1; migrar a handlers locales React por feature (F3+). |
| handleDeleteTransaction | C:\FacturalesNuevo\assets\js\expenses-page.js:1197 | - | Alta | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| handleInvoiceSaveClient | C:\FacturalesNuevo\assets\js\invoice-clients.js:327 | - | Alta | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| handleLogout | C:\FacturalesNuevo\assets\js\user-header.js:171 | - | Baja | Mantener en legacy durante F1; migrar a handlers locales React por feature (F3+). |
| handleQuoteSaveClient | C:\FacturalesNuevo\assets\js\quote-clients.js:327 | - | Alta | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| handleSaveExpense | C:\FacturalesNuevo\assets\js\expenses-page.js:1182 | - | Baja | Mantener en legacy durante F1; migrar a handlers locales React por feature (F3+). |
| handleSearchClients | C:\FacturalesNuevo\assets\js\users-page.js:1076 | - | Alta | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| handleSearchDrafts | C:\FacturalesNuevo\assets\js\drafts-page.js:321 | C:\FacturalesNuevo\assets\js\quote-drafts-page.js:1 | Media | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| handleSearchDrafts | C:\FacturalesNuevo\assets\js\quote-drafts-page.js:321 | C:\FacturalesNuevo\assets\js\drafts-page.js:1 | Media | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| handleSearchIssued | C:\FacturalesNuevo\assets\js\issued-page.js:469 | C:\FacturalesNuevo\assets\js\quote-issued-page.js:1 | Media | Mantener en legacy durante F1; migrar a handlers locales React por feature (F3+). |
| handleSearchIssued | C:\FacturalesNuevo\assets\js\quote-issued-page.js:467 | C:\FacturalesNuevo\assets\js\issued-page.js:1 | Media | Mantener en legacy durante F1; migrar a handlers locales React por feature (F3+). |
| handleSearchReceived | C:\FacturalesNuevo\invoices\facturas-recibidas.html:344 | - | Baja | Mantener en legacy durante F1; migrar a handlers locales React por feature (F3+). |
| handleSearchTransactions | C:\FacturalesNuevo\assets\js\expenses-page.js:1184 | C:\FacturalesNuevo\assets\js\expenses-page.js:1 | Alta | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| handleSearchTransactions | C:\FacturalesNuevo\assets\js\expenses-page.js:768 | C:\FacturalesNuevo\assets\js\expenses-page.js:1 | Alta | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| handleTypeFilter | C:\FacturalesNuevo\assets\js\expenses-page.js:1187 | - | Baja | Mantener en legacy durante F1; migrar a handlers locales React por feature (F3+). |
| hasBusinessInfo | C:\FacturalesNuevo\assets\js\businessInfo.js:266 | - | Baja | Encapsular en modulo de feature y retirar del contrato global en F10. |
| hasInvoiceDefaults | C:\FacturalesNuevo\assets\js\invoice-defaults.js:347 | - | Alta | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| hideClientDropdown | C:\FacturalesNuevo\assets\js\invoice-clients.js:323 | C:\FacturalesNuevo\assets\js\quote-clients.js:1 | Alta | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| hideClientDropdown | C:\FacturalesNuevo\assets\js\quote-clients.js:323 | C:\FacturalesNuevo\assets\js\invoice-clients.js:1 | Alta | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| highlightField | C:\FacturalesNuevo\assets\js\new-page.js:822 | - | Baja | Encapsular en modulo de feature y retirar del contrato global en F10. |
| importClientsBulk | C:\FacturalesNuevo\assets\js\clients.js:592 | C:\FacturalesNuevo\assets\js\users-page.js:2 | Alta | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| initNewPage | C:\FacturalesNuevo\assets\js\new-page.js:817 | C:\FacturalesNuevo\invoices\new.html:2 | Media | Encapsular en modulo de feature y retirar del contrato global en F10. |
| initNewPage | C:\FacturalesNuevo\invoices\new.html:2670 | C:\FacturalesNuevo\invoices\new.html:1, C:\FacturalesNuevo\assets\js\new-page.js:1 | Media | Encapsular en modulo de feature y retirar del contrato global en F10. |
| initQuotePage | C:\FacturalesNuevo\assets\js\quote-page.js:922 | C:\FacturalesNuevo\invoices\quote.html:2 | Alta | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| initQuotePage | C:\FacturalesNuevo\invoices\quote.html:2668 | C:\FacturalesNuevo\invoices\quote.html:1, C:\FacturalesNuevo\assets\js\quote-page.js:1 | Alta | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| InvoiceDataHandler | C:\FacturalesNuevo\assets\js\invoice-data-handler.js:427 | C:\FacturalesNuevo\assets\js\new-page.js:2, C:\FacturalesNuevo\invoices\new.html:1 | Alta | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| invoiceDataHandler | C:\FacturalesNuevo\invoices\new.html:2146 | C:\FacturalesNuevo\assets\js\new-page.js:2, C:\FacturalesNuevo\assets\js\invoice-data-handler.js:1 | Alta | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| InvoicePDFGenerator | C:\FacturalesNuevo\assets\js\fiscal-page.js:512 | C:\FacturalesNuevo\assets\js\invoice-pdf-generator.js:1, C:\FacturalesNuevo\assets\js\fiscal-page.js:1 | Alta | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| InvoicePDFGenerator | C:\FacturalesNuevo\assets\js\invoice-pdf-generator.js:536 | C:\FacturalesNuevo\assets\js\fiscal-page.js:2 | Alta | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| isInvoiceTransaction | C:\FacturalesNuevo\assets\js\transactions.js:520 | - | Alta | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| isValidEmail | C:\FacturalesNuevo\assets\js\clients.js:590 | C:\FacturalesNuevo\assets\js\csv-import.js:1 | Media | Encapsular en modulo de feature y retirar del contrato global en F10. |
| isValidPhone | C:\FacturalesNuevo\assets\js\clients.js:591 | - | Baja | Encapsular en modulo de feature y retirar del contrato global en F10. |
| loadDrafts | C:\FacturalesNuevo\assets\js\drafts-page.js:316 | C:\FacturalesNuevo\assets\js\quote-drafts-page.js:3, C:\FacturalesNuevo\assets\js\drafts-page.js:2 | Alta | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| loadDrafts | C:\FacturalesNuevo\assets\js\quote-drafts-page.js:316 | C:\FacturalesNuevo\assets\js\drafts-page.js:3, C:\FacturalesNuevo\assets\js\quote-drafts-page.js:2 | Alta | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| loadInvoiceLines | C:\FacturalesNuevo\assets\js\new-page.js:821 | - | Alta | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| loadIssuedInvoices | C:\FacturalesNuevo\assets\js\issued-page.js:463 | - | Alta | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| loadIssuedQuotes | C:\FacturalesNuevo\assets\js\quote-issued-page.js:461 | - | Alta | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| loadOnboardingProgress | C:\FacturalesNuevo\assets\js\onboardingProgress.js:537 | C:\FacturalesNuevo\scan-ocr.html:1, C:\FacturalesNuevo\index.html:1, C:\FacturalesNuevo\expenses.html:1 | Critica | Mover a src/services/onboarding; exponer solo contratos de dominio. |
| loadPaymentMethodsFromSupabase | C:\FacturalesNuevo\assets\js\invoice-defaults.js:348 | - | Alta | Mover a src/services/supabase y src/services/auth; consumo por inyeccion de dependencias. |
| loadQuoteLines | C:\FacturalesNuevo\assets\js\quote-page.js:927 | - | Alta | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| loadTransactions | C:\FacturalesNuevo\assets\js\expenses-page.js:1183 | - | Alta | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| loadUserHeader | C:\FacturalesNuevo\assets\js\user-header.js:172 | - | Baja | Mantener en legacy durante F1; migrar a handlers locales React por feature (F3+). |
| onAuthStateChange | C:\FacturalesNuevo\assets\js\auth.js:471 | - | Alta | Mover a src/services/supabase y src/services/auth; consumo por inyeccion de dependencias. |
| onPaymentMethodChange | C:\FacturalesNuevo\assets\js\invoice.js:429 | - | Baja | Encapsular en modulo de feature y retirar del contrato global en F10. |
| openAddExpenseModal | C:\FacturalesNuevo\assets\js\expenses-page.js:1180 | - | Baja | Mantener en legacy durante F1; migrar a handlers locales React por feature (F3+). |
| openBulkDeleteModal | C:\FacturalesNuevo\assets\js\users-page.js:1071 | - | Baja | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| openCancelModal | C:\FacturalesNuevo\assets\js\issued-page.js:466 | C:\FacturalesNuevo\assets\js\quote-issued-page.js:1 | Media | Mantener en legacy durante F1; migrar a handlers locales React por feature (F3+). |
| openCancelModal | C:\FacturalesNuevo\assets\js\quote-issued-page.js:464 | C:\FacturalesNuevo\assets\js\issued-page.js:1 | Media | Mantener en legacy durante F1; migrar a handlers locales React por feature (F3+). |
| openCreateClientModal | C:\FacturalesNuevo\assets\js\invoice.js:424 | C:\FacturalesNuevo\assets\js\users-page.js:1 | Alta | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| openCreateClientModal | C:\FacturalesNuevo\assets\js\users-page.js:1077 | C:\FacturalesNuevo\assets\js\invoice.js:1 | Alta | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| openDeleteModal | C:\FacturalesNuevo\assets\js\drafts-page.js:318 | C:\FacturalesNuevo\assets\js\users-page.js:1, C:\FacturalesNuevo\assets\js\quote-drafts-page.js:1 | Media | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| openDeleteModal | C:\FacturalesNuevo\assets\js\quote-drafts-page.js:318 | C:\FacturalesNuevo\assets\js\users-page.js:1, C:\FacturalesNuevo\assets\js\drafts-page.js:1 | Media | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| openDeleteModal | C:\FacturalesNuevo\assets\js\users-page.js:1080 | C:\FacturalesNuevo\assets\js\quote-drafts-page.js:1, C:\FacturalesNuevo\assets\js\drafts-page.js:1 | Media | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| openDeleteTransactionModal | C:\FacturalesNuevo\assets\js\expenses-page.js:1198 | - | Alta | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| openEditClientModal | C:\FacturalesNuevo\assets\js\users-page.js:1078 | - | Alta | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| openImportModal | C:\FacturalesNuevo\assets\js\users-page.js:1084 | - | Baja | Mantener en legacy durante F1; migrar a handlers locales React por feature (F3+). |
| openInvoiceCreateClientModal | C:\FacturalesNuevo\assets\js\invoice-clients.js:325 | - | Alta | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| openPaymentMethodModal | C:\FacturalesNuevo\assets\js\invoice.js:427 | - | Baja | Mantener en legacy durante F1; migrar a handlers locales React por feature (F3+). |
| openPortalSession | C:\FacturalesNuevo\settings.html:4984 | - | Baja | Mantener en legacy durante F1; migrar a handlers locales React por feature (F3+). |
| openQuoteCreateClientModal | C:\FacturalesNuevo\assets\js\quote-clients.js:325 | - | Alta | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| openTeamDeleteModal | C:\FacturalesNuevo\settings.html:5834 | - | Baja | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| openTeamUserModal | C:\FacturalesNuevo\settings.html:5774 | C:\FacturalesNuevo\settings.html:1 | Media | Mantener en legacy durante F1; migrar a handlers locales React por feature (F3+). |
| permanentlyDeleteInvoice | C:\FacturalesNuevo\assets\js\invoices.js:604 | C:\FacturalesNuevo\assets\js\drafts-page.js:3 | Alta | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| permanentlyDeleteQuote | C:\FacturalesNuevo\assets\js\quotes.js:510 | C:\FacturalesNuevo\assets\js\quote-drafts-page.js:3 | Alta | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| planLimits | C:\FacturalesNuevo\assets\js\plan-limits.js:266 | C:\FacturalesNuevo\assets\js\quotes.js:4, C:\FacturalesNuevo\assets\js\scan-ocr-page.js:4, C:\FacturalesNuevo\assets\js\clients.js:4, ... | Critica | Mover a src/services/billing-limits y servicio de suscripcion; quitar acoplamiento UI. |
| productosDB | C:\FacturalesNuevo\assets\js\productos-db.js:171 | C:\FacturalesNuevo\assets\js\productos-page.js:12, C:\FacturalesNuevo\assets\js\product-search.js:3 | Alta | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| productSearch | C:\FacturalesNuevo\assets\js\product-search.js:129 | C:\FacturalesNuevo\invoices\quote.html:2, C:\FacturalesNuevo\invoices\new.html:2, C:\FacturalesNuevo\assets\js\product-search.js:1 | Alta | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| QuoteDataHandler | C:\FacturalesNuevo\assets\js\quote-data-handler.js:425 | C:\FacturalesNuevo\assets\js\quote-page.js:2, C:\FacturalesNuevo\invoices\quote.html:1 | Alta | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| quoteDataHandler | C:\FacturalesNuevo\invoices\quote.html:2146 | C:\FacturalesNuevo\assets\js\quote-page.js:2, C:\FacturalesNuevo\assets\js\quote-data-handler.js:1 | Alta | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| QuotePDFGenerator | C:\FacturalesNuevo\assets\js\quote-pdf-generator.js:505 | - | Alta | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| reactivateSubscription | C:\FacturalesNuevo\settings.html:5021 | - | Alta | Mover a src/services/billing-limits y servicio de suscripcion; quitar acoplamiento UI. |
| renderOnboardingSteps | C:\FacturalesNuevo\assets\js\onboardingProgress.js:536 | - | Alta | Mover a src/services/onboarding; exponer solo contratos de dominio. |
| resendVerificationEmail | C:\FacturalesNuevo\assets\js\auth.js:475 | C:\FacturalesNuevo\verify-email.html:3, C:\FacturalesNuevo\confirm-email.html:3 | Alta | Encapsular en modulo de feature y retirar del contrato global en F10. |
| resetPassword | C:\FacturalesNuevo\assets\js\auth.js:472 | - | Baja | Encapsular en modulo de feature y retirar del contrato global en F10. |
| revenueFlow | C:\FacturalesNuevo\index.html:1417 | C:\FacturalesNuevo\index.html:3 | Media | Encapsular en modulo de feature y retirar del contrato global en F10. |
| saveBusinessInfo | C:\FacturalesNuevo\assets\js\businessInfo.js:262 | C:\FacturalesNuevo\complete-profile.html:1 | Media | Encapsular en modulo de feature y retirar del contrato global en F10. |
| saveDraft | C:\FacturalesNuevo\assets\js\new-page.js:818 | C:\FacturalesNuevo\invoices\new.html:2 | Media | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| saveInvoiceDefaults | C:\FacturalesNuevo\assets\js\invoice-defaults.js:344 | C:\FacturalesNuevo\invoices\quote.html:4, C:\FacturalesNuevo\invoices\new.html:4 | Alta | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| saveInvoiceDefaults | C:\FacturalesNuevo\invoices\new.html:2577 | C:\FacturalesNuevo\invoices\quote.html:4, C:\FacturalesNuevo\invoices\new.html:3, C:\FacturalesNuevo\assets\js\invoice-defaults.js:1 | Alta | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| saveInvoiceDefaults | C:\FacturalesNuevo\invoices\new.html:2614 | C:\FacturalesNuevo\invoices\quote.html:4, C:\FacturalesNuevo\invoices\new.html:3, C:\FacturalesNuevo\assets\js\invoice-defaults.js:1 | Alta | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| saveInvoiceDefaults | C:\FacturalesNuevo\invoices\quote.html:2576 | C:\FacturalesNuevo\invoices\new.html:4, C:\FacturalesNuevo\invoices\quote.html:3, C:\FacturalesNuevo\assets\js\invoice-defaults.js:1 | Alta | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| saveInvoiceDefaults | C:\FacturalesNuevo\invoices\quote.html:2613 | C:\FacturalesNuevo\invoices\new.html:4, C:\FacturalesNuevo\invoices\quote.html:3, C:\FacturalesNuevo\assets\js\invoice-defaults.js:1 | Alta | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| saveNewClient | C:\FacturalesNuevo\assets\js\invoice.js:426 | - | Alta | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| saveQuoteDraft | C:\FacturalesNuevo\assets\js\quote-page.js:923 | C:\FacturalesNuevo\invoices\quote.html:2 | Alta | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| saveTeamUser | C:\FacturalesNuevo\settings.html:5807 | - | Baja | Encapsular en modulo de feature y retirar del contrato global en F10. |
| searchClientsAutocomplete | C:\FacturalesNuevo\assets\js\clients.js:396 | C:\FacturalesNuevo\assets\js\scan-ocr-page.js:2, C:\FacturalesNuevo\assets\js\expenses-page.js:1 | Alta | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| selectClient | C:\FacturalesNuevo\assets\js\invoice.js:423 | C:\FacturalesNuevo\assets\js\quote-clients.js:1, C:\FacturalesNuevo\assets\js\invoice-clients.js:1 | Alta | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| selectClientById | C:\FacturalesNuevo\assets\js\invoice-clients.js:324 | C:\FacturalesNuevo\assets\js\quote-clients.js:1 | Alta | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| selectClientById | C:\FacturalesNuevo\assets\js\quote-clients.js:324 | C:\FacturalesNuevo\assets\js\invoice-clients.js:1 | Alta | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| selectContact | C:\FacturalesNuevo\assets\js\expenses-page.js:1195 | - | Baja | Encapsular en modulo de feature y retirar del contrato global en F10. |
| selectEntity | C:\FacturalesNuevo\complete-profile.html:812 | - | Baja | Encapsular en modulo de feature y retirar del contrato global en F10. |
| selectFormat | C:\FacturalesNuevo\complete-profile.html:937 | - | Baja | Encapsular en modulo de feature y retirar del contrato global en F10. |
| selectIRPF | C:\FacturalesNuevo\complete-profile.html:922 | - | Baja | Encapsular en modulo de feature y retirar del contrato global en F10. |
| selectIVA | C:\FacturalesNuevo\complete-profile.html:907 | - | Baja | Encapsular en modulo de feature y retirar del contrato global en F10. |
| selectPlan | C:\FacturalesNuevo\settings.html:4950 | - | Alta | Mover a src/services/billing-limits y servicio de suscripcion; quitar acoplamiento UI. |
| selectReset | C:\FacturalesNuevo\complete-profile.html:961 | - | Baja | Encapsular en modulo de feature y retirar del contrato global en F10. |
| selectSettingsIRPF | C:\FacturalesNuevo\settings.html:3766 | - | Baja | Encapsular en modulo de feature y retirar del contrato global en F10. |
| selectSettingsIVA | C:\FacturalesNuevo\settings.html:3752 | - | Baja | Encapsular en modulo de feature y retirar del contrato global en F10. |
| selectSettingsTaxType | C:\FacturalesNuevo\settings.html:3730 | - | Baja | Encapsular en modulo de feature y retirar del contrato global en F10. |
| selectTaxType | C:\FacturalesNuevo\complete-profile.html:885 | - | Baja | Encapsular en modulo de feature y retirar del contrato global en F10. |
| sendDocumentEmail | C:\FacturalesNuevo\assets\js\email-sender.js:94 | C:\FacturalesNuevo\invoices\quote-preview.html:3, C:\FacturalesNuevo\invoices\preview.html:3 | Critica | Encapsular en modulo de feature y retirar del contrato global en F10. |
| setDashboardPerPage | C:\FacturalesNuevo\index.html:1993 | - | Baja | Encapsular en modulo de feature y retirar del contrato global en F10. |
| setFinancePeriod | C:\FacturalesNuevo\index.html:2685 | C:\FacturalesNuevo\index.html:1 | Media | Encapsular en modulo de feature y retirar del contrato global en F10. |
| setFiscalQuarter | C:\FacturalesNuevo\assets\js\fiscal-page.js:121 | C:\FacturalesNuevo\fiscal.html:5 | Alta | Encapsular en modulo de feature y retirar del contrato global en F10. |
| setFiscalYear | C:\FacturalesNuevo\assets\js\fiscal-page.js:113 | C:\FacturalesNuevo\assets\js\fiscal-page.js:1 | Media | Encapsular en modulo de feature y retirar del contrato global en F10. |
| setPricingInterval | C:\FacturalesNuevo\settings.html:4904 | - | Baja | Encapsular en modulo de feature y retirar del contrato global en F10. |
| setResultsPerPage | C:\FacturalesNuevo\assets\js\expenses-page.js:1208 | - | Baja | Encapsular en modulo de feature y retirar del contrato global en F10. |
| setRevenueRange | C:\FacturalesNuevo\index.html:1421 | C:\FacturalesNuevo\index.html:1 | Media | Encapsular en modulo de feature y retirar del contrato global en F10. |
| setSelectedClientId | C:\FacturalesNuevo\assets\js\invoice-clients.js:329 | C:\FacturalesNuevo\assets\js\quote-page.js:2, C:\FacturalesNuevo\assets\js\new-page.js:2, C:\FacturalesNuevo\assets\js\quote-clients.js:1 | Alta | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| setSelectedClientId | C:\FacturalesNuevo\assets\js\new-page.js:116 | C:\FacturalesNuevo\assets\js\quote-page.js:2, C:\FacturalesNuevo\assets\js\invoice-clients.js:1, C:\FacturalesNuevo\assets\js\quote-clients.js:1, ... | Alta | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| setSelectedClientId | C:\FacturalesNuevo\assets\js\quote-clients.js:329 | C:\FacturalesNuevo\assets\js\quote-page.js:2, C:\FacturalesNuevo\assets\js\new-page.js:2, C:\FacturalesNuevo\assets\js\invoice-clients.js:1 | Alta | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| setSelectedClientId | C:\FacturalesNuevo\assets\js\quote-page.js:123 | C:\FacturalesNuevo\assets\js\new-page.js:2, C:\FacturalesNuevo\assets\js\quote-page.js:1, C:\FacturalesNuevo\assets\js\quote-clients.js:1, ... | Alta | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| setUsersPerPage | C:\FacturalesNuevo\assets\js\users-page.js:392 | - | Baja | Encapsular en modulo de feature y retirar del contrato global en F10. |
| showClientDropdown | C:\FacturalesNuevo\assets\js\invoice-clients.js:322 | C:\FacturalesNuevo\assets\js\quote-clients.js:1 | Alta | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| showClientDropdown | C:\FacturalesNuevo\assets\js\quote-clients.js:322 | C:\FacturalesNuevo\assets\js\invoice-clients.js:1 | Alta | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| showToast | C:\FacturalesNuevo\assets\js\issued-page.js:449 | C:\FacturalesNuevo\settings.html:21, C:\FacturalesNuevo\invoices\preview.html:9, C:\FacturalesNuevo\invoices\quote-preview.html:9, ... | Alta | Encapsular en modulo de feature y retirar del contrato global en F10. |
| showToast | C:\FacturalesNuevo\assets\js\new-page.js:772 | C:\FacturalesNuevo\settings.html:21, C:\FacturalesNuevo\invoices\preview.html:9, C:\FacturalesNuevo\invoices\quote-preview.html:9, ... | Alta | Encapsular en modulo de feature y retirar del contrato global en F10. |
| showToast | C:\FacturalesNuevo\assets\js\quote-issued-page.js:447 | C:\FacturalesNuevo\settings.html:21, C:\FacturalesNuevo\invoices\preview.html:9, C:\FacturalesNuevo\invoices\quote-preview.html:9, ... | Alta | Encapsular en modulo de feature y retirar del contrato global en F10. |
| showToast | C:\FacturalesNuevo\assets\js\quote-page.js:908 | C:\FacturalesNuevo\settings.html:21, C:\FacturalesNuevo\invoices\preview.html:9, C:\FacturalesNuevo\invoices\quote-preview.html:9, ... | Alta | Encapsular en modulo de feature y retirar del contrato global en F10. |
| showToast | C:\FacturalesNuevo\assets\js\toast.js:118 | C:\FacturalesNuevo\settings.html:21, C:\FacturalesNuevo\invoices\preview.html:9, C:\FacturalesNuevo\invoices\quote-preview.html:9, ... | Alta | Encapsular en modulo de feature y retirar del contrato global en F10. |
| showToast | C:\FacturalesNuevo\assets\js\user-header.js:27 | C:\FacturalesNuevo\settings.html:21, C:\FacturalesNuevo\invoices\preview.html:9, C:\FacturalesNuevo\invoices\quote-preview.html:9, ... | Alta | Encapsular en modulo de feature y retirar del contrato global en F10. |
| signIn | C:\FacturalesNuevo\assets\js\auth.js:465 | C:\FacturalesNuevo\signin.html:8, C:\FacturalesNuevo\signup.html:3, C:\FacturalesNuevo\settings.html:2, ... | Critica | Mover a src/services/supabase y src/services/auth; consumo por inyeccion de dependencias. |
| signInWithGoogle | C:\FacturalesNuevo\assets\js\auth.js:466 | C:\FacturalesNuevo\signup.html:3, C:\FacturalesNuevo\signin.html:3 | Alta | Mover a src/services/supabase y src/services/auth; consumo por inyeccion de dependencias. |
| signOut | C:\FacturalesNuevo\assets\js\auth.js:467 | C:\FacturalesNuevo\assets\js\user-header.js:2, C:\FacturalesNuevo\assets\js\auth-guard.js:1 | Critica | Mover a src/services/supabase y src/services/auth; consumo por inyeccion de dependencias. |
| signOut | C:\FacturalesNuevo\assets\js\user-header.js:18 | C:\FacturalesNuevo\assets\js\user-header.js:1, C:\FacturalesNuevo\assets\js\auth.js:1, C:\FacturalesNuevo\assets\js\auth-guard.js:1 | Critica | Mover a src/services/supabase y src/services/auth; consumo por inyeccion de dependencias. |
| signUp | C:\FacturalesNuevo\assets\js\auth.js:464 | C:\FacturalesNuevo\signup.html:5 | Critica | Encapsular en modulo de feature y retirar del contrato global en F10. |
| sortTransactions | C:\FacturalesNuevo\assets\js\expenses-page.js:288 | C:\FacturalesNuevo\expenses.html:6, C:\FacturalesNuevo\assets\js\expenses-page.js:1 | Alta | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| subscriptionHelper | C:\FacturalesNuevo\assets\js\subscription.js:149 | C:\FacturalesNuevo\settings.html:4, C:\FacturalesNuevo\assets\js\plan-limits.js:2, C:\FacturalesNuevo\assets\js\subscription.js:1 | Critica | Mover a src/services/billing-limits y servicio de suscripcion; quitar acoplamiento UI. |
| supabaseAuthReady | C:\FacturalesNuevo\assets\js\supabaseClient.js:52 | C:\FacturalesNuevo\settings.html:3, C:\FacturalesNuevo\assets\js\subscription-guard.js:2, C:\FacturalesNuevo\confirm-email.html:2, ... | Critica | Mover a src/services/supabase y src/services/auth; consumo por inyeccion de dependencias. |
| supabaseClient | C:\FacturalesNuevo\assets\js\supabaseClient.js:25 | C:\FacturalesNuevo\settings.html:28, C:\FacturalesNuevo\signin.html:16, C:\FacturalesNuevo\assets\js\onboardingProgress.js:8, ... | Critica | Mover a src/services/supabase y src/services/auth; consumo por inyeccion de dependencias. |
| supabaseReady | C:\FacturalesNuevo\confirm-email.html:164 | C:\FacturalesNuevo\verify-email.html:1, C:\FacturalesNuevo\signup.html:1, C:\FacturalesNuevo\signin.html:1 | Alta | Mover a src/services/supabase y src/services/auth; consumo por inyeccion de dependencias. |
| supabaseReady | C:\FacturalesNuevo\signin.html:567 | C:\FacturalesNuevo\verify-email.html:1, C:\FacturalesNuevo\signup.html:1, C:\FacturalesNuevo\confirm-email.html:1 | Alta | Mover a src/services/supabase y src/services/auth; consumo por inyeccion de dependencias. |
| supabaseReady | C:\FacturalesNuevo\signup.html:352 | C:\FacturalesNuevo\verify-email.html:1, C:\FacturalesNuevo\signin.html:1, C:\FacturalesNuevo\confirm-email.html:1 | Alta | Mover a src/services/supabase y src/services/auth; consumo por inyeccion de dependencias. |
| supabaseReady | C:\FacturalesNuevo\verify-email.html:130 | C:\FacturalesNuevo\signup.html:1, C:\FacturalesNuevo\signin.html:1, C:\FacturalesNuevo\confirm-email.html:1 | Alta | Mover a src/services/supabase y src/services/auth; consumo por inyeccion de dependencias. |
| toast | C:\FacturalesNuevo\assets\js\toast.js:119 | - | Baja | Encapsular en modulo de feature y retirar del contrato global en F10. |
| toggleAdvancedOptions | C:\FacturalesNuevo\assets\js\invoice.js:419 | - | Baja | Mantener en legacy durante F1; migrar a handlers locales React por feature (F3+). |
| toggleClientDropdown | C:\FacturalesNuevo\assets\js\invoice.js:421 | - | Alta | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| toggleClientStatus | C:\FacturalesNuevo\assets\js\users-page.js:1083 | - | Alta | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| toggleConditionalField | C:\FacturalesNuevo\assets\js\invoice.js:420 | - | Baja | Mantener en legacy durante F1; migrar a handlers locales React por feature (F3+). |
| toggleContactFilter | C:\FacturalesNuevo\index.html:1934 | - | Baja | Mantener en legacy durante F1; migrar a handlers locales React por feature (F3+). |
| toggleContactsFilters | C:\FacturalesNuevo\index.html:1932 | - | Baja | Mantener en legacy durante F1; migrar a handlers locales React por feature (F3+). |
| toggleDashboardPerPageDropdown | C:\FacturalesNuevo\index.html:1986 | - | Baja | Mantener en legacy durante F1; migrar a handlers locales React por feature (F3+). |
| toggleDateFilter | C:\FacturalesNuevo\assets\js\expenses-page.js:1205 | - | Baja | Mantener en legacy durante F1; migrar a handlers locales React por feature (F3+). |
| toggleExpensesFilters | C:\FacturalesNuevo\assets\js\expenses-page.js:1216 | - | Baja | Mantener en legacy durante F1; migrar a handlers locales React por feature (F3+). |
| toggleExpensesPerPageDropdown | C:\FacturalesNuevo\assets\js\expenses-page.js:1210 | - | Baja | Mantener en legacy durante F1; migrar a handlers locales React por feature (F3+). |
| toggleFilterDropdown | C:\FacturalesNuevo\assets\js\expenses-page.js:1191 | - | Baja | Mantener en legacy durante F1; migrar a handlers locales React por feature (F3+). |
| togglePaidStatus | C:\FacturalesNuevo\assets\js\invoices.js:605 | C:\FacturalesNuevo\assets\js\issued-page.js:1 | Critica | Mantener en legacy durante F1; migrar a handlers locales React por feature (F3+). |
| togglePaymentStatus | C:\FacturalesNuevo\assets\js\issued-page.js:465 | C:\FacturalesNuevo\assets\js\quote-issued-page.js:1 | Media | Mantener en legacy durante F1; migrar a handlers locales React por feature (F3+). |
| togglePaymentStatus | C:\FacturalesNuevo\assets\js\quote-issued-page.js:463 | C:\FacturalesNuevo\assets\js\issued-page.js:1 | Media | Mantener en legacy durante F1; migrar a handlers locales React por feature (F3+). |
| togglePriceFilter | C:\FacturalesNuevo\assets\js\expenses-page.js:1201 | - | Baja | Mantener en legacy durante F1; migrar a handlers locales React por feature (F3+). |
| toggleQuotePaidStatus | C:\FacturalesNuevo\assets\js\quotes.js:511 | C:\FacturalesNuevo\assets\js\quote-issued-page.js:1 | Critica | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| toggleSelectAll | C:\FacturalesNuevo\assets\js\users-page.js:1069 | - | Baja | Mantener en legacy durante F1; migrar a handlers locales React por feature (F3+). |
| toggleSelectClient | C:\FacturalesNuevo\assets\js\users-page.js:1070 | - | Alta | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| toggleUsersPerPageDropdown | C:\FacturalesNuevo\assets\js\users-page.js:398 | - | Baja | Mantener en legacy durante F1; migrar a handlers locales React por feature (F3+). |
| transactionsUtils | C:\FacturalesNuevo\assets\js\transactions.js:524 | - | Alta | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| updateActiveFilterCount | C:\FacturalesNuevo\assets\js\expenses-page.js:1192 | - | Baja | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| updateBusinessInfo | C:\FacturalesNuevo\assets\js\businessInfo.js:264 | C:\FacturalesNuevo\settings.html:1 | Media | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| updateClient | C:\FacturalesNuevo\assets\js\clients.js:394 | C:\FacturalesNuevo\assets\js\modal-cliente.js:1 | Alta | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| updateContactsPriceFromSlider | C:\FacturalesNuevo\index.html:1972 | - | Baja | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| updateContactsPriceSlider | C:\FacturalesNuevo\index.html:1970 | - | Baja | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| updateCustomPreview | C:\FacturalesNuevo\complete-profile.html:998 | - | Baja | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| updateHeaderDOM | C:\FacturalesNuevo\assets\js\user-header.js:173 | - | Baja | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| updateInvoice | C:\FacturalesNuevo\assets\js\invoices.js:602 | C:\FacturalesNuevo\assets\js\new-page.js:4, C:\FacturalesNuevo\invoices\new.html:2, C:\FacturalesNuevo\invoices\quote.html:2, ... | Alta | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| updateInvoiceNumberPreview | C:\FacturalesNuevo\assets\js\invoice-numbering.js:210 | C:\FacturalesNuevo\invoices\quote.html:2, C:\FacturalesNuevo\invoices\new.html:2 | Alta | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| updateInvoiceNumberPreview | C:\FacturalesNuevo\invoices\new.html:2562 | C:\FacturalesNuevo\invoices\quote.html:2, C:\FacturalesNuevo\assets\js\invoice-numbering.js:1, C:\FacturalesNuevo\invoices\new.html:1 | Alta | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| updateInvoiceNumberPreview | C:\FacturalesNuevo\invoices\quote.html:2561 | C:\FacturalesNuevo\invoices\new.html:2, C:\FacturalesNuevo\invoices\quote.html:1, C:\FacturalesNuevo\assets\js\invoice-numbering.js:1 | Alta | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| updatePagination | C:\FacturalesNuevo\assets\js\expenses-page.js:1209 | - | Baja | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| updatePassword | C:\FacturalesNuevo\assets\js\auth.js:473 | C:\FacturalesNuevo\settings.html:2 | Media | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| updatePriceFromSlider | C:\FacturalesNuevo\assets\js\expenses-page.js:1203 | - | Baja | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| updatePriceRange | C:\FacturalesNuevo\assets\js\expenses-page.js:1202 | - | Baja | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| updateProfile | C:\FacturalesNuevo\assets\js\auth.js:474 | - | Baja | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| updateQuote | C:\FacturalesNuevo\assets\js\quotes.js:508 | C:\FacturalesNuevo\assets\js\quote-page.js:7, C:\FacturalesNuevo\assets\js\quotes.js:1 | Alta | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| updateSeriesDB | C:\FacturalesNuevo\assets\js\invoice-series-db.js:185 | C:\FacturalesNuevo\settings.html:1 | Media | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| updateStepProgress | C:\FacturalesNuevo\assets\js\onboardingProgress.js:531 | C:\FacturalesNuevo\assets\js\clients.js:4, C:\FacturalesNuevo\settings.html:2, C:\FacturalesNuevo\assets\js\invoices.js:2, ... | Critica | Mover a src/services/onboarding; exponer solo contratos de dominio. |
| updateStepProgress | C:\FacturalesNuevo\settings.html:4081 | C:\FacturalesNuevo\assets\js\clients.js:4, C:\FacturalesNuevo\assets\js\invoices.js:2, C:\FacturalesNuevo\settings.html:1, ... | Critica | Mover a src/services/onboarding; exponer solo contratos de dominio. |
| updateTotals | C:\FacturalesNuevo\assets\js\new-page.js:131 | C:\FacturalesNuevo\assets\js\quote-page.js:2, C:\FacturalesNuevo\assets\js\new-page.js:1 | Media | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| updateTotals | C:\FacturalesNuevo\assets\js\quote-page.js:137 | C:\FacturalesNuevo\assets\js\new-page.js:2, C:\FacturalesNuevo\assets\js\quote-page.js:1 | Media | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| updateTransaction | C:\FacturalesNuevo\assets\js\transactions.js:513 | C:\FacturalesNuevo\assets\js\expenses-page.js:1 | Critica | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| validateClientData | C:\FacturalesNuevo\assets\js\clients.js:589 | - | Alta | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| validateTransactionData | C:\FacturalesNuevo\assets\js\transactions.js:518 | - | Alta | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| viewInvoice | C:\FacturalesNuevo\assets\js\issued-page.js:464 | - | Alta | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |
| viewQuote | C:\FacturalesNuevo\assets\js\quote-issued-page.js:462 | - | Alta | Consumir via src/services/repositories/*; eliminar export global al cerrar cutover. |

## Delta F2 (2026-03-10)

| API | Origen | Consumidores | Criticidad | Estrategia futura |
|---|---|---|---|---|
| window.facturalesServices.navigation.openProductsPilot | assets/js/react-shell-adapter.js | productos.html (boton piloto), futuras rutas legacy puente | Media | Mantener como adaptador transitorio; retirar cuando productos legacy se migre por completo. |
| window.facturalesServices.navigation.productsPilotRoute | assets/js/react-shell-adapter.js | Adaptadores de navegacion legacy | Baja | Sustituir por router interno cuando se retire coexistencia hibrida. |

Nota: En F2 no se introdujeron nuevos globals top-level fuera del namespace de compatibilidad `window.facturalesServices`.
