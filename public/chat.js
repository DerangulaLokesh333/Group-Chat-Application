const token = localStorage.getItem("token");

if (!token) {
    window.location.href = "/login.html";
}

const messageForm = document.getElementById("messageForm");
const messageInput = document.getElementById("messageInput");
const messagesContainer = document.getElementById("messages");

const STORAGE_KEY = "chatMessages";
const MAX_MESSAGES = 10;

// Read cached messages from local storage
function getStoredMessages() {
    try {
        const messages = JSON.parse(localStorage.getItem(STORAGE_KEY));
        return Array.isArray(messages) ? messages : [];
    } catch (error) {
        console.error("Error reading cached messages:", error);
        return [];
    }
}

// Save only the 10 most recent messages
function saveMessages(messages) {
    const recentMessages = messages.slice(-MAX_MESSAGES);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recentMessages));
    return recentMessages;
}

// Display messages on the screen
function displayMessages(messages) {
    messagesContainer.innerHTML = "";

    messages.forEach((msg) => {
        const messageElement = document.createElement("p");
        const senderName = msg.User
            ? msg.User.name
            : `User ${msg.userId}`;

        messageElement.textContent = `${senderName}: ${msg.message}`;
        messagesContainer.appendChild(messageElement);
    });

    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Load registered users
async function loadUsers() {
    try {
        const response = await fetch("http://localhost:3000/api/users", {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error("Unable to load users");
        }

        const users = await response.json();
        const userList = document.getElementById("users");

        userList.innerHTML = "";

        users.forEach((user) => {
            const listItem = document.createElement("li");
            listItem.textContent = user.name;
            userList.appendChild(listItem);
        });
    } catch (error) {
        console.error("Error loading users:", error);
        document.getElementById("users").textContent =
            "Unable to load users.";
    }
}

// Send a new message
messageForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const message = messageInput.value.trim();

    if (!message) {
        return;
    }

    try {
        const response = await fetch("http://localhost:3000/api/messages", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ message })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || "Unable to save message");
        }

        messageInput.value = "";
        messageInput.focus();

        // Fetch the saved message through the normal incremental flow
        await loadMessages();
    } catch (error) {
        console.error("Error sending message:", error);
        alert(error.message);
    }
});

// Fetch only messages newer than the last cached message
async function loadMessages() {
    try {
        const cachedMessages = getStoredMessages();

        // Display cached messages immediately
        displayMessages(cachedMessages);

        const lastMessageId = cachedMessages.length
            ? cachedMessages[cachedMessages.length - 1].id
            : 0;

        const response = await fetch(
            `http://localhost:3000/api/messages?lastMessageId=${lastMessageId}`,
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        if (!response.ok) {
            throw new Error("Unable to load messages");
        }

        const newMessages = await response.json();

        if (newMessages.length > 0) {
            const mergedMessages = [...cachedMessages, ...newMessages];
            const recentMessages = saveMessages(mergedMessages);

            displayMessages(recentMessages);
        }
    } catch (error) {
        console.error("Error loading messages:", error);
    }
}

// Initialise the chat
if (token) {
    loadUsers();
    loadMessages();

    // Fetch new messages every second
    setInterval(loadMessages, 1000);
}