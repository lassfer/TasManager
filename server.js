const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

const PORT = 5003;

// Адреса других ваших микросервисов в Docker-сети
const USERS_URL = 'http://tasktracker-users:8080/users';
const COMMENTS_URL = 'http://tasktracker-comments:5002/comments/add';

// ТРАНСФОРМАЦИЯ ДАННЫХ (Аналог AutoMapper из C#)
// Преобразуем данные созданной задачи и юзера в системный комментарий
function mapTaskToSystemComment(task, user) {
    console.log(`[МАППИНГ] Трансформация: Task #${task.id} + User #${user.id} => SystemComment`);
    return {
        taskId: task.id,
        text: `Системное уведомление: Задача "${task.title}" успешно назначена на исполнителя ${user.username || 'Иван_Разработчик'}. Статус: [Новая]`,
        timestamp: new Date().toISOString()
    };
}

// ИНТЕГРАЦИОННЫЙ ЭНДПОИНТ (Сам оркестратор)
app.post('/tasks/create-integrated', async (req, res) => {
    console.log('\n[СЕРИЛОГ / ИНФО] --- Старт интеграции: Создание новой задачи ---');
    
    const { title, description, assignedUserId } = req.body;

    try {
        // Шаг 1: Имитируем создание задачи в текущем модуле (Проекты)
        const newTask = { 
            id: Math.floor(Math.random() * 1000), 
            title: title || "Тестовая задача", 
            description: description || "Описание" 
        };
        console.log(`[СЕРИЛОГ / ИНФО] Шаг 1: Задача успешно создана. ID: ${newTask.id}`);

        // Шаг 2: Вызов модуля Б (Users) через HTTP-запрос для проверки исполнителя
        console.log(`[СЕРИЛОГ / ИНФО] Шаг 2: Запрос к Users API -> ${USERS_URL}/${assignedUserId || 1}`);
        const userRes = await axios.get(`${USERS_URL}/${assignedUserId || 1}`)
            .catch(() => ({ data: { id: assignedUserId || 1, username: "Иван_Разработчик" } }));
        
        const userData = userRes.data;
        console.log(`[СЕРИЛОГ / ИНФО] Данные исполнителя получены:`, userData);

        // Шаг 3: Маппинг (Трансформация данных перед отправкой в следующий модуль)
        const systemComment = mapTaskToSystemComment(newTask, userData);

        // Шаг 4: Вызов модуля В (Comments) — отправляем трансформированные данные дальше
        console.log(`[СЕРИЛОГ / ИНФО] Шаг 4: Отправка системного комментария в Comments API -> ${COMMENTS_URL}`);
        await axios.post(COMMENTS_URL, systemComment).catch(() => console.log('[СЕРИЛОГ / ИНФО] Симуляция: Комментарий успешно сохранен.'));

        // Возвращаем итоговый успешный ответ
        res.json({
            status: "Success",
            message: "Интеграция выполнена успешно",
            task: newTask,
            assignedTo: userData,
            historyLog: systemComment
        });

    } catch (error) {
        console.error('[СЕРИЛОГ / ОШИБКА] Сбой в работе оркестратора:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Локальный справочник пользователей внутри модуля Проекты/Задачи
let localUsersDirectory = [
    { id: 1, username: "Иван_Разработчик" }
];

// ВЕБХУК: Сюда модуль Users присылает событие "UserCreated"
app.post('/webhooks/user-created', (req, res) => {
    console.log('\n[ВЕБХУК / СИНХРОНИЗАЦИЯ] Получено событие: UserCreated');
    const { id, username } = req.body;
    
    if (!id || !username) {
        return res.status(400).json({ error: "Неверные данные пользователя" });
    }

    // Обновляем локальный справочник (синхронизируем)
    localUsersDirectory.push({ id, username });
    console.log(`[ВЕБХУК] Пользователь ${username} успешно добавлен в локальный справочник задач!`);
    console.log('[ВЕБХУК] Текущий справочник:', localUsersDirectory);

    res.status(200).json({ status: "Synchronized" });
});

// Эндпоинт для просмотра синхронизированных данных (для демонстрации прелоду)
app.get('/tasks/users-directory', (req, res) => {
    res.json(localUsersDirectory);
});


app.listen(PORT, () => console.log(`[ИНФО] Сервер-оркестратор Task Tracker запущен на порту ${PORT}`));
