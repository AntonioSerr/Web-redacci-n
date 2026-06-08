/* chat.js — Chat Tutor Module */

var chatHistory = [];

document.addEventListener('DOMContentLoaded', function() {
  var sendBtn = document.getElementById('chat-send-btn');
  var inputEl = document.getElementById('chat-input');

  if (sendBtn) {
    sendBtn.addEventListener('click', sendChatMessage);
  }

  if (inputEl) {
    inputEl.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        sendChatMessage();
      }
    });
  }
});

function appendChatBubble(role, text) {
  var historyContainer = document.getElementById('chat-history');
  if (!historyContainer) return;

  var bubbleWrapper = document.createElement('div');
  bubbleWrapper.className = 'chat-bubble ' + (role === 'user' ? 'user' : 'tutor');

  var content = document.createElement('div');
  content.className = 'bubble-content';
  if (role === 'tutor' && typeof marked !== 'undefined') {
    content.innerHTML = marked.parse(text);
  } else {
    content.textContent = text;
  }

  bubbleWrapper.appendChild(content);
  historyContainer.appendChild(bubbleWrapper);
  
  // Auto-scroll
  historyContainer.scrollTop = historyContainer.scrollHeight;
}

async function sendChatMessage() {
  var inputEl = document.getElementById('chat-input');
  var sendBtn = document.getElementById('chat-send-btn');
  if (!inputEl || !sendBtn) return;

  var text = inputEl.value.trim();
  if (!text) return;

  // Add user message to UI and history
  appendChatBubble('user', text);
  chatHistory.push({ role: 'user', content: text });
  
  inputEl.value = '';
  inputEl.disabled = true;

  var settings = getSettings();
  try {
    var systemInstruction = formatPrompt(CHAT_SYSTEM, {
      target_language: settings.targetLanguage,
      native_language: settings.nativeLanguage,
      level: settings.level
    });

    var historyText = chatHistory.slice(0, -1).map(msg => 
      (msg.role === 'user' ? 'Student: ' : 'Tutor: ') + msg.content
    ).join('\n');
    
    var userPrompt = `Chat History:\n${historyText}\nStudent: ${text}\nTutor:`;
    
    if (sendBtn) { sendBtn.disabled = true; sendBtn.textContent = 'IA Pensando...'; }
    showAiToast('IA Pensando...');

    var response = await callGeminiAPI(systemInstruction, userPrompt, false);
    var data = { reply: response.data };
    
    if (data && data.reply) {
      appendChatBubble('tutor', data.reply);
      chatHistory.push({ role: 'tutor', content: data.reply });
    }
  } catch (error) {
    appendChatBubble('tutor', '⚠️ Error: ' + error.message);
    // Remove the user message from history array so they can retry without polluting context
    chatHistory.pop();
  } finally {
    if (sendBtn) { sendBtn.disabled = false; sendBtn.textContent = 'Enviar'; }
    hideAiToast();
    inputEl.disabled = false;
    inputEl.focus();
  }
}
