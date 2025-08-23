// main.js

document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("userInput");
  const btn = document.getElementById("sendBtn");
  const chatbot = document.getElementById("chatBot");
  let oldestTimestamp = null; 
  let loadingOlder = false; 
  const PAGE_SIZE = 20; 
  const displayName = localStorage.getItem("name") || "You"
  const botName = "ChatAI"

  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "login.html";
  }
  function appendMessage(role, text, name = "") {
    const wrap = document.createElement("div");
    wrap.className = `msg ${role}`;

    if(name){
      const u = document.createElement(div)
      u.className = "username"
      u.textContent = name
      wrap.appendChild(u)
    }
    const body = document.createElement(div)
    body.textContent = text
    wrap.appendChild(body)
    
    chatbot.appendChild(wrap);
    chatbot.scrollTop = chatbot.scrollHeight;
    return wrap;
  }

  let abortController = null;


  async function loadMessages(initial = false) {
    try {
      const params = new URLSearchParams();
      params.set("limit", PAGE_SIZE.toString());
      // only include "before" on subsequent loads (when we have an oldest)
      if (!initial && oldestTimestamp) {
        params.set("before", oldestTimestamp);
      }

      const res = await fetch(`http://localhost:5000/api/messages?${params.toString()}`,
        { method: "GET",
          headers: {
            "Content-Type": "application/json",
             Authorization: `Bearer ${token}`,
          },
        }
      );

      if (res.status === 401 || res.status === 403) {
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

      const batch = await res.json(); 

      if (initial) {
        batch.forEach((msg) => {
          const role = msg.sender === "bot" ? "bot" : "user";
          const name = msg.name || (role === "bot" ? botName : displayName);
          appendMessage(role, msg.text, name);
        });

        // After initial load, scroll to bottom
        chatbot.scrollTop = chatbot.scrollHeight;
      } else {
        const oldHeight = chatbot.scrollHeight;

        // Prepend in order (oldest->newest), so we insert before first child each time
        for (const msg of batch) {
          const role = msg.sender === "bot" ? "bot" : "user";
          const div = document.createElement("div");
          div.className = `msg ${role}`;
          div.textContent = msg.text;
          chatbot.insertBefore(div, chatbot.firstChild);
        }

        // Adjust scroll so it doesn't jump
        const newHeight = chatbot.scrollHeight;
        chatbot.scrollTop = newHeight - oldHeight;
      }

      const oldest = batch[0];
      if (oldest && oldest.timestamp) {
        oldestTimestamp = oldest.timestamp; 
      }
    } catch (err) {
      appendMessage("system", `Could not load history: ${err.message}`);
    }
  }

  // Call once on startup
  loadMessages(true);

  // Detect scroll-to-top to load older messages
  chatbot.addEventListener("scroll", async () => {
    if (chatbot.scrollTop === 0 && !loadingOlder) {
      loadingOlder = true;
      await loadMessages(false);
      loadingOlder = false;
    }
  });

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
        body: JSON.stringify({ text: message, sender: "user", name: displayName }),
      });

      // Add empty bot bubble
      const botMsgElem = appendMessage("bot", "", botName);

      // Call AI (Node backend)

      abortController = new AbortController();
      const signal = abortController.signal;

      const res = await fetch("http://localhost:5000/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ prompt: message }),
        signal,
      });

      if (!res.ok) {
        const err = await res.text();
        appendMessage("system", err || `Request failed (${res.status})`);
        return;
      }

      // Stream AI response
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      const typingIndicator = appendMessage("Bot", "AI is typing...");
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
        body: JSON.stringify({ text: botMsgElem.textContent, sender: "bot", name: botName }),
      });
    } catch (e) {
      if (err.name === "AbortError") {
        appendMessage("system", "AI response stopped.");
      } else {
        appendMessage("system", `Network error: ${err.message}`);
      }
    } finally {
      setBusy(false);
      abortController = null;
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
    if (abortController) {
      abortController.abort();
    } else {
      sendMessage();
    }
  });

  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!abortController) sendMessage();
    }
  });

  document.getElementById("logoutBtn")?.addEventListener("click", function () {
    localStorage.removeItem("token");
    window.location.href = "login.html";
  });
});
