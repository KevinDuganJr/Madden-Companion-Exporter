const express = require('express');
const app = express();

const endpoints = [];

app.use((req, res, next) => {
    const endpoint = req.originalUrl;
    if (!endpoints.includes(endpoint)) {
        endpoints.push(endpoint);
    }
    next();
});

// Your existing routes here...

// Route to get the endpoints
app.get('/endpoints', (req, res) => {
    res.json(endpoints);
});

app.listen(app.get('port'), () =>
    console.log('Madden Datastuff is running on port', app.get('port'))
);
