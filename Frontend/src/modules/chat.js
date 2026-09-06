import { CHAT_HUB } from "../constants/api_constant.js";
import { ROOM_DETAILS, DEFAULT_ROOM, CHAT_COLOR_PALETTE, getOrCreateGuestId } from "../constants/app_constant.js";

let user = JSON.parse(localStorage.getItem('user'));
const guestId = getOrCreateGuestId();

const connection = new signalR.HubConnectionBuilder()
    .withUrl(`${CHAT_HUB}?userId=${encodeURIComponent(guestId)}`)
    .withAutomaticReconnect([0, 2000, 5000, 10000])
    .build();

const chat = document.getElementById('chat');
const clang = document.getElementById('chat-lang');
const cbody = document.getElementById('chat-body');
const cinput = document.getElementById('chat-input');
const cdropdown = document.getElementById('chat-dropdown');

const chatState = {
    activeRoom: localStorage.getItem('pixelace_lang') || DEFAULT_ROOM,
    rooms: {
        'EN': [],
        'TR': []
    }
};

const isConnected = () => connection.state === signalR.HubConnectionState.Connected;

async function openChat() {
    const connectToHub = async () => {
        chat.style.transform = 'translate(0, 0)';

        if (!isConnected()) {
            cbody.style.justifyContent = 'center';
            cbody.style.alignItems = 'center';
            cbody.innerHTML = '<img src="./assets/spinners/ring.svg" width="80" height="80" alt="Spinner">';

            try {
                await connection.start();

                for (const [room] of ROOM_DETAILS) {
                    try {
                        const history = await connection.invoke('JoinRoom', room);
                        chatState.rooms[room] = history || [];
                    } catch (err) {
                        console.warn(`Failed to join room ${room}:`, err);
                    }
                }

                // 2. Render initial active room messages
                switchChatRoom(chatState.activeRoom);
            } catch (err) {
                console.error('Failed to connect to Chat Hub', err);
                cbody.innerHTML = '<p class="text-neutral-500">Could not connect to chat server.</p>';
            }
        }
    };

    if (user?.username) {
        connectToHub();
    } else {
        promptUser(connectToHub);
    }
}

const closeChat = () => { chat.style.transform = 'translate(100%, 0)'; cdropdown.style.display = 'none'; };
const openDropdownMenu = e => { e.stopPropagation(); cdropdown.style.display = 'flex'; };
const closeDropdownMenu = e => { if (e) e.stopPropagation(); cdropdown.style.display = 'none'; };

function promptUser(onSuccess) {
    const input = prompt('Enter a username');
    const username = input ? input.trim() : '';
    const color = user?.color ? user.color : CHAT_COLOR_PALETTE[Math.floor(Math.random() * CHAT_COLOR_PALETTE.length)];

    if (username.length > 0 && username.length <= 30) {
        user = { username, color };
        localStorage.setItem('user', JSON.stringify(user));
        onSuccess();
    } else {
        alert('Username cannot be empty and must be 30 characters or fewer.');
    }
}

async function sendRoomMessage() {
    const text = cinput.value ? cinput.value.trim() : '';
    if (!text) return;

    if (!isConnected()) {
        alert('Cannot connect to chat server.');
        return;
    }

    const payload = {
        room: chatState.activeRoom,
        username: user.username,
        text: text,
        color: user.color,
    };

    try {
        await connection.invoke('SendRoomMessage', payload);
        cinput.value = '';
    } catch (error) {
        console.error('Failed to send message:', error);
        alert('Failed to send message.');
    }
}

// Global SignalR message listener
connection.on('ReceiveChatMessage', (message) => {
    const room = message.room;
    if (!chatState.rooms[room]) {
        chatState.rooms[room] = [];
    }

    // 1. Always append to in-memory ring buffer (up to 250 items)
    chatState.rooms[room].push(message);
    if (chatState.rooms[room].length > 250) {
        chatState.rooms[room].shift();
    }

    // 2. If active room, render immediately to DOM
    if (room === chatState.activeRoom) {
        appendMessageToDom(message);
    }
});

function switchChatRoom(room) {
    chatState.activeRoom = room;
    localStorage.setItem('pixelace_lang', room);

    updateDropdownDisplay(room);

    // Clear DOM and hydrate from in-memory cache with 0ms latency
    cbody.style.justifyContent = 'flex-start';
    cbody.style.alignItems = 'flex-start';
    cbody.innerHTML = '';

    const messages = chatState.rooms[room] || [];
    for (const msg of messages) {
        appendMessageToDom(msg);
    }

    cbody.scrollTop = cbody.scrollHeight;
}

// XSS-immune message appending with textContent & DOM nodes
function appendMessageToDom(message) {
    const p = document.createElement('p');
    p.className = 'break-words leading-tight';

    const userSpan = document.createElement('span');
    userSpan.className = 'font-bold mr-1 select-text';
    userSpan.style.color = CHAT_COLOR_PALETTE.includes(message.color) ? message.color : '#008573';
    userSpan.textContent = `[${message.username}]: `;

    const textSpan = document.createElement('span');
    textSpan.className = 'select-text';
    textSpan.textContent = message.text;

    p.appendChild(userSpan);
    p.appendChild(textSpan);
    cbody.appendChild(p);

    // DOM Capped Window: Never allow more than 250 nodes in chat body
    while (cbody.children.length > 250) {
        cbody.removeChild(cbody.firstChild);
    }

    cbody.scrollTop = cbody.scrollHeight;
}

function updateDropdownDisplay(room) {
    clang.setAttribute('data-room', room);
    if (clang.children[0]) {
        clang.children[0].src = `./assets/flags/${room}.png`;
    }
    if (clang.children[1]) {
        clang.children[1].innerHTML = room;
    }
}

export function drawDropdownFlag() {
    clang.innerHTML = '';
    const initialRoom = chatState.activeRoom;

    const img = document.createElement('img');
    img.src = `./assets/flags/${initialRoom}.png`;
    img.alt = initialRoom;

    const span = document.createElement('span');
    span.className = 'font-inter font-medium text-sm';
    span.innerHTML = initialRoom;

    clang.appendChild(img);
    clang.appendChild(span);
    clang.setAttribute('data-room', initialRoom);
}

export function fillDropdownMenu() {
    const list = cdropdown.children[0];
    list.innerHTML = '';

    for (const [room, language] of ROOM_DETAILS) {
        const li = document.createElement('li');

        li.onclick = (e) => {
            e.stopPropagation();
            switchChatRoom(room);
            closeDropdownMenu(e);
        };
        li.className = 'flex items-center justify-between gap-8 cursor-pointer p-1 hover:bg-neutral-100 rounded';
        li.innerHTML = `<span class="font-medium text-sm">${language}</span>
                        <img class="max-w-none" src="./assets/flags/${room}.png" alt="${language}">`;

        list.appendChild(li);
    }
}

window.addEventListener('load', () => {
    clang.onclick = openDropdownMenu;
    cinput.onkeydown = (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            sendRoomMessage();
        }
    };
    chat.onclick = () => {
        cdropdown.style.display = 'none';
    };

    document.getElementById('chat-open').onclick = openChat;
    document.getElementById('chat-close').onclick = closeChat;
});