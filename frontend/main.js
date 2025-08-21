// main.js

document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("userInput");
  const btn = document.getElementById("sendBtn");
  const chatbot = document.getElementById("chatBot");

  const token = localStorage.getItem("token")
  if(!token){
    window.location.href = "login.html";
  }
  else{
  function appendMessage(role, text) {
    const div = document.createElement("div");
    div.className = `msg ${role}`;
    div.textContent = text;
    chatbot.appendChild(div);
    chatbot.scrollTop = chatbot.scrollHeight;
    return div;
  };

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
      // Create placeholder for bot's streaming response
      const botMsgElem = appendMessage("bot", "");

      const res = await fetch("/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_input: message }),
      });

      if (!res.ok) {
        const err = await res.text();
        appendMessage("system", err || `Request failed (${res.status})`);
        return;
      }

      // Handle streaming text
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let partialText = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        partialText += decoder.decode(value, { stream: true });

        // Process each SSE line
        const lines = partialText.split("\n\n");
        partialText = lines.pop(); // Save unfinished part

        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          const jsonStr = line.slice(5).trim();
          if (jsonStr === "[DONE]") return;
          try {
            const data = JSON.parse(jsonStr);
            if (data.token) {
              botMsgElem.textContent += data.token;
            }
          } catch (err) {
            console.error("Parse error", err);
          }
        }
      }
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
}});
