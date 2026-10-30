
const token = localStorage.getItem("token");

if (!token) {
    window.location.href = "/login.html";
} else {
    loadUsers();
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

// Handle sending and displaying messages in this browser
const messageForm = document.getElementById("messageForm");
const messageInput = document.getElementById("messageInput");
const messagesContainer = document.getElementById("messages");

messageForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const message = messageInput.value.trim();

    if (!message) {
        return;
    }

    const messageElement = document.createElement("p");
    messageElement.textContent = message;

    messagesContainer.appendChild(messageElement);

    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    messageInput.value = "";
    messageInput.focus();
});
