#Требования
Перед началом убедитесь, что у вас установлены следующие инструменты:

Инструмент	Версия	Проверка
Node.js	18.x или выше	node --version
npm	9.x или выше	npm --version
Git	2.x или выше	git --version

#1. Клонирование репозитория
bash
git clone <url-репозитория>
cd attendance-app

#2. Установка зависимостей
bash
Установка всех зависимостей с флагом legacy-peer-deps (из-за конфликта версий React)
npm install --legacy-peer-deps

#3. Запуск в режиме разработки
bash
npm run dev

#4. Зависимости
Production dependencies
Пакет	Версия	Описание
react	19.2.4	Библиотека React
react-dom	19.2.4	DOM-связка для React
react-router-dom	6.22.0	Маршрутизация
axios	1.6.7	HTTP клиент
jwt-decode	4.0.0	Декодирование JWT токенов
lucide-react	0.344.0	Иконки
date-fns	3.3.1	Работа с датами
date-fns-tz	3.2.0	Работа с часовыми поясами

#5. Development dependencies
Пакет	Версия	Описание
vite	5.0.0	Сборщик проекта
typescript	5.2.0	TypeScript
@types/react	19.2.4	Типы для React
@types/react-dom	19.2.4	Типы для React DOM
@types/node	20.11.0	Типы для Node.js
tailwindcss	3.4.0	CSS фреймворк
postcss	8.4.0	Обработчик CSS
autoprefixer	10.4.0	Автопрефиксер CSS
eslint	8.56.0	Линтер
@typescript-eslint/eslint-plugin	6.21.0	ESLint для TypeScript
@typescript-eslint/parser	6.21.0	Парсер TypeScript для ESLint
@vitejs/plugin-react	4.2.0	Плагин React для Vite

#6. Доступные скрипты
Команда	Описание
npm run dev	Запуск в режиме разработки
npm run build	Сборка для production
npm run preview	Предпросмотр production сборки
npm run lint	Проверка кода линтером

#7. Сборка для production
bash
Создание production сборки
npm run build

Результат будет в папке dist/
Можно протестировать локально:
npm run preview

#8. Устранение неполадок
Ошибка ERESOLVE при установке зависимостей
Если при установке возникает ошибка, используйте флаг --legacy-peer-deps:

bash
npm install --legacy-peer-deps

#9. Проблемы с токеном авторизации
Проверьте наличие токена в localStorage:

javascript
localStorage.getItem('token')
Проверьте правильность URL API в .env

Посмотрите логи в консоли браузера (F12)

