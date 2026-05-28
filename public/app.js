// Переменные для динамического подсчета статистики
let countDoneNum = 0;
let countCancelledNum = 0;

// Чтение исполнителей из кэша
document.getElementById('btnLoadUsers').addEventListener('click', async () => {
    const container = document.getElementById('usersContainer');
    container.innerHTML = '<div class="spinner-border spinner-border-sm text-success" role="status"></div> <span class="small text-muted ms-2">Чтение оперативной памяти...</span>';
    try {
        const response = await fetch('/tasks/users-directory');
        const users = await response.json();
        container.innerHTML = '';
        users.forEach(u => {
            container.innerHTML += `
                <div class="data-item d-flex justify-content-between align-items-center m-0 mb-2" style="padding:12px 16px;">
                    <span><i class="bi bi-person-circle text-indigo-400 me-2" style="color:#818cf8;"></i>${u.username}</span>
                    <span class="badge bg-dark border border-secondary text-secondary">Сотрудник ID: ${u.id}</span>
                </div>`;
        });
    } catch (err) {
        container.innerHTML = '<div class="text-danger small"><i class="bi bi-x-circle-fill me-1"></i> Ошибка связи с кэшем</div>';
    }
});

document.getElementById('btnFlushCache').addEventListener('click', () => {
    document.getElementById('usersContainer').innerHTML = '<div class="status-badge status-fail p-2 small"><i class="bi bi-trash-fill"></i><span>Оперативная память кэша очищена.</span></div>';
});

// Отправка формы и управление Канбан-доской
document.getElementById('taskForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const titleInput = document.getElementById('taskTitle').value;
    const taskDesc = document.getElementById('taskDesc').value;
    const taskProject = document.getElementById('taskProject').value;
    const taskUser = document.getElementById('taskUser').value;
    const scenario = document.getElementById('scenarioType').value;
    
    const statusAlert = document.getElementById('statusAlert');
    const responseBlock = document.getElementById('responseBlock');
    const jsonResult = document.getElementById('jsonResult');
    const tableBody = document.getElementById('tasksTableBody');
    const emptyRow = document.getElementById('emptyRow');

    statusAlert.className = "status-badge status-wait";
    statusAlert.innerHTML = `<div class="spinner-border spinner-border-sm" role="status"></div><span>⏳ Проверка лимитов исполнителя и распределение по базам...</span>`;

    const finalTitle = scenario === 'fail' ? 'bad_task' : titleInput;
    const userNameDisplay = taskUser === "1" ? "Иван_Разработчик" : "Petr_QA_Engineer";

    try {
        const response = await fetch('/tasks/process-saga', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: finalTitle, userId: taskUser })
        });

        const result = await response.json();
        responseBlock.classList.remove('d-none');
        jsonResult.innerText = JSON.stringify(result, null, 2);

        if (emptyRow) emptyRow.remove();

        if (response.ok) {
            // Успех: увеличиваем счетчик выполненных задач
            countDoneNum++;
            document.getElementById('countDone').innerText = countDoneNum;

            statusAlert.className = "status-badge status-success";
            statusAlert.innerHTML = `<i class="bi bi-check-circle-fill"></i><span>Успех! Задача успешно записана во все связанные таблицы. Статус: [Выполнено]</span>`;
            
            tableBody.innerHTML = `
                <div class="data-item text-start border-success task-card-item" data-project="${taskProject}" style="background: rgba(16, 185, 129, 0.02); margin-bottom:16px;">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <span class="fw-bold text-white" style="font-size:15px;"><i class="bi bi-journal-bookmark-fill text-success me-2"></i>${titleInput}</span>
                        <span class="badge bg-success-subtle text-success border border-success-subtle">Выполнено</span>
                    </div>
                    <div class="text-muted small mb-3" style="margin-top:6px;"><i class="bi bi-chat-left-text me-1"></i> Комментарий к задаче: <i>"${taskDesc}"</i></div>
                    <div class="d-flex gap-2 flex-wrap">
                        <span class="meta-tag"><i class="bi bi-folder2-open me-1"></i> ${taskProject}</span>
                        <span class="meta-tag"><i class="bi bi-person me-1"></i> ${userNameDisplay}</span>
                        <span class="meta-tag">ID: ${result.taskId}</span>
                    </div>
                </div>` + tableBody.innerHTML;
        } else {
            // Сбой: увеличиваем счетчик отмененных задач
            countCancelledNum++;
            document.getElementById('countCancelled').innerText = countCancelledNum;

            statusAlert.className = "status-badge status-fail";
            statusAlert.innerHTML = `<i class="bi bi-exclamation-triangle-fill"></i><span>Сбой сети! Включена защита: транзакция отменена во всех базах.</span>`;
            
            tableBody.innerHTML = `
                <div class="data-item text-start border-danger task-card-item" data-project="${taskProject}" style="background: rgba(239, 68, 68, 0.02); margin-bottom:16px;">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <span class="text-muted text-decoration-line-through" style="font-size:15px;"><i class="bi bi-journal-x text-danger me-2"></i>${finalTitle}</span>
                        <span class="badge bg-danger-subtle text-danger border border-danger-subtle">Отменено</span>
                    </div>
                    <div class="text-danger small mb-3" style="margin-top:6px;"><i class="bi bi-shield-slash me-1"></i> Безопасность: Данные удалены из PostgreSQL ради целостности.</div>
                    <div class="d-flex gap-2 flex-wrap">
                        <span class="meta-tag"><i class="bi bi-folder2-open me-1"></i> ${taskProject}</span>
                        <span class="meta-tag"><i class="bi bi-person me-1"></i> ${userNameDisplay}</span>
                    </div>
                </div>` + tableBody.innerHTML;
        }
        // Вызываем сброс фильтра, чтобы только что добавленная таска сразу подчинялась правилам
        document.getElementById('filterProject').dispatchEvent(new Event('change'));
    } catch (err) {
        statusAlert.className = "status-badge status-fail";
        statusAlert.innerHTML = `<i class="bi bi-x-circle-fill"></i><span>Критическая ошибка связи с сервером</span>`;
    }
});

// ПОЛЕЗНЫЙ ФУНКЦИОНАЛ №2: Логика фильтрации карточек на фронтенде по значению data-project
document.getElementById('filterProject').addEventListener('change', (e) => {
    const selectedProject = e.target.value;
    const cards = document.querySelectorAll('.task-card-item');
    
    cards.forEach(card => {
        if (selectedProject === 'all' || card.getAttribute('data-project') === selectedProject) {
            card.style.display = 'block'; // Показываем карточку
        } else {
            card.style.display = 'none';  // Скрываем карточку
        }
    });
});
