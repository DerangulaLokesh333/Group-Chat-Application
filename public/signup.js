const signupForm = document.getElementById("signupForm");

signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const password = document.getElementById("password").value;

    try {
        const response = await fetch("/api/users/signup", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ name, email, phone, password })
        });

        const message = await response.text();

        if (response.ok) {
            alert("Successfuly signed up");
            signupForm.reset();
        } else if (response.status === 400 && message.includes("User already exists")) {
            alert("User already exists, Please Login");
        } else {
            alert(message);
        }
    } catch (error) {
        console.error("Signup error:", error);
        alert("Unable to connect to the server. Please try again.");
    }
});