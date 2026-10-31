const token = localStorage.getItem("token");

if (!token) {
    window.location.href = "/login.html";
}

const API_URL = "http://localhost:3000/api";
const MAX_MESSAGES = 10;

const messageForm = document.getElementById("messageForm");
const messageInput = document.getElementById("messageInput");
const messagesContainer = document.getElementById("messages");
const groupsList = document.getElementById("groupsList");
const createGroupForm = document.getElementById("createGroupForm");
const groupNameInput = document.getElementById("groupNameInput");
const selectedGroupName = document.getElementById("selectedGroupName");
const inviteUserSelect = document.getElementById("inviteUserSelect");
const inviteButton = document.getElementById("inviteButton");
const sendButton = document.getElementById("sendButton");
const statusMessage = document.getElementById("statusMessage");

let currentGroup = null;
let currentGroupMessages = [];
let registeredUsers = [];
let pollingInProgress = false;
let groupRequestInProgress = false;

// Keep cached messages separate for each group.
function getStorageKey(groupId) {
    return `chatMessages_group_${groupId}`;
}

function getStoredMessages(groupId) {
    try {
        const messages = JSON.parse(
            localStorage.getItem(getStorageKey(groupId))
        );

        return Array.isArray(messages) ? messages : [];
    } catch (error) {
        console.error("Error reading cached messages:", error);
        return [];
    }
}

function saveMessages(groupId, messages) {
    const recentMessages = messages.slice(-MAX_MESSAGES);

    localStorage.setItem(
        getStorageKey(groupId),
        JSON.stringify(recentMessages)
    );

    return recentMessages;
}

function showStatus(message) {
    statusMessage.textContent = message;
}

function displayMessages(messages) {
    messagesContainer.replaceChildren();

    if (!currentGroup) {
        const placeholder = document.createElement("p");
        placeholder.textContent = "Create a group or select one to start chatting.";
        messagesContainer.appendChild(placeholder);
        return;
    }

    if (messages.length === 0) {
        const placeholder = document.createElement("p");
        placeholder.textContent = "No messages in this group yet.";
        messagesContainer.appendChild(placeholder);
        return;
    }

    messages.forEach((msg) => {
        const messageElement = document.createElement("p");
        messageElement.className = "message";

        const senderName = msg.User
            ? msg.User.name
            : `User ${msg.userId}`;

        const senderElement = document.createElement("strong");
        senderElement.textContent = senderName;

        const textElement = document.createElement("span");
        textElement.textContent = msg.message;

        messageElement.append(senderElement, textElement);
        messagesContainer.appendChild(messageElement);
    });

    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

async function apiRequest(endpoint, options = {}) {
    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers: {
            ...(options.body ? { "Content-Type": "application/json" } : {}),
            Authorization: `Bearer ${token}`,
            ...options.headers,
        },
    });

    let result;

    try {
        result = await response.json();
    } catch {
        result = {};
    }

    if (!response.ok) {
        throw new Error(result.message || "Request failed");
    }

    return result;
}

// Load registered users for the users list and invite dropdown.
async function loadUsers() {
    try {
        const users = await apiRequest("/users");
        registeredUsers = Array.isArray(users) ? users : [];

        const userList = document.getElementById("users");
        userList.replaceChildren();
        inviteUserSelect.replaceChildren();

        const defaultOption = document.createElement("option");
        defaultOption.value = "";
        defaultOption.textContent = "Select user";
        inviteUserSelect.appendChild(defaultOption);

        registeredUsers.forEach((user) => {
            const listItem = document.createElement("li");
            listItem.textContent = user.name;
            userList.appendChild(listItem);

            const option = document.createElement("option");
            option.value = user.id;
            option.textContent = user.name;
            inviteUserSelect.appendChild(option);
        });
    } catch (error) {
        console.error("Error loading users:", error);
        showStatus(error.message || "Unable to load registered users.");
    }
}

function renderGroups(groups) {
    groupsList.replaceChildren();

    if (groups.length === 0) {
        const item = document.createElement("li");
        item.textContent = "No groups yet. Create one!";
        groupsList.appendChild(item);
        return;
    }

    groups.forEach((group) => {
        const item = document.createElement("li");
        const button = document.createElement("button");

        button.type = "button";
        button.className = "group-button";
        button.textContent = group.name;
        button.dataset.groupId = group.id;
        button.classList.toggle(
            "active",
            currentGroup && Number(currentGroup.id) === Number(group.id)
        );

        button.addEventListener("click", () => {
            selectGroup(group);
        });

        item.appendChild(button);
        groupsList.appendChild(item);
    });
}

