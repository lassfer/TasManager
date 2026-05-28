const express = require('express');
const app = express();
const PORT = 5002;

app.get('/comments', (req, res) => {
    res.json([{ id: 1, text: "Тестовый комментарий" }]);
});

app.listen(PORT, () => console.log(`Comments service running on port ${PORT}`));
