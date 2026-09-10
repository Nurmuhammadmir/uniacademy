// LasummaShanti - Russian + Uzbek (Latin) only, unlike the school apps' 4-language set.
export const LANGUAGE_LABELS = { ru: 'Русский', uz: "O'zbek" }

export const TRANSLATIONS = {
    ru: {
        // shared/common
        save: 'Сохранить', cancel: 'Отмена', add: 'Добавить', edit: 'Изменить', delete: 'Удалить',
        loading: 'Загрузка...', areYouSure: 'Вы уверены?', confirm: 'Подтвердить',
        dateCol: 'Дата', dateFromLabel: 'С даты', dateToLabel: 'По дату',
        categoryLabel: 'Категория', amountLabel: 'Сумма', commentLabel: 'Комментарий',
        phoneLabel: 'Телефон', personNameLabel: 'Имя', itemNameLabel: 'Название', passwordLabel: 'Пароль',
        otherCategory: 'Другое', anyOption: 'Любой', anyCategoryOption: 'Любая',
        chooseOption: 'Выберите', notSpecified: 'Не указан', notFoundOption: 'Ничего не найдено',
        searchPlaceholder: 'Поиск...', apply: 'Применить', manageCategoriesTitle: 'Управление категориями',
        allOption: 'Все', paidLabel: 'Оплачено', debtLabel: 'Долг', methodLabel: 'Способ',
        unitLabel: 'Ед. измерения', stockLabel: 'На складе', priceLabel: 'Цена', quantityLabel: 'Количество',
        showPasswordLabel: 'Показать пароль', hidePasswordLabel: 'Скрыть пароль', menuLabel: 'Меню',
        mixedMethodBtn: 'Разные способы', addMethodRowBtn: 'Добавить способ', splitTotalLabel: 'Сумма разбивки',

        // payment methods
        methodCash: 'Наличные', methodCard: 'Карта', methodBankTransfer: 'Перечисление',
        methodClick: 'Click', methodPayme: 'Payme', methodApelsin: 'Apelsin',

        // navbar/balance
        navDashboard: 'Дашборд', navPurchases: 'Покупки', navSales: 'Продажи', navFinance: 'Финансы', navSettings: 'Настройки',
        balanceCash: 'Наличные', balanceCard: 'Карта',
        balanceBankTransfer: 'На счету (от перечисления)', logoutBtn: 'Выйти',

        // login
        loginTitle: 'Вход в панель', signInBtn: 'Войти', signingInBtn: 'Вход...',
        sessionExpired: 'Сессия истекла, войдите снова', loginFailed: 'Не удалось войти',
        confirmLogout: 'Выйти из аккаунта?', welcomeMessage: 'Добро пожаловать',

        // toasts (generic)
        couldNotAdd: 'Не удалось добавить', couldNotEdit: 'Не удалось изменить', couldNotDelete: 'Не удалось удалить',
        couldNotLoadUnits: 'Не удалось загрузить единицы измерения', unitAdded: 'Единица измерения добавлена',
        couldNotLoadCategories: 'Не удалось загрузить категории', categoryAdded: 'Категория добавлена',
        couldNotLoadMaterials: 'Не удалось загрузить материалы', materialAdded: 'Материал добавлен',
        couldNotLoadSellers: 'Не удалось загрузить продавцов', sellerAdded: 'Продавец добавлен',
        couldNotLoadPurchases: 'Не удалось загрузить покупки', couldNotLoadDebts: 'Не удалось загрузить долги',
        purchaseAdded: 'Покупка добавлена', couldNotAddPurchase: 'Не удалось добавить покупку',
        couldNotLoadClients: 'Не удалось загрузить клиентов', clientAdded: 'Клиент добавлен',
        couldNotLoadProducts: 'Не удалось загрузить товары', productAdded: 'Товар добавлен',
        couldNotLoadSales: 'Не удалось загрузить продажи', couldNotLoadDebtors: 'Не удалось загрузить должников',
        saleAdded: 'Продажа добавлена', couldNotAddSale: 'Не удалось добавить продажу',
        couldNotLoadBalance: 'Не удалось загрузить баланс',
        couldNotLoadPayments: 'Не удалось загрузить платежи', paymentAdded: 'Платёж добавлен',
        couldNotAddPayment: 'Не удалось добавить платёж', amountExceedsDebtError: 'Сумма больше долга клиента',
        couldNotLoadDashboard: 'Не удалось загрузить дашборд',
        balanceAdjustmentAdded: 'Баланс пополнен', couldNotAddBalanceAdjustment: 'Не удалось пополнить баланс',
        materialRestocked: 'Материал пополнен', couldNotRestockMaterial: 'Не удалось пополнить материал',
        productRestocked: 'Продукция пополнена', couldNotRestockProduct: 'Не удалось пополнить продукцию',
        couldNotLoadExpenses: 'Не удалось загрузить расходы', expenseAdded: 'Расход добавлен', couldNotAddExpense: 'Не удалось добавить расход',

        // Purchases tabs
        purchasesTab: 'Покупки', materialsTab: 'Материалы', sellersTab: 'Продавцы', debtsTab: 'Долги',
        // Sales tabs
        salesTab: 'Продажи', clientsTab: 'Клиенты', productsTab: 'Товары', debtorsTab: 'Должники',

        // PurchasesList
        purchasesTotalLabel: 'Сумма покупок', filterBtn: 'Фильтр', newPurchaseBtn: 'Новая покупка',
        materialLabel: 'Материал', sellerLabel: 'Продавец', quantityShort: 'Кол-во',
        addCommentPlaceholder: '+ добавить', confirmDeletePurchase: 'Удалить эту покупку?',
        noPurchasesYet: 'Покупок пока нет',
        // SalesList
        salesTotalLabel: 'Сумма продаж', newSaleBtn: 'Новая продажа', clientLabel: 'Клиент',
        productLabel: 'Товар', itemsLabel: 'Товары', clientCategoryLabel: 'Категория клиента',
        confirmDeleteSale: 'Удалить эту продажу?', noSalesYet: 'Продаж пока нет',

        // New/edit purchase modal
        newPurchaseTitle: 'Новая покупка', editPurchaseTitle: 'Изменить покупку',
        chooseMaterialPlaceholder: 'Выберите материал', purchasePriceLabel: 'Цена (сколько заплатили за покупку)',
        paidDefaultFullLabel: 'Оплачено (по умолчанию — вся сумма)', paymentMethodLabel: 'Способ оплаты',
        confirmEditPurchase: 'Изменить эту покупку?',

        // New/edit sale modal
        newSaleTitle: 'Новая продажа', editSaleTitle: 'Изменить продажу',
        chooseClientPlaceholder: 'Выберите клиента', addItemBtn: 'Добавить товар',
        saleTotalDefaultLabel: 'Итоговая сумма (по умолчанию — {total}, можно изменить)',
        confirmEditSale: 'Изменить эту продажу?',

        // Materials
        manageUnitsTitle: 'Единицы измерения', unitExamplePlaceholder: 'Например: коробка',
        categoryNamePlaceholder: 'Название категории', addCategoryBtn: 'Добавить категорию', unitsBtn: 'Единицы измерения',
        newMaterialTitle: 'Новый материал', noMaterialsYet: 'Материалов пока нет',
        // Sellers
        newSellerTitle: 'Новый продавец', noSellersYet: 'Продавцов пока нет',
        // Debts
        totalSupplierDebtLabel: 'Общий долг перед поставщиками', noDebtsYet: 'Долгов нет',
        // Clients
        newClientTitle: 'Новый клиент', noClientsYet: 'Клиентов пока нет',
        // Products
        newProductTitle: 'Новый товар', noProductsYet: 'Товаров пока нет',
        salePriceDefaultLabel: 'Цена продажи (по умолчанию для новой продажи)', initialStockLabel: 'Начальный остаток на складе',
        // Debtors
        totalClientDebtLabel: 'Общий долг клиентов', salesWithDebtLabel: 'Продаж с долгом', noDebtorsYet: 'Должников нет',

        // Dashboard
        dashboardTitle: 'Дашборд', periodWeek: 'Неделя', periodMonth: 'Месяц', periodYear: 'Год',
        incomeLabel: 'Доходы', expenseLabel: 'Расходы', netProfitLabel: 'Чистая прибыль',
        statsTitle: 'Статистика', debtorsCountLabel: 'Должников', sellerDebtsCountLabel: 'Наш долг поставщикам',
        soldThisMonthLabel: 'Продано товаров (этот месяц)', purchasesThisMonthLabel: 'Покупок (этот месяц)',
        expenseThisMonthLabel: 'Расходы (этот месяц)', pcsShort: 'шт.',
        // Finance
        financeTitle: 'Финансы', receiptsTotalLabel: 'Сумма поступлений', newPaymentBtn: 'Новый платёж',
        newPaymentTitle: 'Новый платёж', chooseDebtorPlaceholder: 'Выберите должника', currentDebtLabel: 'Текущий долг',
        paymentAmountLabel: 'Сумма платежа', confirmDeletePayment: 'Удалить этот платёж?',
        confirmEditPayment: 'Изменить этот платёж?', noPaymentsYet: 'Платежей пока нет', noDebtorsToPayLabel: 'Нет должников для оплаты',
        receiptsTab: 'Поступления', expensesTab: 'Расходы',
        // Expenses
        expensesTotalLabel: 'Сумма расходов', newExpenseBtn: 'Новый расход', newExpenseTitle: 'Новый расход',
        editExpenseTitle: 'Изменить расход', confirmDeleteExpense: 'Удалить этот расход?', confirmEditExpense: 'Изменить этот расход?',
        noExpensesYet: 'Расходов пока нет', paySupplierLabel: 'Оплата поставщику (если есть)',
        // Settings
        settingsTitle: 'Настройки', topUpBalanceTitle: 'Пополнить баланс', restockMaterialTitle: 'Пополнить материал',
        restockBtn: 'Пополнить', restockProductBtn: 'Пополнить продукцию', restockProductTitle: 'Пополнить продукцию',
        balanceAdjustmentsListTitle: 'История пополнений баланса', noBalanceAdjustmentsYet: 'Пополнений пока нет',
        confirmDeleteBalanceAdjustment: 'Удалить это пополнение?', confirmEditBalanceAdjustment: 'Изменить это пополнение?',
        chooseMaterialToRestockPlaceholder: 'Выберите материал', chooseProductPlaceholder: 'Выберите товар',
        quantityToAddLabel: 'Количество для добавления', settingsHint: 'Ручные корректировки для приведения платформы в соответствие с реальным бизнесом',
    },
    uz: {
        save: 'Saqlash', cancel: 'Bekor qilish', add: "Qo'shish", edit: "O'zgartirish", delete: "O'chirish",
        loading: 'Yuklanmoqda...', areYouSure: 'Ishonchingiz komilmi?', confirm: 'Tasdiqlash',
        dateCol: 'Sana', dateFromLabel: 'Sanadan', dateToLabel: 'Sanagacha',
        categoryLabel: 'Kategoriya', amountLabel: "Miqdor", commentLabel: 'Izoh',
        phoneLabel: 'Telefon', personNameLabel: 'Ism', itemNameLabel: 'Nomi', passwordLabel: 'Parol',
        otherCategory: 'Boshqa', anyOption: 'Har qanday', anyCategoryOption: 'Har qanday',
        chooseOption: 'Tanlang', notSpecified: "Ko'rsatilmagan", notFoundOption: 'Hech narsa topilmadi',
        searchPlaceholder: 'Qidirish...', apply: "Qo'llash", manageCategoriesTitle: 'Kategoriyalarni boshqarish',
        allOption: 'Hammasi', paidLabel: "To'langan", debtLabel: 'Qarz', methodLabel: 'Usul',
        unitLabel: "O'lchov birligi", stockLabel: 'Ombordagi', priceLabel: 'Narx', quantityLabel: 'Miqdor',
        showPasswordLabel: "Parolni ko'rsatish", hidePasswordLabel: 'Parolni yashirish', menuLabel: 'Menyu',
        mixedMethodBtn: "Xar xil to'lov", addMethodRowBtn: "Usul qo'shish", splitTotalLabel: "Bo'lingan summa",

        methodCash: 'Naqd pul', methodCard: 'Karta', methodBankTransfer: "O'tkazma",
        methodClick: 'Click', methodPayme: 'Payme', methodApelsin: 'Apelsin',

        navDashboard: 'Bosh sahifa', navPurchases: 'Xaridlar', navSales: 'Sotuvlar', navFinance: 'Moliya', navSettings: 'Sozlamalar',
        balanceCash: 'Naqd pul', balanceCard: 'Karta',
        balanceBankTransfer: "Hisobda (o'tkazmadan)", logoutBtn: 'Chiqish',

        loginTitle: 'Panelga kirish', signInBtn: 'Kirish', signingInBtn: 'Kirilmoqda...',
        sessionExpired: 'Sessiya tugadi, qaytadan kiring', loginFailed: 'Kirib bo\'lmadi',
        confirmLogout: 'Hisobdan chiqasizmi?', welcomeMessage: 'Xush kelibsiz',

        couldNotAdd: "Qo'shib bo'lmadi", couldNotEdit: "O'zgartirib bo'lmadi", couldNotDelete: "O'chirib bo'lmadi",
        couldNotLoadUnits: "O'lchov birliklarini yuklab bo'lmadi", unitAdded: "O'lchov birligi qo'shildi",
        couldNotLoadCategories: 'Kategoriyalarni yuklab bo\'lmadi', categoryAdded: "Kategoriya qo'shildi",
        couldNotLoadMaterials: 'Materiallarni yuklab bo\'lmadi', materialAdded: "Material qo'shildi",
        couldNotLoadSellers: 'Sotuvchilarni yuklab bo\'lmadi', sellerAdded: "Sotuvchi qo'shildi",
        couldNotLoadPurchases: 'Xaridlarni yuklab bo\'lmadi', couldNotLoadDebts: 'Qarzlarni yuklab bo\'lmadi',
        purchaseAdded: "Xarid qo'shildi", couldNotAddPurchase: "Xaridni qo'shib bo'lmadi",
        couldNotLoadClients: 'Mijozlarni yuklab bo\'lmadi', clientAdded: "Mijoz qo'shildi",
        couldNotLoadProducts: 'Mahsulotlarni yuklab bo\'lmadi', productAdded: "Mahsulot qo'shildi",
        couldNotLoadSales: 'Sotuvlarni yuklab bo\'lmadi', couldNotLoadDebtors: 'Qarzdorlarni yuklab bo\'lmadi',
        saleAdded: "Sotuv qo'shildi", couldNotAddSale: "Sotuvni qo'shib bo'lmadi",
        couldNotLoadBalance: 'Balansni yuklab bo\'lmadi',
        couldNotLoadPayments: "To'lovlarni yuklab bo'lmadi", paymentAdded: "To'lov qo'shildi",
        couldNotAddPayment: "To'lovni qo'shib bo'lmadi", amountExceedsDebtError: 'Summa mijoz qarzidan katta',
        couldNotLoadDashboard: "Dashboardni yuklab bo'lmadi",
        balanceAdjustmentAdded: "Balans to'ldirildi", couldNotAddBalanceAdjustment: "Balansni to'ldirib bo'lmadi",
        materialRestocked: "Material to'ldirildi", couldNotRestockMaterial: "Materialni to'ldirib bo'lmadi",
        productRestocked: "Mahsulot to'ldirildi", couldNotRestockProduct: "Mahsulotni to'ldirib bo'lmadi",
        couldNotLoadExpenses: "Xarajatlarni yuklab bo'lmadi", expenseAdded: "Xarajat qo'shildi", couldNotAddExpense: "Xarajatni qo'shib bo'lmadi",

        purchasesTab: 'Xaridlar', materialsTab: 'Materiallar', sellersTab: 'Sotuvchilar', debtsTab: 'Qarzlar',
        salesTab: 'Sotuvlar', clientsTab: 'Mijozlar', productsTab: 'Mahsulotlar', debtorsTab: 'Qarzdorlar',

        purchasesTotalLabel: 'Xaridlar summasi', filterBtn: 'Filtr', newPurchaseBtn: 'Yangi xarid',
        materialLabel: 'Material', sellerLabel: 'Sotuvchi', quantityShort: 'Miqdori',
        addCommentPlaceholder: "+ qo'shish", confirmDeletePurchase: 'Bu xaridni o\'chirasizmi?',
        noPurchasesYet: "Hozircha xaridlar yo'q",
        salesTotalLabel: 'Sotuvlar summasi', newSaleBtn: 'Yangi sotuv', clientLabel: 'Mijoz',
        productLabel: 'Mahsulot', itemsLabel: 'Mahsulotlar', clientCategoryLabel: 'Mijoz kategoriyasi',
        confirmDeleteSale: 'Bu sotuvni o\'chirasizmi?', noSalesYet: "Hozircha sotuvlar yo'q",

        newPurchaseTitle: 'Yangi xarid', editPurchaseTitle: "Xaridni o'zgartirish",
        chooseMaterialPlaceholder: 'Materialni tanlang', purchasePriceLabel: 'Narx (xarid uchun to\'langan summa)',
        paidDefaultFullLabel: "To'langan (odatda - to'liq summa)", paymentMethodLabel: "To'lov usuli",
        confirmEditPurchase: 'Bu xaridni o\'zgartirasizmi?',

        newSaleTitle: 'Yangi sotuv', editSaleTitle: "Sotuvni o'zgartirish",
        chooseClientPlaceholder: 'Mijozni tanlang', addItemBtn: "Mahsulot qo'shish",
        saleTotalDefaultLabel: "Umumiy summa (odatda - {total}, o'zgartirish mumkin)",
        confirmEditSale: 'Bu sotuvni o\'zgartirasizmi?',

        manageUnitsTitle: "O'lchov birliklari", unitExamplePlaceholder: 'Masalan: quti',
        categoryNamePlaceholder: 'Kategoriya nomi', addCategoryBtn: "Kategoriya qo'shish", unitsBtn: "O'lchov birliklari",
        newMaterialTitle: 'Yangi material', noMaterialsYet: "Hozircha materiallar yo'q",
        newSellerTitle: 'Yangi sotuvchi', noSellersYet: "Hozircha sotuvchilar yo'q",
        totalSupplierDebtLabel: 'Yetkazib beruvchilarga umumiy qarz', noDebtsYet: "Qarzlar yo'q",
        newClientTitle: 'Yangi mijoz', noClientsYet: "Hozircha mijozlar yo'q",
        newProductTitle: 'Yangi mahsulot', noProductsYet: "Hozircha mahsulotlar yo'q",
        salePriceDefaultLabel: "Sotuv narxi (yangi sotuv uchun odatdagi)", initialStockLabel: 'Boshlang\'ich ombordagi miqdor',
        totalClientDebtLabel: 'Mijozlarning umumiy qarzi', salesWithDebtLabel: 'Qarzdor sotuvlar', noDebtorsYet: "Qarzdorlar yo'q",

        // Dashboard
        dashboardTitle: 'Boshqaruv paneli', periodWeek: 'Hafta', periodMonth: 'Oy', periodYear: 'Yil',
        incomeLabel: 'Daromad', expenseLabel: 'Xarajat', netProfitLabel: 'Sof foyda',
        statsTitle: 'Statistika', debtorsCountLabel: 'Qarzdorlar', sellerDebtsCountLabel: 'Yetkazib beruvchilarga qarzimiz',
        soldThisMonthLabel: 'Sotilgan mahsulotlar (bu oy)', purchasesThisMonthLabel: 'Xaridlar (bu oy)',
        expenseThisMonthLabel: 'Xarajat (bu oy)', pcsShort: 'dona',
        // Finance
        financeTitle: 'Moliya', receiptsTotalLabel: 'Tushumlar summasi', newPaymentBtn: "Yangi to'lov",
        newPaymentTitle: "Yangi to'lov", chooseDebtorPlaceholder: 'Qarzdorni tanlang', currentDebtLabel: 'Joriy qarz',
        paymentAmountLabel: "To'lov summasi", confirmDeletePayment: "Bu to'lovni o'chirasizmi?",
        confirmEditPayment: "Bu to'lovni o'zgartirasizmi?", noPaymentsYet: "Hozircha to'lovlar yo'q", noDebtorsToPayLabel: "To'lov uchun qarzdorlar yo'q",
        receiptsTab: 'Tushumlar', expensesTab: 'Xarajatlar',
        // Expenses
        expensesTotalLabel: 'Xarajatlar summasi', newExpenseBtn: 'Yangi xarajat', newExpenseTitle: 'Yangi xarajat',
        editExpenseTitle: "Xarajatni o'zgartirish", confirmDeleteExpense: "Bu xarajatni o'chirasizmi?", confirmEditExpense: "Bu xarajatni o'zgartirasizmi?",
        noExpensesYet: "Hozircha xarajatlar yo'q", paySupplierLabel: 'Yetkazib beruvchiga to\'lov (bo\'lsa)',
        // Settings
        settingsTitle: 'Sozlamalar', topUpBalanceTitle: "Balansni to'ldirish", restockMaterialTitle: "Materialni to'ldirish",
        restockBtn: "To'ldirish", restockProductBtn: "Mahsulotni to'ldirish", restockProductTitle: "Mahsulotni to'ldirish",
        balanceAdjustmentsListTitle: "Balans to'ldirishlar tarixi", noBalanceAdjustmentsYet: "Hozircha to'ldirishlar yo'q",
        confirmDeleteBalanceAdjustment: "Bu to'ldirishni o'chirasizmi?", confirmEditBalanceAdjustment: "Bu to'ldirishni o'zgartirasizmi?",
        chooseMaterialToRestockPlaceholder: 'Materialni tanlang', chooseProductPlaceholder: 'Mahsulotni tanlang',
        quantityToAddLabel: "Qo'shiladigan miqdor", settingsHint: 'Platformani haqiqiy biznes holatiga moslashtirish uchun qo\'lda tuzatishlar',
    },
}