async function loadGroups() {
    try {
        const result = await apiRequest("/groups");
        const groups = Array.isArray(result.groups) ? result.groups : [];

        renderGroups(groups);

        if (currentGroup) {
            const updatedCurrentGroup = groups.find(
                (group) => Number(group.id) === Number(currentGroup.id)
            );

            if (updatedCurrentGroup) {
                currentGroup = updatedCurrentGroup;
            } else {
                currentGroup = null;
                currentGroupMessages = [];
                selectedGroupName.textContent = "Select a group";
                messageInput.disabled = true;
                sendButton.disabled = true;
                inviteButton.disabled = true;
                displayMessages([]);
            }
        }

        if (!currentGroup && groups.length > 0) {
            await selectGroup(groups[0]);
        }
    } catch (error) {
        console.error("Error loading groups:", error);
        showStatus(error.message || "Unable to load groups.");
    }
}

async function selectGroup(group) {
    currentGroup = group;
    currentGroupMessages = getStoredMessages(group.id);

    selectedGroupName.textContent = group.name;
    messageInput.disabled = false;
    sendButton.disabled = false;
    inviteButton.disabled = false;

    renderGroups(
        Array.from(groupsList.querySelectorAll("button")).map((button) => ({
            id: button.dataset.groupId,
            name: button.textContent,
        })).filter((item) => item.id)
    );

    // Update active styling using the selected group ID.
    Array.from(groupsList.querySelectorAll(".group-button")).forEach((button) => {
        button.classList.toggle(
            "active",
            Number(button.dataset.groupId) === Number(group.id)
        );
    });

    displayMessages(currentGroupMessages);
    showStatus("");

    await loadMessages();
}

createGroupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const name = groupNameInput.value.trim();

    if (!name || groupRequestInProgress) {
        return;
    }

    groupRequestInProgress = true;

    try {
        const result = await apiRequest("/groups", {
            method: "POST",
            body: JSON.stringify({ name }),
        });

        groupNameInput.value = "";
        showStatus(result.message || "Group created successfully.");

        await loadGroups();

        if (result.group) {
            await selectGroup(result.group);
        }
    } catch (error) {
        console.error("Error creating group:", error);
        showStatus(error.message || "Unable to create group.");
    } finally {
        groupRequestInProgress = false;
    }
});

inviteButton.addEventListener("click", async () => {
    if (!currentGroup) {
        showStatus("Select a group first.");
        return;
    }

    const userId = Number(inviteUserSelect.value);

    if (!Number.isInteger(userId) || userId <= 0) {
        showStatus("Select a registered user to invite.");
        return;
    }

    try {
        const result = await apiRequest(
            `/groups/${currentGroup.id}/members`,
            {
                method: "POST",
                body: JSON.stringify({ userId }),
            }
        );

        showStatus(result.message || "User added to group successfully.");
    } catch (error) {
        console.error("Error inviting user:", error);
        showStatus(error.message || "Unable to invite user.");
    }
});

messageForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!currentGroup) {
        showStatus("Select a group before sending a message.");
        return;
    }

    const message = messageInput.value.trim();

    if (!message) {
        return;
    }

    const groupId = currentGroup.id;

    try {
        await apiRequest("/messages", {
            method: "POST",
            body: JSON.stringify({ message, groupId }),
        });

        messageInput.value = "";
        messageInput.focus();

        // Only refresh messages for the group that was selected when sending.
        if (currentGroup && Number(currentGroup.id) === Number(groupId)) {
            await loadMessages();
        }
    } catch (error) {
        console.error("Error sending message:", error);
        showStatus(error.message || "Unable to send message.");
    }
});

// Fetch only messages newer than the latest cached message for this group.
async function loadMessages() {
    if (!currentGroup || pollingInProgress) {
        return;
    }

    const groupId = currentGroup.id;
    pollingInProgress = true;

    try {
        const cachedMessages = getStoredMessages(groupId);
        currentGroupMessages = cachedMessages;

        if (currentGroup && Number(currentGroup.id) === Number(groupId)) {
            displayMessages(cachedMessages);
        }

        const lastMessageId = cachedMessages.length
            ? cachedMessages[cachedMessages.length - 1].id
            : 0;

        const result = await apiRequest(
            `/messages?groupId=${encodeURIComponent(groupId)}&lastMessageId=${encodeURIComponent(lastMessageId)}`
        );

        if (!Array.isArray(result)) {
            throw new Error("Unexpected message response from server.");
        }

        if (result.length > 0) {
            const mergedMessages = [...cachedMessages, ...result];
            const recentMessages = saveMessages(groupId, mergedMessages);

            if (currentGroup && Number(currentGroup.id) === Number(groupId)) {
                currentGroupMessages = recentMessages;
                displayMessages(recentMessages);
            }
        }
    } catch (error) {
        console.error("Error loading messages:", error);
    } finally {
        pollingInProgress = false;
    }
}

// Initialise the chat.
if (token) {
    messageInput.disabled = true;
    sendButton.disabled = true;
    inviteButton.disabled = true;

    loadUsers();
    loadGroups();

    // Preserve the existing one-second incremental polling.
    setInterval(loadMessages, 1000);

    // Refresh the group list periodically to show newly added memberships.
    setInterval(loadGroups, 5000);
}