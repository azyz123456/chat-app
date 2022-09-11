const fs = require("fs");

class User {
    constructor(id, name, isPrivate, roomNum) {
        this.id = id;
        this.name = name;
        this.isPrivate = isPrivate;
        this.roomNum = roomNum;
    }

}

const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
let str = "";
let users = [];
let rooms = ["Room 1", "Room 2", "Room 3", "Room 4", "Room 5"];


app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});




io.on('connection', (socket) => {

    //send files
    socket.on('base64 file', function (msg) {
        console.log('received base64 file');
        console.log(msg.file, msg.fileName);
        io.emit('base64 file',  //include sender
            {
              file: msg.file,
              fileName: msg.fileName
            }
    
        );
    });
    

    //send rooms to the client socket:
    socket.emit('rooms for new user', rooms);

    socket.on('new room', (room) => {
        rooms.push(room);
        io.emit('new room', room);
    });

    socket.on('disconnect', () => {
        for (let i=0; i<users.length; i++) {
            if (users[i].id === socket.id) {
                io.emit('d', users[i].name);
                users.splice(i, 1); // delete user
            }
        }
        
      });
    
      //set room
      socket.on('room', room => { //room is "Room 1", "Room 2", etc.
        for (let i=0; i<users.length; i++) {
            if (users[i].id === socket.id) {
                users[i].roomNum = room;
                io.emit('c', users[i]);
            }
        }
        socket.join(room); 


      });

    socket.on('chat message', (msg) => {
        let sender;

        for (let user of users) {
            if (socket.id===user.id){
                sender = user;
            }
        }

        if (sender.isPrivate) {
            io.to(sender.roomNum).emit(sender.name + " (private message): " + msg);
            socket.emit('private chat message on sender screen', msg);
        } else {
            //with room number:
            socket.to(sender.roomNum).emit('chat message', sender.name + ": " + msg);
        }

                // for flipping a coin:
                if (msg === "-flip coin") {
                    let num = Math.random();
                    if (num < 0.5) {
                        io.to(sender.roomNum).emit('chat message', "Server: Heads!"); 
                    } else {
                        io.to(sender.roomNum).emit('chat message', "Server: Tails!");
                    }
                }

                //8 ball
                else if (msg.indexOf("-8ball") !== -1) {
                    let choices = ["Signs Point to a yes.", "DUH!", "Of Course!", "Definitely.", "Not in a million years...", "No. Just No.", "Perhaps...?"];
                    let index = Math.floor(Math.random()*choices.length);
                    io.to(sender.roomNum).emit('chat message', "8 Ball: " + choices[index]); 
                }
    });
      
    socket.on('c', (msg) => {
        let user = new User(socket.id, msg, false, "Room 1");
        users.push(user);
    });

    socket.on('get online users', (msg) => {
        io.emit('get online users', users);
    });

    socket.on('someone is typing', (msg) => {
        for (let user of users) {
            if (user.id === socket.id) {
                str += user.name + msg;
            }
        }
        io.emit('someone is typing', str);
    });

    socket.on('no longer typing', (msg) => {
        let x = "";
        for (let user of users) {
            if (user.id === socket.id) {
                x = user.name + msg;
            }
        }

        let index = str.indexOf(x);
        str = str.substring(0,index) + str.substring(index + x.length);
        io.emit('no longer typing', str);
    });

    socket.on('private message', (receiver) => {
        let receiverID;
        let sender;
        for (let i=0; i<users.length; i++) {
            if (users[i].id === socket.id) {
                users[i].isPrivate = true;
                sender = users[i];
            }
            else if (users[i].name === receiver) {
                receiverID = users[i].id;
            }
        }
        sender.roomNum = receiverID;
    });
    
    
  });

server.listen(3000, () => {
  console.log('listening on *:3000');
});
