import * as http from "../utils/http.js";
import { CHAT_API_CACHE_MESSAGE, CHAT_API_GET_MESSAGES, CHAT_HUB } from "../constants/api_constant.js";
import { GROUP_DETAILS, DEFAULT_GROUP, CHAT_COLOR_PALETTE } from "../constants/app_constant.js";

let user = JSON.parse(localStorage.getItem('user'));

const connectedGroups = [];
const connection = new signalR.HubConnectionBuilder().withUrl(CHAT_HUB).build();

const chat = document.getElementById('chat');
const clang = document.getElementById('chat-lang');
const cbody = document.getElementById('chat-body');
const cinput = document.getElementById('chat-input');
const cdropdown = document.getElementById('chat-dropdown');

async function openChat() {
    const connectToHub = async () => {
        chat.style.transform = 'translate(0, 0)';

        if (!isConnected()) {
            cbody.style.justifyContent = 'center';
            cbody.style.alignItems = 'center';
            cbody.innerHTML = '<img src="./assets/spinners/ring.svg" width="80" height="80" alt="Spinner">';

            await connection.start();
            await changeChatGroup(DEFAULT_GROUP);

            cbody.style.justifyContent = 'flex-start';
            cbody.style.alignItems = 'flex-start';
            cbody.innerHTML = '';
        }
    }

    if (user?.username) connectToHub();
    else promptUser(connectToHub);
}

function closeChat() {
    chat.style.transform = 'translate(100%, 0)';
    cdropdown.style.display = 'none';
}

function openDropdownMenu(e) {
    e.stopPropagation();
    cdropdown.style.display = 'flex';
}

function closeDropdownMenu(e) {
    e.stopPropagation();
    cdropdown.style.display = 'none';
}

function isConnected() {
    return connection.state === signalR.HubConnectionState.Connected;
}

function promptUser(onSuccess) {
    const username = prompt('Enter a username');
    const color = user?.color ? user.color : CHAT_COLOR_PALETTE[Math.floor(Math.random() * CHAT_COLOR_PALETTE.length)];

    if (username && username.length > 0 && username.length < 56) {
        user = { username: username, color: color };
        localStorage.setItem('user', JSON.stringify(user));
        onSuccess();
    } else alert('It cannot be empty and greater than 56 chars');
}

function sendGroupMessage() {
    if (isConnected()) {
        const payload = {
            group: clang.dataset.group,
            username: user.username,
            text: cinput.value,
            color: user.color,
        };

        connection.invoke('SendGroupMessage', payload);
        onReceiveGroupMessage(payload);
    } else alert('Can\'t connect to chat server');

    cinput.value = '';
}

function onReceiveGroupMessage(message) {
    const params = { connectionId: connection.connectionId };

    if (message.group === clang.dataset.group) fillChatBody(message);
    http.post(CHAT_API_CACHE_MESSAGE, message, params);
}

async function onSelectDropdownItem(e, group) {
    if (isConnected()) {
        if (group !== clang.dataset.group) {
            cbody.innerHTML = '';

            try {
                const params = { connectionId: connection.connectionId, group: group };
                const request = await http.get(CHAT_API_GET_MESSAGES, params);
                const messages = await request.json();

                for (const message of messages) fillChatBody(JSON.parse(message));
            } catch (error) {
                alert('Couldn\'t fetch previous messages');
            } finally {
                await changeChatGroup(group);

                clang.children[0].src = `./assets/flags/${group}.png`;
                clang.children[1].innerHTML = group;
            }
        }
    } else alert('Can\'t connect to chat server');

    closeDropdownMenu(e);
}

async function changeChatGroup(group) {
    clang.setAttribute('data-group', group);

    if (!connectedGroups.some((e) => e === group)) {
        await connection.invoke('AddToGroup', group);
        connection.on('ReceiveGroupMessage' + group, (message) => onReceiveGroupMessage(message));
        connectedGroups.push(group);
    }
}

function fillChatBody(message) {
    const span = document.createElement('span');
    span.style.userSelect = 'text';
    span.innerHTML = `<span class="mr-1" style="color: ${message.color};">[${message.username}]:</span>${message.text}`;

    cbody.appendChild(span);
}

export function drawDropdownFlag() {
    const img = document.createElement('img');
    const span = document.createElement('span');

    img.src = `./assets/flags/${DEFAULT_GROUP}.png`;

    span.className = 'font-inter font-medium text-sm';
    span.innerHTML = DEFAULT_GROUP;

    clang.appendChild(img);
    clang.appendChild(span);
    clang.setAttribute('data-group', DEFAULT_GROUP);
}

export function fillDropdownMenu() {
    for (const [group, language] of GROUP_DETAILS) {
        const li = document.createElement('li');

        li.onclick = (e) => onSelectDropdownItem(e, group);
        li.className = 'flex items-center justify-between gap-12 cursor-pointer';
        li.innerHTML = `<span class="font-medium text-sm">${language}</span>
                        <img class="max-w-none" src="./assets/flags/${group}.png" alt="${language}">`;

        cdropdown.children[0].appendChild(li);
    }
}

window.addEventListener('load', () => {
    clang.onclick = openDropdownMenu;
    cinput.onkeydown = (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            sendGroupMessage();
        }
    }
    chat.onclick = (_) => {
        cdropdown.style.display = 'none';
    }

    document.getElementById('chat-open').onclick = openChat;
    document.getElementById('chat-close').onclick = closeChat;
});