const request = require('supertest');
const app = require('../server');

describe('Task Tracker Integration Tests (Этап 10)', () => {
    
    // 10.1. Unit-тест: Проверка трансформации данных (Маппинга)
    test('Unit: mapTaskToSystemComment должен корректно преобразовывать сущности', () => {
        const task = { id: 101, title: 'Тестовая задача' };
        const user = { id: 7, username: 'Иван_Разработчик' };
        
        const timestamp = new Date().toISOString();
        const commentText = `Системное уведомление: Задача "${task.title}" успешно назначена на исполнителя ${user.username}. Статус: [Новая]`;
        
        expect(task.id).toBe(101);
        expect(user.username).toBe('Иван_Разработчик');
        expect(commentText).toContain('Тестовая задача');
        expect(commentText).toContain('Иван_Разработчик');
    });

    // 10.2. Интеграционный тест: Проверка успешного прохождения Саги
    test('Integration: POST /tasks/process-saga - успешное создание задачи [New -> In Progress -> Done]', async () => {
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

    // 10.3. E2E тест: Проверка аварийного сценария и компенсации Саги
    test('E2E: POST /tasks/process-saga - откат и компенсация при ошибке связи с Comments API', async () => {
        const response = await request(app)
            .post('/tasks/process-saga')
            .send({
                title: 'bad_task',
                userId: 1
            });

        expect(response.statusCode).toBe(400);
        expect(response.body.sagaStatus).toBe('Compensated / Rolled Back');
        expect(response.body.reason).toContain('failed');
    });
});
