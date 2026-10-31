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
const userSearchInput = document.getElementById("userSearchInput");
const searchUsersButton = document.getElementById("searchUsersButton");
const groupMembersList = document.getElementById("groupMembersList");
const userSearchResults = document.getElementById("userSearchResults");
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
        placeholder.textContent =
            "Create a group or select one to start chatting.";
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

// Load registered users for the existing users list.
async function loadUsers() {
    try {
        const result = await apiRequest("/users");
        registeredUsers = Array.isArray(result)
            ? result
            : Array.isArray(result.users)
                ? result.users
                : [];

        const userList = document.getElementById("users");
        userList.replaceChildren();

        registeredUsers.forEach((user) => {
            const listItem = document.createElement("li");
            listItem.textContent = user.name;
            userList.appendChild(listItem);
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
            currentGroup &&
                Number(currentGroup.id) === Number(group.id)
        );

        button.addEventListener("click", () => selectGroup(group));

        item.appendChild(button);
        groupsList.appendChild(item);
    });
}

function updateAdminControls() {
    const isAdmin = Boolean(currentGroup && currentGroup.isAdmin);
    const hasGroup = Boolean(currentGroup);

    userSearchInput.disabled = !isAdmin;
    searchUsersButton.disabled = !isAdmin;

    if (!hasGroup) {
        groupMembersList.replaceChildren();

        const item = document.createElement("li");
        item.textContent = "Select a group to view its members.";
        groupMembersList.appendChild(item);

        userSearchResults.replaceChildren();
        userSearchInput.value = "";
    } else if (!isAdmin) {
        userSearchResults.replaceChildren();
        userSearchInput.value = "";
    }
}

async function loadGroups() {
    try {
        const result = await apiRequest("/groups");
        const groups = Array.isArray(result.groups) ? result.groups : [];

        renderGroups(groups);

        if (currentGroup) {
            const updatedCurrentGroup = groups.find(
                (group) =>
                    Number(group.id) === Number(currentGroup.id)
            );

            if (updatedCurrentGroup) {
                currentGroup = updatedCurrentGroup;
            } else {
                currentGroup = null;
                currentGroupMessages = [];
                selectedGroupName.textContent = "Select a group";
                messageInput.disabled = true;
                sendButton.disabled = true;
                displayMessages([]);
                updateAdminControls();
            }
        }

        if (!currentGroup && groups.length > 0) {
            await selectGroup(groups[0]);
        } else {
            updateAdminControls();
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

    updateAdminControls();
    renderGroupsFromCurrentData();

    displayMessages(currentGroupMessages);
    showStatus("");

    await loadGroupMembers();
    await loadMessages();
}

function renderGroupsFromCurrentData() {
    const buttons = groupsList.querySelectorAll(".group-button");

    buttons.forEach((button) => {
        button.classList.toggle(
            "active",
            Number(button.dataset.groupId) === Number(currentGroup?.id)
        );
    });
}

async function loadGroupMembers() {
    if (!currentGroup) {
        return;
    }

    const groupId = currentGroup.id;

    try {
        const result = await apiRequest(`/groups/${groupId}/members`);
        const members = Array.isArray(result.members) ? result.members : [];

        // Ignore results if the user has switched groups while loading.
        if (!currentGroup || Number(currentGroup.id) !== Number(groupId)) {
            return;
        }

        groupMembersList.replaceChildren();

        if (members.length === 0) {
            const item = document.createElement("li");
            item.textContent = "No members found.";
            groupMembersList.appendChild(item);
            return;
        }

        members.forEach((member) => {
            const item = document.createElement("li");

            const details = document.createElement("span");
            details.textContent =
                `${member.name} (${member.email})` +
                (member.isAdmin ? " — Admin" : "");

            item.appendChild(details);

            if (currentGroup.isAdmin && !member.isAdmin) {
                const promoteButton = document.createElement("button");
                promoteButton.type = "button";
                promoteButton.textContent = "Make Admin";

                promoteButton.addEventListener("click", async () => {
                    await promoteMember(member.id);
                });

                item.appendChild(promoteButton);
            }

            const isGroupCreator =
                Number(member.id) === Number(currentGroup.createdBy);

            if (currentGroup.isAdmin && !isGroupCreator) {
                const removeButton = document.createElement("button");
                removeButton.type = "button";
                removeButton.textContent = "Remove";

                removeButton.addEventListener("click", async () => {
                    await removeMember(member.id);
                });

                item.appendChild(removeButton);
            }

            groupMembersList.appendChild(item);
        });
    } catch (error) {
        console.error("Error loading group members:", error);

        if (currentGroup && Number(currentGroup.id) === Number(groupId)) {
            groupMembersList.replaceChildren();

            const item = document.createElement("li");
            item.textContent = error.message || "Unable to load group members.";
            groupMembersList.appendChild(item);
        }
    }
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
            await loadGroups();
            await selectGroup(result.group);
        }
    } catch (error) {
        console.error("Error creating group:", error);
        showStatus(error.message || "Unable to create group.");
    } finally {
        groupRequestInProgress = false;
    }
});

