import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    addDoc, 
    query, 
    where, 
    orderBy, 
    onSnapshot, 
    serverTimestamp, 
    getDocs, 
    updateDoc, 
    doc, 
    getDoc,
    limit 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { firebaseConfig } from './firebase-config.js';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const chatWidget = document.getElementById('chatWidget');
const chatToggle = document.getElementById('chatToggle');
const minimizeChat = document.getElementById('minimizeChat');
const chatList = document.getElementById('chatList');
const messagesContainer = document.getElementById('messagesContainer');
const messageInput = document.getElementById('messageInput');
const sendMessage = document.getElementById('sendMessage');
const headerChatBtn = document.getElementById('headerChatBtn');

let currentUser = null;
let currentChat = null;
let participantNames = {};
let unreadCounts = {};
let chatListener = null;
let messageListener = null;

function getLastRead(chatId) {
    return localStorage.getItem('chat_last_read_' + chatId);
}

function setLastRead(chatId, timestamp) {
    localStorage.setItem('chat_last_read_' + chatId, timestamp);
}

function updateBellCount(count) {
    const bellCounts = document.querySelectorAll('.notification-count');
    bellCounts.forEach(el => {
        el.textContent = count > 0 ? count : '';
        el.style.display = count > 0 ? 'flex' : 'none';
    });

    const messageIcons = document.querySelectorAll('.chat-toggle, .ri-message-2-line');
    messageIcons.forEach(icon => {
        let notificationDot = icon.querySelector('.message-notification-dot');
        if (count > 0) {
            if (!notificationDot) {
                notificationDot = document.createElement('span');
                notificationDot.className = 'message-notification-dot';
                icon.appendChild(notificationDot);
            }
            notificationDot.style.display = 'block';
        } else if (notificationDot) {
            notificationDot.style.display = 'none';
        }
    });
}

let chatBellCount = 0;

function listenForUnread(chatId, chatItem) {
    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const q = query(
        messagesRef, 
        orderBy('timestamp', 'desc'), 
        limit(20)
    );
    
    onSnapshot(q, (snapshot) => {
        let unread = 0;
        let newForBell = false;
        const lastRead = getLastRead(chatId);
        
        snapshot.forEach((doc) => {
            const message = doc.data();
            if (message.senderId !== currentUser.uid) {
                if (!lastRead || (message.timestamp && message.timestamp.toMillis && message.timestamp.toMillis() > Number(lastRead))) {
                    unread++;
                    if (!chatWidget.classList.contains('active')) {
                        newForBell = true;
                    }
                }
            }
        });
        
        const oldBadge = chatItem.querySelector('.unread-badge');
        if (oldBadge) oldBadge.remove();
        
        if (unread > 0 && !chatWidget.classList.contains('active')) {
            const badge = document.createElement('span');
            badge.className = 'unread-badge';
            badge.textContent = unread > 9 ? '9+' : unread;
            chatItem.appendChild(badge);
        }
        
        if (newForBell && !chatWidget.classList.contains('active')) {
            chatBellCount++;
            updateBellCount(chatBellCount);
        } else if (chatWidget.classList.contains('active')) {
            clearChatBellCount();
        }
    });
}

function clearChatBellCount() {
    chatBellCount = 0;
    updateBellCount(0);
    document.querySelectorAll('.message-notification-dot').forEach(dot => {
        dot.style.display = 'none';
    });
}

function toggleChat() {
    chatWidget.classList.toggle('active');
    if (chatWidget.classList.contains('active')) {
        loadChats();
        clearChatBellCount();
        document.querySelectorAll('.message-notification-dot').forEach(dot => {
            dot.style.display = 'none';
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (chatToggle) {
        chatToggle.addEventListener('click', toggleChat);
        const notificationDot = document.createElement('span');
        notificationDot.className = 'message-notification-dot';
        chatToggle.appendChild(notificationDot);
    }
    if (headerChatBtn) {
        headerChatBtn.addEventListener('click', (e) => {
            e.preventDefault();
            toggleChat();
        });
    }
    if (minimizeChat) {
        minimizeChat.addEventListener('click', () => {
            chatWidget.classList.remove('active');
        });
    }
    if (sendMessage) {
        sendMessage.addEventListener('click', sendNewMessage);
    }
    if (messageInput) {
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendNewMessage();
            }
        });
    }
});

function clearChatData() {
    if (chatList) {
        chatList.innerHTML = '';
    }
    
    if (messagesContainer) {
        messagesContainer.innerHTML = '';
    }
    
    currentChat = null;
    participantNames = {};
    unreadCounts = {};
    
    if (messageInput) {
        messageInput.value = '';
    }
    
    if (chatListener) {
        chatListener();
        chatListener = null;
    }
    if (messageListener) {
        messageListener();
        messageListener = null;
    }
}

