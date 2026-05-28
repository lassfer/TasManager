const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());
app.use(express.static('public')); // Раздача фронтенда из папки public

const PORT = 5003;

// Машина состояний (UML State Machine)
const TaskStatus = {
    NEW: 'New',
    IN_PROGRESS: 'In Progress',
    DONE: 'Done',
    CANCELLED: 'Cancelled'
};

// Имитация базы данных задач для демонстрации
let tasksDb = [];

// Сквозной эндпоинт (Паттерн Сага / Оркестрация)
app.post('/tasks/process-saga', async (req, res) => {
    console.log('\n[САГА / ИНФО] >>> Запуск сквозного сценария создания задачи');
    const { title, userId } = req.body;
    
    let createdTaskId = null;

    try {
        // ЭТАП 7.2: Проверка бизнес-правила (Проверка лимита/остатка задач у юзера)
        console.log(`[САГА / ШАГ 1] Проверка загруженности пользователя ID: ${userId}`);
        const userTasksCount = 4; // Имитируем, что у юзера уже есть 4 задачи
        if (userTasksCount >= 5) {
            throw new Error("Превышен лимит задач для данного исполнителя (макс. 5)!");
        }
        console.log(`[САГА] Проверка пройдена успешно. Пользователь доступен.`);

        // ЭТАП 7.1 & 7.4: Создание задачи в статусе NEW
        const newTask = {
            id: Math.floor(Math.random() * 1000) + 1,
            title: title || "Сквозная задача тестирования",
            userId: userId,
            status: TaskStatus.NEW
        };
        tasksDb.push(newTask);
        createdTaskId = newTask.id;
        console.log(`[САГА / ШАГ 2] Задача #${createdTaskId} успешно создана в статусе: [${newTask.status}]`);

        // Смена статуса: NEW -> IN_PROGRESS
        newTask.status = TaskStatus.IN_PROGRESS;
        console.log(`[САГА / ШАГ 3] Смена статуса State Machine: [New] -> [${newTask.status}]`);

        // Имитируем отправку в модуль Б (Users), что юзер взял задачу
        console.log(`[САГА / ШАГ 4] HttpClient уведомляет модуль Users о назначении задачи...`);

        // ЭТАП 7.3: Реализация транзакционности (Симулируем сбой для демонстрации Саги)
        console.log(`[САГА / ШАГ 5] Попытка отправить системный лог в модуль Comments...`);
        
        // Специально провоцируем ошибку, если передали "bad_task", чтобы показать компенсацию
        if (title === "bad_task") {
            throw new Error("Ошибка связи с модулем Comments API!");
        }

        // Финальная смена статуса: IN_PROGRESS -> DONE
        newTask.status = TaskStatus.DONE;
        console.log(`[САГА / ШАГ 6] Сквозной процесс завершен. Статус State Machine: [${newTask.status}]`);

        res.json({
            sagaStatus: "Success",
            message: "Сквозной процесс успешно выполнен до конца",
            task: newTask
        });

    } catch (error) {
        console.error(`\n[САГА / АЛАРМ] Сбой на одном из шагов: ${error.message}`);
        
        // ЭТАП 7.3: Компенсирующее действие (Откат транзакции / Перевод в Cancelled)
        if (createdTaskId) {
            console.log(`[САГА / КОМПЕНСАЦИЯ] Начинаем откат транзакции для задачи #${createdTaskId}...`);
            const task = tasksDb.find(t => t.id === createdTaskId);
            if (task) {
                task.status = TaskStatus.CANCELLED;
                console.log(`[САГА / КОМПЕНСАЦИЯ] Задача #${createdTaskId} успешно отменена. Статус: [${task.status}]`);
            }
        }
        
        res.status(400).json({
            sagaStatus: "Compensated / Rolled Back",
            reason: error.message,
            taskId: createdTaskId
        });
    }
});

app.listen(PORT, () => console.log(`[ИНФО] Сервер Этапа 7 запущен на порту ${PORT}`));
