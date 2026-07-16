// director app chrome text (navigation, login, sign-out). Data the director manages (student
// names, group schedules, etc.) is never translated - only the app's own UI shell.
export const LANGUAGE_LABELS = { en: 'English', ru: 'Русский', uz: "O'zbekcha" }

export const TRANSLATIONS = {
  en: {
    navOverview: 'Overview', navBranches: 'Branches map', navStudents: 'Students', navAdmins: 'Admins',
    navTeachers: 'Teachers', navGroups: 'Groups', navCourses: 'Courses', navHomework: 'Homework',
    navAttendance: 'Attendance', navPricing: 'Pricing', navSettings: 'Settings',
    directorLabel: 'director', signOut: 'Sign out',
    directorConsole: 'director console', phone: 'Phone number', password: 'Password',
    signIn: 'Sign in', signingIn: 'Signing in…', language: 'Language',
  },
  ru: {
    navOverview: 'Обзор', navBranches: 'Карта филиалов', navStudents: 'Студенты', navAdmins: 'Админы',
    navTeachers: 'Учителя', navGroups: 'Группы', navCourses: 'Курсы', navHomework: 'Домашние задания',
    navAttendance: 'Посещаемость', navPricing: 'Цены', navSettings: 'Настройки',
    directorLabel: 'директор', signOut: 'Выйти',
    directorConsole: 'панель директора', phone: 'Номер телефона', password: 'Пароль',
    signIn: 'Войти', signingIn: 'Вход…', language: 'Язык',
  },
  uz: {
    navOverview: 'Umumiy', navBranches: 'Filiallar xaritasi', navStudents: 'Talabalar', navAdmins: 'Adminlar',
    navTeachers: "O'qituvchilar", navGroups: 'Guruhlar', navCourses: 'Kurslar', navHomework: 'Uy vazifalari',
    navAttendance: 'Davomat', navPricing: 'Narxlar', navSettings: 'Sozlamalar',
    directorLabel: 'direktor', signOut: 'Chiqish',
    directorConsole: 'direktor paneli', phone: 'Telefon raqami', password: 'Parol',
    signIn: 'Kirish', signingIn: 'Kirilmoqda…', language: 'Til',
  },
}
