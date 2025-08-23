//  auth.js

const API_URL = "http://localhost:5000/api/users";

const signupForm = document.getElementById("signupForm");
if (signupForm){
    signupForm.addEventListener("submit", async(e) => {
        e.preventDefault()

        const name = document.getElementById("name").value
        const email = document.getElementById("email").value
        const password = document.getElementById("password").value

        try {
            const res = await fetch(`${API_URL}/signup`, {
                method: "POST",
                headers: {"Content-type": "application/json"},
                body: JSON.stringify({name, email, password})
            })
            const data = await res.json()
            localStorage.setItem("name", name)

            alert(data.message || "Signup successful, Now Login!")
            window.location.href = "login.html"

        } catch (error) {
            alert("Signup failed: " + error.message);
        }
    })
}

const loginForm = document.getElementById("loginForm")
if (loginForm){
    loginForm.addEventListener("submit", async(e) => {
        e.preventDefault()

        const email = document.getElementById("email").value
        const password = document.getElementById("password").value

        try {
            const res = await fetch(`${API_URL}/login`, {
                method: "POST",
                headers: {"Content-type": "application/json"},
                body: JSON.stringify({email, password})
            })
            const data = await res.json()
            if (data.token){
                localStorage.setItem("token", data.token)
                if (data.user && data.user.name){
                    localStorage.setItem("name", data.user.name)
                }                
                alert("Login Successful")
                window.location.href = "index.html"
            }
            else{
                alert(data.message || "login failed")
            }
        }
        catch(error){
            alert("Login failed: " + error.message);
        }
    })
}