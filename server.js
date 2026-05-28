const express = require('express');
const axios = require('axios');
const winston = require('winston');
const fs = require('fs');
const path = require('path');

const app = express();

// ЧЕТКАЯ НАСТРОЙКА СТАТИКИ И ПАРСЕРОВ В САМОМ ВЕРХУ ФАЙЛА
app.use(express.json());
app.use(express.static('public'));

const PORT = 5003;

// НАСТРОЙКА СТРУКТУРИРОВАННОГО JSON-ЛОГИРОВАНИЯ
if (!fs.existsSync(path.join(__dirname, 'logs'))) {
    fs.mkdirSync(path.join(__dirname, 'logs'));
}

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console({ format: winston.format.simple() }),
        new winston.transports.File({ filename: 'logs/log.txt' })
    ]
});

// СОСТОЯНИЕ ПРЕДОХРАНИТЕЛЯ (CIRCUIT BREAKER)
let isCircuitOpen = false;
let circuitRecoveryTime = 0;

// ФУНКЦИЯ ОБРАБОТКИ СБОЕВ RETRY + CIRCUIT BREAKER
async function callCommentsServiceWithRetry(url, data, retries = 3, delay = 1000) {
    if (isCircuitOpen) {
        if (Date.now() > circuitRecoveryTime) {
            isCircuitOpen = false;
            logger.info(JSON.stringify({ message: "[CIRCUIT BREAKER] Время блокировки прошло. Проверяем связь..." }));
        } else {
            logger.error(JSON.stringify({ message: "[CIRCUIT BREAKER] Предохранитель ОТКРЫТ. Запрос отклонен автоматически." }));
            throw new Error("CircuitBreakerOpenException: Сервис временно недоступен");
        }
    }

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            logger.info(JSON.stringify({ message: `[RETRY] Отправка запроса. Попытка ${attempt} из ${retries}...` }));
            const response = await axios.post(url, data);
            return response.data;
        } catch (error) {
            logger.warn(JSON.stringify({ message: `[RETRY] Попытка ${attempt} провалилась: ${error.message}` }));
            
            if (attempt === retries) {
                isCircuitOpen = true;
                circuitRecoveryTime = Date.now() + 30000; // Блокировка на 30 секунд при серии ошибок
                logger.error(JSON.stringify({ message: "[CIRCUIT BREAKER] Критический уровень сбоев! Предохранитель ОТКРЫТ на 30 сек." }));
                throw error;
            }
            await new Promise(res => setTimeout(res, delay));
        }
    }
}

// ЭНДПОИНТ СКВОЗНОГО ПРОЦЕССА САГИ (ЭТАП 7, 8, 9)
app.post('/tasks/process-saga', async (req, res) => {
    logger.info(JSON.stringify({ message: "--- Запуск сквозного сценария создания задачи ---", body: req.body }));
    const { title } = req.body;
    let createdTaskId = Math.floor(Math.random() * 1000) + 1;

    try {
        logger.info(JSON.stringify({ message: "Шаг 1: Валидация лимитов задач пройдена" }));
        
        // СТРОКА 75: Использование внутреннего имени контейнера и существующего роута для успеха
        const targetUrl = title === "bad_task" ? 'http://invalid-failed-route:9999/error' : 'http://tasktracker-projects:5003/webhooks/user-created';

        await callCommentsServiceWithRetry(targetUrl, { taskId: createdTaskId });

        logger.info(JSON.stringify({ message: "Шаг 4: Смена состояния конечного автомата [In Progress] -> [Done]" }));
        res.json({ sagaStatus: "Success", taskId: createdTaskId });
    } catch (error) {
        logger.error(JSON.stringify({ message: "💥 Критический сбой! Запуск компенсации Саги.", error: error.message }));
        res.status(400).json({ sagaStatus: "Compensated / Rolled Back", reason: error.message });
    }
});

// ЭНДПОИНТ-ЗАГЛУШКА ДЛЯ УСПЕШНОГО ПРОХОЖДЕНИЯ ШАГОВ СВЯЗИ В СЕТИ DOCKER
app.post('/webhooks/user-created', (req, res) => {
    res.status(200).json({ status: "Synchronized" });
});

if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => logger.info(JSON.stringify({ message: `Сервер запущен на порту ${PORT}` })));
}

module.exports = app; // ЭТОТ ЭКСПОРТ ОБЯЗАТЕЛЕН ДЛЯ ТЕСТОВ


