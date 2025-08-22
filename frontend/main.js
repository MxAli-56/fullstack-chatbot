// main.js

document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("userInput");
  const btn = document.getElementById("sendBtn");
  const chatbot = document.getElementById("chatBot");

  const token = localStorage.getItem("token")
  if(!token){
    window.location.href = "login.html";
  } 
  function appendMessage(role, text) {
    const div = document.createElement("div");
    div.className = `msg ${role}`;
    div.textContent = text;
    chatbot.appendChild(div);
    chatbot.scrollTop = chatbot.scrollHeight;
    return div;
  };
  
  let abortController = null

  async function loadMessages() {
    try {
      const res = await fetch("http://localhost:5000/api/messages", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.status === 401 || res.status === 403) {
        // token invalid/expired → force login
        localStorage.removeItem("token");
        window.location.href = "login.html";
        return;
      }

      if (!res.ok) {
        const txt = await res.text();
        appendMessage(
          "system",
          txt || `Failed to load history (${res.status})`
        );
        return;
      }

      const history = await res.json(); 
      history.forEach((msg) => {
        appendMessage(msg.senderid === token ? "user" : "bot", msg.text); 
      });
    } catch (err) {
      appendMessage("system", `Could not load history: ${err.message}`);
    }
  }

  // Call it right away
  loadMessages();

  function setBusy(isBusy) {
    btn.disabled = false;
    btn.textContent = isBusy ? "🛑" : "Send";
  }


  async function sendMessage() {
    const message = input.value.trim();
    if (!message) return;

    appendMessage("user", message);
    input.value = "";
    setBusy(true);

    try {
      // Save user message in DB
      await fetch("http://localhost:5000/api/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text: message, sender: "user" }),
      });

      // Add empty bot bubble
      const botMsgElem = appendMessage("bot", "");

      // Call AI (Node backend)

      abortController = new AbortController()
      const signal = abortController.signal

      const res = await fetch("http://localhost:5000/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ prompt: message }),
        signal
      });


      if (!res.ok) {
        const err = await res.text();
        appendMessage("system", err || `Request failed (${res.status})`);
        return;
      }

      // Stream AI response
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      const typingIndicator = appendMessage("Bot", "AI is typing...")
      let partialText = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        partialText += decoder.decode(value, { stream: true });

        const lines = partialText.split("\n");
        partialText = lines.pop();

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const data = JSON.parse(line);
            if (data.token) {
              typingIndicator.textContent += data.token; // streaming typing
            } else if (data.done) {
              break;
            }
          } catch (err) {
            console.error("Parse error", err, line);
          }
        }
      }

      // Save bot reply in DB
      await fetch("http://localhost:5000/api/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text: botMsgElem.textContent, sender: "bot" }),
      });
    } catch (e) {
      if (err.name === "AbortError") {
        appendMessage("system", "AI response stopped.");
      } else {
        appendMessage("system", `Network error: ${err.message}`);
      }
    } finally {
      setBusy(false);
      abortController = null
      input.focus();
    }
  }

  const themeToggleBtn = document.getElementById("themeToggleBtn");

  // Apply saved theme on page load
  if (localStorage.getItem("theme") === "dark") {
    document.body.classList.add("dark-mode");
    themeToggleBtn.textContent = "Light Mode";
  }

  // Toggle theme on click
  themeToggleBtn.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");
    if (document.body.classList.contains("dark-mode")) {
      localStorage.setItem("theme", "dark");
      themeToggleBtn.textContent = "Light Mode";
    } else {
      localStorage.setItem("theme", "light");
      themeToggleBtn.textContent = "Dark Mode";
    }
  });

  btn.addEventListener("click", () => {
    if (abortController){
      abortController.abort()
    }else{
      sendMessage()
    }
  });

  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if(!abortController) sendMessage();
    }
  });

  document.getElementById("logoutBtn")?.addEventListener('click', function(){
    localStorage.removeItem("token")
    window.location.href = "login.html"
  })
});