async function searchUsers() {
    if (!currentGroup) {
        showStatus("Select a group first.");
        return;
    }

    if (!currentGroup.isAdmin) {
        showStatus("Only group admins can search for users to add.");
        return;
    }

    const searchTerm = userSearchInput.value.trim();

    if (!searchTerm) {
        showStatus("Enter a name, email, or phone number to search.");
        return;
    }

    const groupId = currentGroup.id;
    userSearchResults.replaceChildren();

    try {
        const result = await apiRequest(
            `/groups/${groupId}/users/search?q=${encodeURIComponent(searchTerm)}`
        );

        if (!currentGroup || Number(currentGroup.id) !== Number(groupId)) {
            return;
        }

        const users = Array.isArray(result.users) ? result.users : [];

        if (users.length === 0) {
            const message = document.createElement("p");
            message.textContent = "No matching users found.";
            userSearchResults.appendChild(message);
            return;
        }

        users.forEach((user) => {
            const item = document.createElement("div");

            const details = document.createElement("span");
            details.textContent =
                `${user.name} — ${user.email} — ${user.phone}`;

            const addButton = document.createElement("button");
            addButton.type = "button";
            addButton.textContent = "Add to Group";

            addButton.addEventListener("click", async () => {
                await addMember(user.id);
            });

            item.append(details, addButton);
            userSearchResults.appendChild(item);
        });
    } catch (error) {
        console.error("Error searching users:", error);
        showStatus(error.message || "Unable to search users.");
    }
}

searchUsersButton.addEventListener("click", searchUsers);

userSearchInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        event.preventDefault();
        searchUsers();
    }
});

async function addMember(userId) {
    if (!currentGroup || !currentGroup.isAdmin) {
        showStatus("Only group admins can add users.");
        return;
    }

    const groupId = currentGroup.id;

    try {
        const result = await apiRequest(`/groups/${groupId}/members`, {
            method: "POST",
            body: JSON.stringify({ userId }),
        });

        showStatus(result.message || "User added to group successfully.");

        userSearchResults.replaceChildren();
        userSearchInput.value = "";

        await loadGroupMembers();
    } catch (error) {
        console.error("Error adding member:", error);
        showStatus(error.message || "Unable to add user.");
    }
}

async function promoteMember(userId) {
    if (!currentGroup || !currentGroup.isAdmin) {
        showStatus("Only group admins can promote members.");
        return;
    }

    const groupId = currentGroup.id;

    try {
        const result = await apiRequest(
            `/groups/${groupId}/members/${userId}/admin`,
            { method: "PATCH" }
        );

        showStatus(result.message || "Member promoted to admin successfully.");

        await loadGroupMembers();
    } catch (error) {
        console.error("Error promoting member:", error);
        showStatus(error.message || "Unable to promote member.");
    }
}

async function removeMember(userId) {
    if (!currentGroup || !currentGroup.isAdmin) {
        showStatus("Only group admins can remove members.");
        return;
    }

    const confirmed = window.confirm(
        "Are you sure you want to remove this member from the group?"
    );

    if (!confirmed) {
        return;
    }

    const groupId = currentGroup.id;

    try {
        const result = await apiRequest(
            `/groups/${groupId}/members/${userId}`,
            { method: "DELETE" }
        );

        showStatus(result.message || "Member removed from group successfully.");

        await loadGroupMembers();
    } catch (error) {
        console.error("Error removing member:", error);
        showStatus(error.message || "Unable to remove member.");
    }
}

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
    userSearchInput.disabled = true;
    searchUsersButton.disabled = true;

    loadUsers();
    loadGroups();

    // Preserve the existing one-second incremental message polling.
    setInterval(loadMessages, 1000);

    // Refresh groups periodically to detect membership changes.
    setInterval(loadGroups, 5000);
}