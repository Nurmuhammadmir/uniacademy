// admin app chrome text (navigation, login, sign-out). Data the admin manages (student names,
// payments, etc.) is never translated - only the app's own UI shell.
export const LANGUAGE_LABELS = { en: 'English', ru: 'Русский', uz: "O'zbekcha", kaa: 'Qaraqalpaqsha' }

export const TRANSLATIONS = {
  en: {
    navStudents: 'Students', navGroups: 'Groups', navPayments: 'Payments', navTeachers: 'Teachers', navProfile: 'Profile',
    signOut: 'Sign out',
    frontDeskConsole: 'branch front-desk console', phone: 'Phone number', password: 'Password',
    signIn: 'Sign in', signingIn: 'Signing in…', language: 'Language',
  },
  ru: {
    navStudents: 'Студенты', navGroups: 'Группы', navPayments: 'Платежи', navTeachers: 'Учителя', navProfile: 'Профиль',
    signOut: 'Выйти',
    frontDeskConsole: 'панель администратора филиала', phone: 'Номер телефона', password: 'Пароль',
    signIn: 'Войти', signingIn: 'Вход…', language: 'Язык',
  },
  uz: {
    navStudents: 'Talabalar', navGroups: 'Guruhlar', navPayments: "To'lovlar", navTeachers: "O'qituvchilar", navProfile: 'Profil',
    signOut: 'Chiqish',
    frontDeskConsole: 'filial administratori paneli', phone: 'Telefon raqami', password: 'Parol',
    signIn: 'Kirish', signingIn: 'Kirilmoqda…', language: 'Til',
  },
  kaa: {
    navStudents: 'Studentler', navGroups: 'Gruppalar', navPayments: "Tólemler", navTeachers: "Oqıtıwshılar", navProfile: 'Profil',
    signOut: 'Shıǵıw',
    frontDeskConsole: 'filial administratorı panelі', phone: 'Telefon nomeri', password: 'Parol',
    signIn: 'Kiriw', signingIn: 'Kirilmekte…', language: 'Til',
  },
}
