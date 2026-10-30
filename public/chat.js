const token = localStorage.getItem("token");

if (!token) {
    window.location.href = "/login.html";
}

const messageForm = document.getElementById("messageForm");
const messageInput = document.getElementById("messageInput");
const messagesContainer = document.getElementById("messages");

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

// Save message to the database
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

        const messageElement = document.createElement("p");
        messageElement.textContent = result.data.message;
        messagesContainer.appendChild(messageElement);

        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        messageInput.value = "";
        messageInput.focus();

        console.log("Message saved:", result.data);
    } catch (error) {
        console.error("Error sending message:", error);
        alert(error.message);
    }
});

// Load all saved messages from the database
async function loadMessages() {
    try {
        const response = await fetch("http://localhost:3000/api/messages", {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error("Unable to load messages");
        }

        const messages = await response.json();

        messagesContainer.innerHTML = "";

        messages.forEach((msg) => {
            const messageElement = document.createElement("p");

            const senderName = msg.User ? msg.User.name : `User ${msg.userId}`;

            messageElement.textContent = `${senderName}: ${msg.message}`;

            messagesContainer.appendChild(messageElement);
        });

        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    } catch (error) {
        console.error("Error loading messages:", error);
    }
}

if (token) {
    loadUsers();
    loadMessages();
}