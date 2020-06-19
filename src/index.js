const path = require('path')
const http = require('http')
const express = require('express')
const socketio = require('socket.io')
const Filter = require('bad-words')
const { generateMessage, generateLocationMessage } = require('./utils/messages')
const { addUser, removeUser, getUser, getUsersInRoom } = require('./utils/users')

const app = express()
const server = http.Server(app)
const io = socketio(server)

const port = process.env.PORT || 3000
const publicDirectoryPath = path.join(__dirname, '../public')

app.use(express.static(publicDirectoryPath))

let clients = 0

function Disconnect() {
    if (clients > 0) {
        if (clients <= 2){
            this.broadcast.emit("disconnectPeer")
        }
        clients--
    }
}

function SendOffer(offer) {
    console.log('Offer Recieved from Init-node and being relayed to Non-init-node.');
    this.broadcast.emit("BackOffer", offer)
}

function SendAnswer(data) {
    console.log('Relaying the answer from non-init-node to init-node.')
    this.broadcast.emit("BackAnswer", data)
}

io.on('connection', (socket) => {
    console.log('New WebSocket connection')

    socket.emit('custom', () => console.log('asdf'));

    socket.on("NewClient", function () {
        console.log('New Client.')
        if (clients < 2) {
            if (clients == 1) {
                this.emit('CreatePeer')
            }
        }
        else
        this.emit('SessionActive')
        clients++;
    })
    
    socket.on('Offer', SendOffer)

    socket.on('Answer', SendAnswer)
    socket.on('disconnectPeer', Disconnect)
    socket.on('join', (options, callback) => {
        const { error, user } = addUser({ id: socket.id, ...options })

        if (error) {
            return callback(error)
        }

        socket.join(user.room)

        socket.emit('message', generateMessage('Admin', 'Welcome!'))
        socket.broadcast.to(user.room).emit('message', generateMessage('Admin', `${user.username} has joined!`))
        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        })

        callback()
    })

    socket.on('sendMessage', (message, callback) => {
        const user = getUser(socket.id)
        const filter = new Filter()

        if (filter.isProfane(message)) {
            return callback('Profanity is not allowed!')
        }

        io.to(user.room).emit('message', generateMessage(user.username, message))
        callback()
    })

    socket.on('sendLocation', (coords, callback) => {
        const user = getUser(socket.id)
        io.to(user.room).emit('locationMessage', generateLocationMessage(user.username, `https://google.com/maps?q=${coords.latitude},${coords.longitude}`))
        callback()
    })

    socket.on('disconnect', () => {
        const user = removeUser(socket.id)

        if (user) {
            io.to(user.room).emit('message', generateMessage('Admin', `${user.username} has left!`))
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            })
        }
    })
})

server.listen(port, () => {
    console.log(`Server is up on port ${port}!`)
})