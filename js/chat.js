import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, query, where, orderBy, onSnapshot, serverTimestamp, getDocs, updateDoc, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { firebaseConfig } from './firebase-config.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// DOM Elements
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

function getLastRead(chatId) {
    return localStorage.getItem('chat_last_read_' + chatId);
}

function setLastRead(chatId, timestamp) {
    localStorage.setItem('chat_last_read_' + chatId, timestamp);
}

// Load available contacts (users who posted jobs)
async function loadAvailableContacts() {
    console.log('Loading available contacts...');
    if (!currentUser) {
        console.log('No current user, cannot load contacts');
        return;
    }

    try {
        // Get all jobs
        const jobsRef = collection(db, 'jobs');
        const jobsSnapshot = await getDocs(jobsRef);
        console.log('Found jobs:', jobsSnapshot.size);
        const posterIdSet = new Set();
        jobsSnapshot.forEach((doc) => {
            const job = doc.data();
            if (job.postedBy && job.postedBy !== currentUser.uid) {
                posterIdSet.add(job.postedBy);
            }
        });
        console.log('Unique job posters:', posterIdSet.size);

        // Fetch user info for each posterId
        const contactsList = document.createElement('div');
        contactsList.className = 'contacts-list';

        for (const posterId of posterIdSet) {
            let displayName = 'Job Poster';
            let companyName = '';
            try {
                // Try to get user info from 'users' collection
                const userDoc = await getDoc(doc(db, 'users', posterId));
                if (userDoc.exists()) {
                    const user = userDoc.data();
                    displayName = user.displayName || user.name || 'Job Poster';
                    companyName = user.companyName || '';
                }
            } catch (error) {
                console.log('Could not fetch user details, using default name');
            }

            console.log('Adding contact:', displayName);
            const contactItem = createContactItem(posterId, displayName, 'user', companyName);
            contactsList.appendChild(contactItem);
        }

        // Add contacts list to chat list
        chatList.innerHTML = '';
        if (contactsList.children.length === 0) {
            console.log('No contacts found, showing message');
            chatList.innerHTML = '<div style="padding:20px;color:#888;">No job posters found.</div>';
        } else {
            console.log('Adding contacts to chat list');
            chatList.appendChild(contactsList);
        }
    } catch (error) {
        console.error('Error loading contacts:', error);
        chatList.innerHTML = '<div style="padding:20px;color:#888;">Error loading contacts. Please try again later.</div>';
    }
}

// Create contact item element
function createContactItem(id, name, type, companyName = '') {
    const contactItem = document.createElement('div');
    contactItem.className = 'chat-item contact-item';
    contactItem.dataset.userId = id;
    
    const displayName = companyName ? `${name} (${companyName})` : name;
    
    contactItem.innerHTML = `
        <div class="chat-item-avatar">
            <i class="ri-user-line"></i>
        </div>
        <div class="chat-item-content">
            <div class="chat-item-name">${displayName}</div>
        </div>
    `;
    
    contactItem.addEventListener('click', async () => {
        const chatId = await createNewChat(id, name, companyName);
        if (chatId) {
            openChat(chatId, id);
        }
    });
    
    return contactItem;
}

// Helper to update the notification bell count
function updateBellCount(count) {
    const bellCounts = document.querySelectorAll('.notification-count');
    bellCounts.forEach(el => {
        el.textContent = count > 0 ? count : '';
        el.style.display = count > 0 ? 'flex' : 'none';
    });
}

let chatBellCount = 0;

function listenForUnread(chatId, chatItem) {
    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'desc'), limit(20));
    onSnapshot(q, (snapshot) => {
        let unread = 0;
        let newForBell = false;
        const lastRead = getLastRead(chatId);
        snapshot.forEach((doc) => {
            const message = doc.data();
            if (message.senderId !== currentUser.uid) {
                if (!lastRead || (message.timestamp && message.timestamp.toMillis && message.timestamp.toMillis() > Number(lastRead))) {
                    unread++;
                    // If chat widget is closed, count for bell
                    if (!chatWidget.classList.contains('active')) {
                        newForBell = true;
                    }
                }
            }
        });
        // Remove old badge if exists
        const oldBadge = chatItem.querySelector('.unread-badge');
        if (oldBadge) oldBadge.remove();
        if (unread > 0) {
            const badge = document.createElement('span');
            badge.className = 'unread-badge';
            badge.textContent = unread > 9 ? '9+' : unread;
            chatItem.appendChild(badge);
        }
        // Update bell count
        if (newForBell) {
            chatBellCount++;
            updateBellCount(chatBellCount);
        }
    });
}

// When chat widget is opened, clear bell count
function clearChatBellCount() {
    chatBellCount = 0;
    updateBellCount(0);
}

// Toggle chat widget
function toggleChat() {
    chatWidget.classList.toggle('active');
    if (chatWidget.classList.contains('active')) {
        loadAvailableContacts();
        clearChatBellCount();
    }
}

chatToggle.addEventListener('click', toggleChat);
headerChatBtn.addEventListener('click', (e) => {
    e.preventDefault();
    toggleChat();
});

minimizeChat.addEventListener('click', () => {
    chatWidget.classList.remove('active');
});

