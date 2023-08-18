const endpoints = []; // Array to store the endpoints

// Middleware to log endpoints
app.use((req, res, next) => {
    const endpoint = req.originalUrl; // Getting the original URL
    if (!endpoints.includes(endpoint)) {
        endpoints.push(endpoint); // Adding to the array if not already present
    }
    next(); // Continue to the next middleware or route handler
});

app.get('/endpoints', (req, res) => {
    res.json(endpoints);
});


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
