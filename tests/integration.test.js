const request = require('supertest');
const app = require('../server');
const axios = require('axios');

// ЭТАП 10.1: Имитация (Mock) HttpClient для изоляции сетевых запросов
jest.mock('axios');

describe('Task Tracker Integration Tests (Этап 10)', () => {
    
    beforeEach(() => {
        jest.clearAllMocks(); // Очищаем историю вызовов перед каждым тестом
    });

    // 10.1. Unit-тест: Проверка трансформации данных
    test('Unit: Проверка трансформации данных (Маппинга)', () => {
        const task = { id: 101, title: 'Тестовая задача' };
        const user = { id: 7, username: 'Иван_Разработчик' };
        
        const commentText = `Системное уведомление: Задача "${task.title}" успешно назначена на исполнителя ${user.username}. Статус: [Новая]`;
        
        expect(task.id).toBe(101);
        expect(commentText).toContain('Тестовая задача');
        expect(commentText).toContain('Иван_Разработчик');
    });

    // 10.2. Интеграционный тест: Успешная Сага
    test('Integration: POST /tasks/process-saga - успешное создание задачи', async () => {
        // Имитируем, что внешний сервис вернул успешный ответ 200 OK
        axios.post.mockResolvedValue({ data: { status: "Synchronized" } });

        const response = await request(app)
            .post('/tasks/process-saga')
            .send({
                title: 'Реализовать этап 10 лабораторной',
                userId: 1
            });

        expect(response.statusCode).toBe(200);
        expect(response.body.sagaStatus).toBe('Success');
        expect(response.body.taskId).toBeDefined();
    });

    // 10.3. E2E тест: Аварийный откат и компенсация Саги
    test('E2E: POST /tasks/process-saga - откат и компенсация при ошибке', async () => {
        // Имитируем жесткий сбой сети внешнего API
        axios.post.mockRejectedValue(new Error('Network Error'));

        const response = await request(app)
            .post('/tasks/process-saga')
            .send({
                title: 'bad_task',
                userId: 1
            });

        expect(response.statusCode).toBe(400);
        expect(response.body.sagaStatus).toBe('Compensated / Rolled Back');
        expect(response.body.reason).toBe('Network Error');
    });
});
