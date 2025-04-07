function openSettings() {
    document.getElementById('settings-overlay').classList.remove('hidden');
  }
  function closeSettings() {
    document.getElementById('settings-overlay').classList.add('hidden');
  }
  function setMode(mode) {
    document.body.className = mode;
    closeSettings();
  }
  
  function sendMessage() {
    const input = document.getElementById('chat-input');
    const message = input.value.trim();
    if (!message) return;
  
    const chatLog = document.getElementById('chat-log');
  
    // 사용자 메시지 생성
    const userChat = document.createElement('div');
    userChat.className = 'chat-message user-message';
    userChat.innerText = message;
    chatLog.appendChild(userChat);
  
    // GPT 응답 생성 (임시)
    const botChat = document.createElement('div');
    botChat.className = 'chat-message bot-message';
    botChat.innerText = '이곳에 GPT 응답이 출력됩니다.';
    chatLog.appendChild(botChat);
  
    // 스크롤 하단 고정
    chatLog.scrollTop = chatLog.scrollHeight;
  
    input.value = '';
  }  
  
  // 엔터키로 전송
  document.getElementById('chat-input').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') sendMessage();
  });
  
  // 좌측 메뉴 토글 기능
  const menuToggleBtn = document.getElementById('menu-toggle');
  const sidebar = document.getElementById('menubar');
  
  menuToggleBtn.addEventListener('click', () => {
    sidebar.classList.toggle('visible');
  });  

  // X축 해상도 850이하일 경우 모바일 사이즈로 변경
  window.addEventListener('resize', () => {
    if (window.innerWidth > 850) {
      sidebar.classList.remove('visible');
    }
  });