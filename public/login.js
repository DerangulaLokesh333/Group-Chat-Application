document.getElementById("loginForm").addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    try {
        const response = await axios.post(
            "http://localhost:3000/api/users/login",
            {
                email,
                password
            }
        );

        // Save the JWT returned by the backend
        localStorage.setItem("token", response.data.token);

        alert(response.data.message);

        // Open the chat window served by Express
        window.location.href = "http://localhost:3000/chat.html";

    } catch (error) {
        const message = error.response
            ? error.response.data.message
            : error.message;

        alert("Login failed: " + message);

    } finally {
        document.getElementById("loginForm").reset();
    }
});