async function loadChats() {
    if (!currentUser) return;

    if (chatListener) {
        chatListener();
    }

    const chatsRef = collection(db, 'chats');
    const q = query(
        chatsRef,
        where('participants', 'array-contains', currentUser.uid)
    );

    chatListener = onSnapshot(q, async (snapshot) => {
        if (!chatList) return;
        
        chatList.innerHTML = '';
        if (snapshot.empty) {
            messagesContainer.innerHTML = '<div style="padding:20px;color:#888;text-align:center; display:flex; justify-content:center; align-items:center; height:100%;" data-translate="no active chats">No active chats. Start a conversation from a user\'s profile!</div>';
            if (window.updateTranslations) {
                window.updateTranslations();
            }
            return;
        }

        const chatPromises = snapshot.docs.map(async (chatDoc) => {
            const chat = chatDoc.data();
            const chatId = chatDoc.id;
            const otherUserId = chat.participants.find(id => id !== currentUser.uid);
            
            if (!otherUserId) {
                console.error('Invalid chat data - missing other participant:', chatId);
                return null;
            }

            let otherUserName = chat.participantNames?.[otherUserId];
            let shouldUpdateNames = false;
            
            try {
                const userDocRef = doc(db, 'users', otherUserId);
                const userDocSnap = await getDoc(userDocRef);
                if (userDocSnap.exists()) {
                    const userData = userDocSnap.data();
                    const newName = userData.displayName || userData.name || 'User';
                    
                    if (otherUserName !== newName) {
                        otherUserName = newName;
                        shouldUpdateNames = true;
                    }
                } else {
                    console.error('User document not found:', otherUserId);
                    return null;
                }
            } catch (error) {
                console.error('Error fetching user data:', error);
                return null;
            }

            if (shouldUpdateNames) {
                try {
                    await updateDoc(chatDoc.ref, {
                        participantNames: {
                            ...chat.participantNames,
                            [otherUserId]: otherUserName
                        }
                    });
                } catch (error) {
                    console.error('Error updating participant names:', error);
                }
            }

            const chatItem = document.createElement('div');
            chatItem.className = 'chat-item';
            chatItem.dataset.chatId = chatId;
            chatItem.dataset.otherUserId = otherUserId;
            
            chatItem.innerHTML = `
                <div class="chat-item-avatar">
                    <i class="ri-user-line"></i>
                </div>
                <div class="chat-item-content">
                    <div class="chat-item-name">${otherUserName}</div>
                </div>
            `;

            listenForUnread(chatId, chatItem);

            chatItem.addEventListener('click', () => {
                openChat(chatId, otherUserId);
                chatWidget.classList.add('active');
            });

            return chatItem;
        });

        const chatItems = await Promise.all(chatPromises);
        chatItems.forEach(item => {
            if (item) {
                chatList.appendChild(item);
            }
        });
    });
}

async function openChat(chatId, otherUserId) {
    if (!currentUser) return;

    if (messageListener) {
        messageListener();
        messageListener = null;
    }

    const chatRef = doc(db, 'chats', chatId);
    const chatDoc = await getDoc(chatRef);
    
    if (!chatDoc.exists() || !chatDoc.data().participants.includes(currentUser.uid)) {
        console.error('Unauthorized access to chat');
        return;
    }

    currentChat = chatId;
    const currentTime = Date.now();
    setLastRead(chatId, currentTime);
    unreadCounts[chatId] = 0;
    
    document.querySelectorAll('.message-notification-dot').forEach(dot => {
        dot.style.display = 'none';
    });
    
    const chatItem = document.querySelector(`.chat-item[data-chat-id="${chatId}"]`);
    if (chatItem) {
        const badge = chatItem.querySelector('.unread-badge');
        if (badge) badge.remove();
    }
    
    clearChatBellCount();
    
    document.querySelectorAll('.chat-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.chatId === chatId) {
            item.classList.add('active');
        }
    });

    // Load and update participant names
    participantNames = {};
    try {
        const chatData = chatDoc.data();
        const participantIds = chatData.participants || [];
        let shouldUpdateNames = false;

        // First try to get names from chat document
        if (chatData.participantNames) {
            participantNames = { ...chatData.participantNames };
        }

        // Then verify and update names from user documents
        for (const uid of participantIds) {
            try {
                const userDocRef = doc(db, 'users', uid);
                const userDocSnap = await getDoc(userDocRef);
                if (userDocSnap.exists()) {
                    const user = userDocSnap.data();
                    const newName = user.displayName || user.name || 'User';
                    
                    // Update if name is different or missing
                    if (!participantNames[uid] || participantNames[uid] !== newName) {
                        participantNames[uid] = newName;
                        shouldUpdateNames = true;
                    }
                }
            } catch (e) {
                console.error('Error fetching user data for participant:', uid, e);
            }
        }

        // Update chat document if names changed
        if (shouldUpdateNames) {
            try {
                await updateDoc(chatRef, { participantNames });
            } catch (e) {
                console.error('Error updating participant names:', e);
            }
        }
    } catch (e) {
        console.error('Error loading participant names:', e);
        participantNames = {};
    }

    // Load messages
    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));

    messageListener = onSnapshot(q, (snapshot) => {
        messagesContainer.innerHTML = '';
        snapshot.forEach((doc) => {
            const message = doc.data();
            if (chatDoc.data().participants.includes(message.senderId)) {
                const messageElement = createMessageElement(message);
                messagesContainer.appendChild(messageElement);
            }
        });
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    });

    // Update chat banner
    const chatMessages = document.getElementById('chatMessages');
    let chatWithBanner = document.getElementById('chatWithBanner');
    if (!chatWithBanner) {
        chatWithBanner = document.createElement('div');
        chatWithBanner.id = 'chatWithBanner';
        chatWithBanner.style.padding = '8px 16px';
        chatWithBanner.style.fontWeight = 'bold';
        chatWithBanner.style.background = '#f7f7fa';
        chatWithBanner.style.borderBottom = '1px solid #eee';
        chatWithBanner.style.color = '#333';
        chatWithBanner.style.fontSize = '1rem';
        chatMessages.insertBefore(chatWithBanner, chatMessages.firstChild);
    }
    const otherUserName = participantNames[otherUserId] || 'User';
    chatWithBanner.innerHTML = `<span data-translate="chatting-with">Chatting with</span> ${otherUserName}`;
    
    if (window.updateTranslations) {
        window.updateTranslations();
    }
}

