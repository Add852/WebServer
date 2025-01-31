const express = require('express');
const http = require('http');
const { Client } = require('ssh2');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files (HTML, CSS, JS)
app.use(express.static('public'));

io.on('connection', (socket) => {
    console.log('A client connected');

    const conn = new Client();

    socket.on('ssh-connect', (config) => {
        conn.on('ready', () => {
            console.log('SSH Connection Ready');
            socket.emit('ssh-connected');

            conn.shell((err, stream) => {
                if (err) {
                    return socket.emit('ssh-error', err.message);
                }

                // Forward data from the SSH stream to the client
                stream.on('data', (data) => {
                    socket.emit('ssh-data', data.toString());
                });

                // Forward data from the client to the SSH stream
                socket.on('ssh-command', (command) => {
                    stream.write(command);
                });

                // Handle stream closure
                stream.on('close', () => {
                    console.log('SSH Stream Closed');
                    socket.emit('ssh-closed');
                    conn.end();
                });
            });
        });

        conn.on('error', (err) => {
            console.error('SSH Error:', err);
            socket.emit('ssh-error', err.message);
        });

        conn.on('close', () => {
            console.log('SSH Connection Closed');
            socket.emit('ssh-closed');
        });

        // Connect to the SSH server
        conn.connect(config);
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected');
        conn.end();
    });
});

const PORT = process.env.PORT || 3000;

// Listens for index.html
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});