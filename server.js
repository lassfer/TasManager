const express = require('express');

const app = express();

app.use(express.json());

const comments = [
    { id: 1, taskId: 1, text: 'Finish today' }
];

app.get('/comments', (req, res) => {
    res.json(comments);
});

app.post('/comments/add', (req, res) => {
    res.json({
        message: 'Comment added',
        comment: req.body
    });
});

app.listen(5003, () => {
    console.log('Server running on port 5003');
});