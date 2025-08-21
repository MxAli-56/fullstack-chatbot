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

      const history = await res.json(); // expect array of { text, sender, ... }
      // Show a friendly first message if no history yet
      if (!Array.isArray(history) || history.length === 0) {
        appendMessage("bot", "I am your local Chatbot, ask me anything!");
        return;
      }

      history.forEach((msg) => {
        const role = msg.sender === "user" ? "user" : "bot";
        appendMessage(role, msg.text);
      });
    } catch (err) {
      appendMessage("system", `Could not load history: ${err.message}`);
    }
  }

  // Call it right away
  loadMessages();

  function setBusy(isBusy) {
    btn.disabled = isBusy;
    input.disabled = isBusy;
    btn.textContent = isBusy ? "Sending..." : "Send";
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

      const res = await fetch("http://localhost:5000/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ prompt: message }),
      });


      if (!res.ok) {
        const err = await res.text();
        appendMessage("system", err || `Request failed (${res.status})`);
        return;
      }

      // Stream AI response
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
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
              botMsgElem.textContent += data.token; // streaming typing
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
      appendMessage("system", `Network error ${e.message}`);
    } finally {
      setBusy(false);
      input.focus();
    }
  }

  btn.addEventListener("click", sendMessage);

  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      sendMessage();
    }
  });

  document.getElementById("logoutBtn")?.addEventListener('click', function(){
    localStorage.removeItem("token")
    window.location.href = "login.html"
  })
});
