
import React, { useEffect, useRef, useState } from 'react';
import io from "socket.io-client";
import styles from "../styles/VideoMeet.module.css";
import { Badge, IconButton, TextField, Button } from '@mui/material';
import VideocamIcon from '@mui/icons-material/Videocam';
import VideocamOffIcon from '@mui/icons-material/VideocamOff';
import CallEndIcon from '@mui/icons-material/CallEnd';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import ScreenShareIcon from '@mui/icons-material/ScreenShare';
import StopScreenShareIcon from '@mui/icons-material/StopScreenShare';
import ChatIcon from '@mui/icons-material/Chat';

import server from '../environment';

const server_url = server;

const peerConfigConnections = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" }
    ]
};


const PeerVideo = ({ stream }) => {
    const videoRef = useRef(null);

    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

    return (
        <video
            ref={videoRef}
            autoPlay
            playsInline
            style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "10px" }}
        />
    );
};

export default function VideoMeetComponent() {
    const socketRef = useRef(null);
    const socketIdRef = useRef(null);
    const localVideoref = useRef(null);
    const connections = useRef({});

    const [videoAvailable, setVideoAvailable] = useState(true);
    const [audioAvailable, setAudioAvailable] = useState(true);
    const [video, setVideo] = useState(true);
    const [audio, setAudio] = useState(true);
    const [screen, setScreen] = useState(false);
    const [screenAvailable, setScreenAvailable] = useState(false);

    const [showModal, setModal] = useState(true);
    const [messages, setMessages] = useState([]);
    const [message, setMessage] = useState("");
    const [newMessages, setNewMessages] = useState(0);
    const [askForUsername, setAskForUsername] = useState(true);
    const [username, setUsername] = useState("");
    const [videos, setVideos] = useState([]);

    useEffect(() => {
        getPermissions();
    }, []);

    const getPermissions = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            setVideoAvailable(true);
            setAudioAvailable(true);
            window.localStream = stream;
            if (localVideoref.current) {
                localVideoref.current.srcObject = stream;
            }
        } catch (error) {
            console.error("Device permission error:", error);
            setVideoAvailable(false);
            setAudioAvailable(false);
        }

        if (navigator.mediaDevices.getDisplayMedia) {
            setScreenAvailable(true);
        }
    };

    const addMessage = (data, sender, socketIdSender) => {
        setMessages((prev) => [...prev, { sender, data }]);
        if (socketIdSender !== socketIdRef.current) {
            setNewMessages((prev) => prev + 1);
        }
    };

    const gotMessageFromServer = async (fromId, message) => {
        const signal = JSON.parse(message);
        if (fromId === socketIdRef.current) return;

        const peer = connections.current[fromId];
        if (!peer) return;

        if (signal.sdp) {
            try {
                await peer.setRemoteDescription(new RTCSessionDescription(signal.sdp));
                if (signal.sdp.type === 'offer') {
                    const description = await peer.createAnswer();
                    await peer.setLocalDescription(description);
                    socketRef.current.emit('signal', fromId, JSON.stringify({ sdp: peer.localDescription }));
                }
            } catch (err) {
                console.error("SDP negotiation error:", err);
            }
        }

        if (signal.ice) {
            try {
                await peer.addIceCandidate(new RTCIceCandidate(signal.ice));
            } catch (err) {
                console.error("ICE candidate error:", err);
            }
        }
    };

    const connectToSocketServer = () => {
        socketRef.current = io.connect(server_url, { secure: false });

        socketRef.current.on('signal', gotMessageFromServer);

        socketRef.current.on('connect', () => {
            socketIdRef.current = socketRef.current.id;
            socketRef.current.emit('join-call', window.location.href);

            socketRef.current.on('chat-message', addMessage);

            socketRef.current.on('user-left', (id) => {
                if (connections.current[id]) {
                    connections.current[id].close();
                    delete connections.current[id];
                }
                setVideos((prev) => prev.filter((v) => v.socketId !== id));
            });

            socketRef.current.on('user-joined', (id, clients) => {
                clients.forEach((socketListId) => {
                    if (socketListId === socketIdRef.current) return;
                    if (connections.current[socketListId]) return;

                    const peer = new RTCPeerConnection(peerConfigConnections);
                    connections.current[socketListId] = peer;

                    peer.onicecandidate = (event) => {
                        if (event.candidate != null) {
                            socketRef.current.emit('signal', socketListId, JSON.stringify({ ice: event.candidate }));
                        }
                    };

                    peer.ontrack = (event) => {
                        const stream = event.streams[0];
                        setVideos((prev) => {
                            const exists = prev.find((v) => v.socketId === socketListId);
                            if (exists) {
                                return prev.map((v) => v.socketId === socketListId ? { ...v, stream } : v);
                            }
                            return [...prev, { socketId: socketListId, stream }];
                        });
                    };

                    if (window.localStream) {
                        window.localStream.getTracks().forEach((track) => {
                            peer.addTrack(track, window.localStream);
                        });
                    }
                });

                if (id === socketIdRef.current) {
                    for (let id2 in connections.current) {
                        if (id2 === socketIdRef.current) continue;
                        const peer = connections.current[id2];
                        peer.createOffer()
                            .then((description) => peer.setLocalDescription(description))
                            .then(() => {
                                socketRef.current.emit('signal', id2, JSON.stringify({ sdp: peer.localDescription }));
                            })
                            .catch((e) => console.error(e));
                    }
                }
            });
        });
    };

    const connect = () => {
        setAskForUsername(false);
        connectToSocketServer();
    };

    const sendMessage = () => {
        if (!message.trim()) return;
        socketRef.current.emit('chat-message', message, username);
        setMessage("");
    };

    const handleEndCall = () => {
        try {
            if (window.localStream) {
                window.localStream.getTracks().forEach((track) => track.stop());
            }
        } catch (e) { }
        window.location.href = "/home";
    };

    const handleVideo = () => {
        setVideo((prev) => {
            const next = !prev;
            if (window.localStream) {
                window.localStream.getVideoTracks().forEach(t => t.enabled = next);
            }
            return next;
        });
    };

    const handleAudio = () => {
        setAudio((prev) => {
            const next = !prev;
            if (window.localStream) {
                window.localStream.getAudioTracks().forEach(t => t.enabled = next);
            }
            return next;
        });
    };

    return (
        <div>
            {askForUsername ? (
                <div>
                    <h2>Enter into Lobby</h2>
                    <TextField
                        id="outlined-basic"
                        label="Username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        variant="outlined"
                    />
                    <Button variant="contained" onClick={connect}>Connect</Button>
                    <div>
                        <video ref={localVideoref} autoPlay muted playsInline></video>
                    </div>
                </div>
            ) : (
                <div className={styles.meetVideoContainer}>
                    {showModal && (
                        <div className={styles.chatRoom}>
                            <div className={styles.chatContainer}>
                                <h1>Chat</h1>
                                <div className={styles.chattingDisplay}>
                                    {messages.length > 0 ? (
                                        messages.map((item, index) => (
                                            <div style={{ marginBottom: "20px" }} key={index}>
                                                <p style={{ fontWeight: "bold" }}>{item.sender}</p>
                                                <p>{item.data}</p>
                                            </div>
                                        ))
                                    ) : (
                                        <p>No Messages Yet</p>
                                    )}
                                </div>
                                <div className={styles.chattingArea}>
                                    <TextField
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        id="outlined-basic"
                                        label="Enter Your chat"
                                        variant="outlined"
                                    />
                                    <Button variant="contained" onClick={sendMessage}>Send</Button>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className={styles.buttonContainers}>
                        <IconButton onClick={handleVideo} style={{ color: "white" }}>
                            {video ? <VideocamIcon /> : <VideocamOffIcon />}
                        </IconButton>
                        <IconButton onClick={handleEndCall} style={{ color: "red" }}>
                            <CallEndIcon />
                        </IconButton>
                        <IconButton onClick={handleAudio} style={{ color: "white" }}>
                            {audio ? <MicIcon /> : <MicOffIcon />}
                        </IconButton>
                        <Badge badgeContent={newMessages} max={999} color="primary">
                            <IconButton onClick={() => { setModal(!showModal); setNewMessages(0); }} style={{ color: "white" }}>
                                <ChatIcon />
                            </IconButton>
                        </Badge>
                    </div>

                   
                    <video className={styles.meetUserVideo} ref={localVideoref} autoPlay muted playsInline></video>

                  
                    <div className={styles.conferenceView}>
                        {videos.map((remoteUser) => (
                            <div key={remoteUser.socketId}>
                                <PeerVideo stream={remoteUser.stream} />
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