function createMessageElement(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${message.senderId === currentUser.uid ? 'sent' : 'received'}`;
    
    const senderName = participantNames[message.senderId] || 'User';
    const nameDiv = document.createElement('div');
    nameDiv.className = 'message-sender';
    nameDiv.textContent = senderName;
    messageDiv.appendChild(nameDiv);

    const content = document.createElement('div');
    content.className = 'message-content';
    content.textContent = message.text;
    messageDiv.appendChild(content);
    return messageDiv;
}

async function sendNewMessage() {
    if (!currentUser || !currentChat || !messageInput.value.trim()) return;

    try {
        const chatRef = doc(db, 'chats', currentChat);
        const chatDoc = await getDoc(chatRef);
        
        if (!chatDoc.exists() || !chatDoc.data().participants.includes(currentUser.uid)) {
            console.error('Unauthorized access to chat');
            return;
        }

        const message = {
            text: messageInput.value.trim(),
            senderId: currentUser.uid,
            timestamp: serverTimestamp()
        };

        await addDoc(collection(db, 'chats', currentChat, 'messages'), message);
        messageInput.value = '';

        const chatData = chatDoc.data();
        const recipientId = chatData.participants.find(id => id !== currentUser.uid);
        if (recipientId) {
            await addDoc(collection(db, 'notifications'), {
                type: 'chat',
                chatId: currentChat,
                senderId: currentUser.uid,
                senderName: participantNames[currentUser.uid] || 'User',
                recipientId: recipientId,
                message: message.text,
                timestamp: new Date().toISOString(),
                read: false
            });
        }
    } catch (error) {
        console.error('Error sending message:', error);
    }
}

onAuthStateChanged(auth, (user) => {
    if (user) {
        clearChatData();
        currentUser = user;
        loadChats();
        if (chatWidget.classList.contains('active')) {
            clearChatBellCount();
        }
    } else {
        currentUser = null;
        chatWidget.classList.remove('active');
        clearChatData();
    }
});

async function createNewChat(otherUserId, otherUserName, companyName = null) {
    if (!currentUser) return null;

    try {
        const chatsRef = collection(db, 'chats');
        const q = query(
            chatsRef,
            where('participants', 'array-contains', currentUser.uid)
        );

        const snapshot = await getDocs(q);
        let existingChat = null;

        snapshot.forEach((doc) => {
            const chat = doc.data();
            if (chat.participants.includes(otherUserId)) {
                existingChat = doc.id;
            }
        });

        if (existingChat) {
            return existingChat;
        }

        let currentUserName = 'User';
        let otherUserDisplayName = otherUserName;
        
        try {
            const currentUserDocRef = doc(db, 'users', currentUser.uid);
            const currentUserDocSnap = await getDoc(currentUserDocRef);
            if (currentUserDocSnap.exists()) {
                const user = currentUserDocSnap.data();
                currentUserName = user.displayName || user.name || 'User';
            }
        } catch (e) {
            console.error('Error fetching current user details:', e);
        }

        if (companyName) {
            otherUserDisplayName = `${otherUserName} (${companyName})`;
        }

        const chatData = {
            participants: [currentUser.uid, otherUserId],
            participantNames: {
                [currentUser.uid]: currentUserName,
                [otherUserId]: otherUserDisplayName
            },
            lastMessage: serverTimestamp(),
            createdAt: serverTimestamp()
        };

        const chatRef = await addDoc(chatsRef, chatData);
        const chatId = chatRef.id;

        // Ensure chat widget is visible
        if (chatWidget) {
            chatWidget.classList.add('active');
        }

        // Load chats to update the list
        await loadChats();

        return chatId;
    } catch (error) {
        console.error('Error creating new chat:', error);
        return null;
    }
}

export { createNewChat, openChat };