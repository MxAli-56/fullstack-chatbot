document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("userInput");
  const btn = document.getElementById("sendBtn");
  const chatbot = document.getElementById("chatBot");
  const themeToggleBtn = document.getElementById("themeToggleBtn");

  let abortController = null;
  let oldestTimestamp = null;
  let loadingOlder = false;
  let hasMoreHistory = true; // stop infinite loads when server returns < PAGE_SIZE

  const PAGE_SIZE = 20;
  let displayName = localStorage.getItem("name") || "You";

  // Fetch the current user's name
  async function getCurrentUserName() {
    try {
      const res = await fetch("http://localhost:5000/api/current-user", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        displayName = data.name;
        localStorage.setItem("name", data.name); // Optionally store it
      }
    } catch (error) {
      console.error("Failed to fetch user name:", error);
    }
    await getCurrentUserName();
  }
  const token = localStorage.getItem("token");

  if (!token) {
    window.location.href = "login.html";
    return;
  }

  function appendMessage(role, text, name = "", opts) {
    const wrap = document.createElement("div");
    wrap.className = `msg ${role}`;

    if (name) {
      const u = document.createElement("div");
      u.className = "username";
      u.textContent = name;
      wrap.appendChild(u);
    }

    const body = document.createElement("div");
    body.className = "msg-body";
    body.innerHTML = marked.parse(text);
    wrap.appendChild(body);

    chatbot.appendChild(wrap);
    chatbot.scrollTop = chatbot.scrollHeight;

    // Ephemeral behavior: auto-remove after 2s for system messages
    const isSystem = role === "system";
    const ephemeral =
      opts && typeof opts.ephemeral === "boolean" ? opts.ephemeral : isSystem;
    const timeoutMs = (opts && opts.timeoutMs) || 2000;

    if (ephemeral) {
      setTimeout(() => {
        // start fade
        wrap.classList.add("fade-out");
        // remove after transition
        setTimeout(() => {
          if (wrap && wrap.parentNode) wrap.remove();
        }, 320);
      }, timeoutMs);
    }

    return wrap;
  }

  function setBusy(isBusy) {
    btn.disabled = false;
    btn.textContent = isBusy ? "🛑" : "Send";
  }

  async function loadMessages(initial = false) {
    if (!hasMoreHistory) return;

    try {
      const params = new URLSearchParams();
      params.set("limit", PAGE_SIZE.toString());
      if (!initial && oldestTimestamp) params.set("before", oldestTimestamp);

      const res = await fetch(
        `http://localhost:5000/api/messages?${params.toString()}`,
        {
          method: "GET",
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

      const batch = await res.json(); // Expecting an array of { text, sender, name?, timestamp }

      if (!Array.isArray(batch) || batch.length === 0) {
        hasMoreHistory = false;
        return;
      }

      const oldestIndex = 0;

      if (initial) {
        // Render from oldest -> newest
        const normalized = [...batch].reverse();
        for (const msg of normalized) {
          const role =
            msg.sender === "bot"
              ? "bot"
              : msg.sender === "system"
              ? "system"
              : "user";

          const name = msg.name || (role === "bot" ? "ChatAI" : "You");

          appendMessage(role, msg.text, name);
        }
        chatbot.scrollTop = chatbot.scrollHeight;
      } else {
        const oldHeight = chatbot.scrollHeight;

        // We want to prepend oldest->newest so the final visual order is preserved
        const normalized = [...batch].reverse();
        for (const msg of normalized) {
          const role =
            msg.sender === "bot"
              ? "bot"
              : msg.sender === "system"
              ? "system"
              : "user";

          // Build exactly like appendMessage, but insert as the first child
          const wrap = document.createElement("div");
          wrap.className = `msg ${role}`;

          if (msg.name) {
            const u = document.createElement("div");
            u.className = "username";
            u.textContent = msg.name;
            wrap.appendChild(u);
          }

          const body = document.createElement("div");
          body.className = "msg-body";
          body.textContent = msg.text;
          wrap.appendChild(body);

          chatbot.insertBefore(wrap, chatbot.firstChild);
        }

        const newHeight = chatbot.scrollHeight;
        chatbot.scrollTop = newHeight - oldHeight; // preserve viewport position
      }

      // Oldest after normalization is the last element of the original array
      const oldestMsg = batch[batch.length - 1];
      if (oldestMsg && oldestMsg.createdAt) {
        oldestTimestamp = oldestMsg.createdAt;
      }

      if (batch.length < PAGE_SIZE) {
        hasMoreHistory = false; // no more pages
      }
    } catch (err) {
      appendMessage("system", `Could not load history: ${err.message}`);
    }
  }

  // Initial history load
  loadMessages(true);

  // Infinite scroll: pull older messages at top
  chatbot.addEventListener("scroll", async () => {
    if (chatbot.scrollTop === 0 && !loadingOlder && hasMoreHistory) {
      loadingOlder = true;
      await loadMessages(false);
      loadingOlder = false;
    }
  });

  async function sendMessage() {
    const message = input.value.trim();
    if (!message) return;

    // Optimistic UI for user message
    appendMessage("user", message, "You");
    input.value = "";
    input.focus();
    setBusy(true);

    try {
      // 1) Persist user message
      const saveUserRes = await fetch("http://localhost:5000/api/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          text: message,
          sender: "user",
          name: displayName,
        }),
      });

      if (!saveUserRes.ok) {
        const reason = await saveUserRes.text();
        appendMessage("system", reason || "Could not save your message.");
        return;
      }

      // 2) Create bot bubble placeholder and stream into it
      const botWrap = appendMessage("bot", "", "ChatAI");
      const botBody = botWrap.querySelector(".msg-body");

      let botText = "";
      abortController = new AbortController();
      const signal = abortController.signal;

      const chatRes = await fetch("http://localhost:5000/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ prompt: message }),
        signal,
      });

      if (!chatRes.ok) {
        const errText = await chatRes.text();
        appendMessage(
          "system",
          errText || `Request failed (${chatRes.status})`
        );
        return;
      }

      if (!chatRes.body || !chatRes.body.getReader) {
        // Fallback for non-streaming responses
        const data = await chatRes.json().catch(() => null);
        botText = data?.reply || "";
        botBody.textContent = botText;
      } else {
        // Streaming NDJSON: one JSON per line { token?: string, done?: boolean }
        const reader = chatRes.body.getReader();
        const decoder = new TextDecoder();
        let partial = "";

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          partial += decoder.decode(value, { stream: true });
          const lines = partial.split("\n");
          partial = lines.pop() || ""; // keep the last incomplete chunk

          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const obj = JSON.parse(line);
              if (obj.token) {
                botText += obj.token;
                botBody.textContent = botText;
                chatbot.scrollTop = chatbot.scrollHeight;
              }
              if (obj.done) {
                // stream finished from server side
              }
            } catch (e) {
              console.error("Stream parse error:", e, line);
            }
          }
        }

        // Flush any remaining buffered data if it is a complete JSON
        if (partial.trim()) {
          try {
            const obj = JSON.parse(partial);
            if (obj.token) {
              botText += obj.token;
              botBody.textContent = botText;
            }
          } catch (_) {
            // ignore trailing noise
          }
        }
      }

      // 3) Persist bot reply
      if (botText && botText.trim()) {
        const saveBotRes = await fetch("http://localhost:5000/api/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            text: botText,
            sender: "bot",
            name: "ChatAI",
          }),
        });

        if (!saveBotRes.ok) {
          const reason = await saveBotRes.text();
          appendMessage("system", reason || "Could not save bot reply.");
        }
      }
    } catch (err) {
      if (err.name === "AbortError") {
        appendMessage("system", "AI response stopped.");
      } else {
        appendMessage("system", `Network error: ${err.message}`);
      }
    } finally {
      setBusy(false);
      abortController = null;
    }
  }

  // THEME
  if (localStorage.getItem("theme") === "dark") {
    document.body.classList.add("dark-mode");
    if (themeToggleBtn) themeToggleBtn.textContent = "Light Mode";
  }

  themeToggleBtn?.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");
    if (document.body.classList.contains("dark-mode")) {
      localStorage.setItem("theme", "dark");
      themeToggleBtn.textContent = "Light Mode";
    } else {
      localStorage.setItem("theme", "light");
      themeToggleBtn.textContent = "Dark Mode";
    }
  });

  // Helper: stop current AI response
  function stopResponse() {
    if (abortController) {
      abortController.abort();
      setBusy(false);
      abortController = null;
    }
  }

  // SEND / STOP button (mouse click)
  btn.addEventListener("click", () => {
    if (abortController) {
      stopResponse();
    } else {
      sendMessage();
    }
  });

  // Enter to send / stop
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (abortController) {
        stopResponse();
      } else {
        sendMessage();
      }
    }
  });

  // Logout
  document.getElementById("logoutBtn")?.addEventListener("click", () => {
    localStorage.removeItem("token");
    localStorage.removeItem("name");
    window.location.href = "login.html";
  });
});