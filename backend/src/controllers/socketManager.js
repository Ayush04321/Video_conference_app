import { Server, Socket } from "socket.io";

let connections = {};
let messages = {};
let timeOnline = {};

const connectToSocket = (server) => {
    const io = new Server(server,{
        cors:{
            origin:"*",
            methods:["GET","POST"],
            allowedHeaders:["*"],
            credentials:true,
        }
    });

    io.on("connection", (socket) => {
       console.log("Something connnected");
        socket.on("join-call", (path) => {
            if (connections[path] === undefined) {
                connections[path] = [];
            }

           
            if (!connections[path].includes(socket.id)) {
                connections[path].push(socket.id);
            }
            
            timeOnline[socket.id] = new Date();

            
            for (let a = 0; a < connections[path].length; a++) {
                io.to(connections[path][a]).emit("user-joined", socket.id, connections[path]);
            }

       
            if (messages[path] !== undefined) {
                for (let a = 0; a < messages[path].length; ++a) {
                    io.to(socket.id).emit(
                        "chat-message",
                        messages[path][a]['data'],
                        messages[path][a]['sender'],
                        messages[path][a]['socket-id-sender']
                    );
                }
            }
        });

        socket.on("signal", (toId, message) => {
            io.to(toId).emit("signal", socket.id, message);
        });

        socket.on("chat-message", (data, sender) => {
            const [matchingRoom, found] = Object.entries(connections).reduce(
                ([Room, isFound], [roomKey, roomValue]) => {
                    if (!isFound && roomValue.includes(socket.id)) {
                        return [roomKey, true];
                    }
                    return [Room, isFound];
                },
                ['', false]
            );

            if (found === true) {
                if (messages[matchingRoom] === undefined) {
                    messages[matchingRoom] = [];
                }

                messages[matchingRoom].push({
                    'sender': sender,
                    'data': data,
                    'socket-id-sender': socket.id
                });

                console.log("message", matchingRoom, ":", sender, data);

                connections[matchingRoom].forEach((elem) => {
                    io.to(elem).emit("chat-message", data, sender, socket.id);
                });
            }
        });

        socket.on("disconnect", () => {
            delete timeOnline[socket.id]; // Cleanup memory

            for (const [roomKey, roomUsers] of Object.entries(connections)) {
                if (roomUsers.includes(socket.id)) {
                    // Notify remaining users in room
                    roomUsers.forEach((userId) => {
                        if (userId !== socket.id) {
                            io.to(userId).emit("user-left", socket.id);
                        }
                    });

                    // Remove socket from room
                    connections[roomKey] = roomUsers.filter((id) => id !== socket.id);

                    // Delete empty room
                    if (connections[roomKey].length === 0) {
                        delete connections[roomKey];
                    }
                }
            }
        });
    });

    return io;
};

export default connectToSocket;





// import {Server, Socket} from "socket.io";

// let connections={};
// let messages={};
// let timeOnline={};




// const connectToSocket=(server)=>{
//     const io=new Server(server);





//     /// yha hm ky kr rhe , yha hm sbse phle connection etablish kia 
//     io.on("connection",(socket)=>{
//         socket.on("join call",(path)=>{
//             //ydi room khali h ya is room m koi nhi h , woh  check kr rhe
//             if(connections[path]===undefined){
//                 connections[path]=[];
//             }

//             // us room m is wale user ko push kr denge , aur socket.id wala user add ho jyga
//             connections[path].push(socket.id);
//             timeOnline[socket.id]=new Date();


//             //yha sbke ps msg pauch jyga k socket.io wala user addd ho chuka h chatroom m
//             for(let a=0;a<connections[path].length;a++){
//                 io.to(connections[path][a]).emit("user-joined",socket.id,connections[path]);
//             }


//             // iisse nye user k ps room k sare purane msg ki history aa jygi jo bhi yha phle chat chli thi 
//             if(messages[path]!==undefined){
//                 for(let a=0 ; a<messages[path].length;++a){
//                     io.to(socket.id).emit("chat-message",messages[path][a]['data'],
//                         messages[path][a]['sender'],messages[path][a]['socket-id-sender'])
                    
//                 }
//             }
//         })






//         socket.on("signal",(toId,message)=>{
//             io.to(toId).emit("signal", socket.id ,message);
//         });






//         socket.on("chat-message",(data,sender)=>{
//            const [matchingRoom,found]=Object.entries(connections)
//            .reduce(([Room,isFound],[roomKey,roomValue])=>{
//             if(!isFound && roomValue.includes(socket.id)){
//                 return [roomKey,true];
//             }
//             return[Room,isFound];
//            },['',false]) ;


//            if(found===true){
//            if(messages[matchingRoom]===undefined){
//             messages[matchingRoom]=[]
//            }
//            messages[matchingRoom].push({'sender':sender,"data":data,"socket-id-sender":socket.id});
//          console.log("message",matchingRoom, ":",sender,data);

//         connections[matchingRoom].forEach((elem)=>{
//             io.to(elem).emit("chat-message",data,sender,socket.id);
//         });
//         }
//         })







//        socket.on("disconnect", () => {
//             delete timeOnline[socket.id]; // Clean up memory

//             for (const [roomKey, roomUsers] of Object.entries(connections)) {
//                 if (roomUsers.includes(socket.id)) {
//                     // Notify other users in the room
//                     roomUsers.forEach((userId) => {
//                         io.to(userId).emit("user-left", socket.id);
//                     });

//                     // Remove socket from the array
//                     connections[roomKey] = roomUsers.filter((id) => id !== socket.id);

//                     // Delete room if empty
//                     if (connections[roomKey].length === 0) {
//                         delete connections[roomKey];
//                     }
//                 }
//                }
//         })
//     } )
//     return io;
// }
// export default connectToSocket;