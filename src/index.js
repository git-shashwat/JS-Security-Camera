const path = require('path');
const http = require('http');
const express = require('express');
const socketio = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

const port = 3000 || process.env.PORT;
const publicDirPath = path.join(__dirname, '../public');

app.use(express.static(publicDirPath));

app.get('/', (req, res) => {
    res.sendFile('index.html')
})

io.on('connection', (socket) => {
    console.log('new connection');

    socket.on('join', (options) => {
        console.log(options);
    });

    socket.on('alert', (rms, callback) => {
        io.emit('alertMessage', rms);
    })
});

server.listen(port, () => {
    console.log('server is running on port: ', port);
});