// Load user's chats
async function loadChats() {
    if (!currentUser) return;

    const chatsRef = collection(db, 'chats');
    const q = query(
        chatsRef,
        where('participants', 'array-contains', currentUser.uid),
        orderBy('lastMessage', 'desc')
    );

    onSnapshot(q, (snapshot) => {
        chatList.innerHTML = '';
        snapshot.forEach((doc) => {
            const chat = doc.data();
            const chatId = doc.id;
            const otherUserId = chat.participants.find(id => id !== currentUser.uid);
            const otherUserName = chat.participantNames?.[otherUserId] || 'User';

            // Create chat item
            const chatItem = document.createElement('div');
            chatItem.className = 'chat-item';
            chatItem.dataset.chatId = chatId;
            chatItem.dataset.otherUserId = otherUserId;
            chatItem.textContent = otherUserName;

            // Listen for unread messages in this chat
            listenForUnread(chatId, chatItem);

            chatItem.addEventListener('click', () => openChat(chatId, otherUserId));
            chatList.appendChild(chatItem);
        });
    });
}

// Open a specific chat
async function openChat(chatId, otherUserId) {
    currentChat = chatId;
    // Set last read to now
    setLastRead(chatId, Date.now());
    unreadCounts[chatId] = 0;
    
    // Update active chat in list
    document.querySelectorAll('.chat-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.chatId === chatId) {
            item.classList.add('active');
        }
    });

    // Fetch participant names for this chat
    participantNames = {};
    try {
        const chatDoc = await getDocs(query(collection(db, 'chats'), where('__name__', '==', chatId)));
        chatDoc.forEach((doc) => {
            const chatData = doc.data();
            if (chatData.participantNames) {
                participantNames = chatData.participantNames;
            }
        });
    } catch (e) {
        participantNames = {};
    }

    // Load messages
    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));

    onSnapshot(q, (snapshot) => {
        messagesContainer.innerHTML = '';
        snapshot.forEach((doc) => {
            const message = doc.data();
            const messageElement = createMessageElement(message);
            messagesContainer.appendChild(messageElement);
        });
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    });

    // Show 'Chatting with ${user}' above the message input
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
    chatWithBanner.textContent = `Chatting with ${otherUserName}`;
}

// Create message element
function createMessageElement(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${message.senderId === currentUser.uid ? 'sent' : 'received'}`;
    
    // Sender name
    const senderName = participantNames[message.senderId] || 'User';
    const nameDiv = document.createElement('div');
    nameDiv.className = 'message-sender';
    nameDiv.textContent = senderName;
    messageDiv.appendChild(nameDiv);

    // Message content
    const content = document.createElement('div');
    content.className = 'message-content';
    content.textContent = message.text;
    messageDiv.appendChild(content);
    return messageDiv;
}

// Send message
async function sendNewMessage() {
    if (!currentChat || !messageInput.value.trim()) return;

    const message = {
        text: messageInput.value.trim(),
        senderId: currentUser.uid,
        timestamp: serverTimestamp()
    };

    try {
        await addDoc(collection(db, 'chats', currentChat, 'messages'), message);
        messageInput.value = '';

        // Also create a notification for the recipient
        // Find the other participant
        const chatDoc = await getDoc(doc(db, 'chats', currentChat));
        if (chatDoc.exists()) {
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
        }
    } catch (error) {
        console.error('Error sending message:', error);
    }
}

// Event listeners
sendMessage.addEventListener('click', sendNewMessage);
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendNewMessage();
    }
});

// Initialize chat when user is authenticated
onAuthStateChanged(auth, (user) => {
    console.log('Auth state changed:', user ? 'User logged in' : 'No user');
    if (user) {
        currentUser = user;
        console.log('Current user set:', user.uid);
        if (chatWidget.classList.contains('active')) {
            console.log('Loading chats...');
            loadChats();
        }
    } else {
        console.log('No user, resetting chat state');
        currentUser = null;
        chatWidget.classList.remove('active');
    }
});

// Create a new chat
async function createNewChat(otherUserId, otherUserName, companyName = null) {
    if (!currentUser) return null;

    try {
        // Check if chat already exists
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

        // Always fetch the latest displayName/companyName for both participants
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

        // If companyName is provided, use it to enhance the display name
        if (companyName) {
            otherUserDisplayName = `${otherUserName} (${companyName})`;
        }

        // Create new chat
        const chatData = {
            participants: [currentUser.uid, otherUserId],
            participantNames: {
                [currentUser.uid]: currentUserName,
                [otherUserId]: otherUserDisplayName
            },
            lastMessage: serverTimestamp(),
            createdAt: serverTimestamp()
        };
        console.log('Creating new chat with participantNames:', chatData.participantNames);

        const chatRef = await addDoc(chatsRef, chatData);
        return chatRef.id;
    } catch (error) {
        console.error('Error creating chat:', error);
        return null;
    }
}

// ADMIN/DEV: Update all chats to use correct display names for all participants
async function updateAllChatParticipantNames() {
    const chatsRef = collection(db, 'chats');
    const chatsSnapshot = await getDocs(chatsRef);
    for (const chatDoc of chatsSnapshot.docs) {
        const chatData = chatDoc.data();
        const participantIds = chatData.participants || [];
        const participantNames = {};
        for (const uid of participantIds) {
            let displayName = 'User';
            try {
                const userDocRef = doc(db, 'users', uid);
                const userDocSnap = await getDoc(userDocRef);
                if (userDocSnap.exists()) {
                    const user = userDocSnap.data();
                    if (user.displayName) displayName = user.displayName;
                    else if (user.companyName) displayName = user.companyName;
                }
            } catch (e) {}
            participantNames[uid] = displayName;
        }
        // Update the chat document
        await updateDoc(chatDoc.ref, { participantNames });
        console.log(`Updated chat ${chatDoc.id} participantNames:`, participantNames);
    }
    alert('All chats updated with correct participant names!');
}

// Export functions for use in other files
export { createNewChat, openChat };

// Expose the updateAllChatParticipantNames function to the global window object
window.updateAllChatParticipantNames = updateAllChatParticipantNames; 