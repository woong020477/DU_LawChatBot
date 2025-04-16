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
  
  // 사용자 메시지를 보내고 GPT 응답을 받아오는 함수
  async function sendMessage(message) {
    // 사용자 메시지 생성
    const userChat = document.createElement('div');
    userChat.className = 'chat-message user-message';
    userChat.innerText = message;
    chatLog.appendChild(userChat);

    try {
      // 서버에 사용자 메시지 보내기
      const response = await fetch('http://localhost:3000/sendMessage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userMessage: message }),
      });

      const data = await response.json();
      const botMessage = data.botMessage; // GPT 응답 받기

      // GPT 응답 생성
      const botChat = document.createElement('div');
      botChat.className = 'chat-message bot-message';
      botChat.innerText = botMessage;
      chatLog.appendChild(botChat);

      // 화면 스크롤을 최신 메시지로 이동
      chatLog.scrollTop = chatLog.scrollHeight;
    } catch (error) {
      console.error('Error:', error);
      const botChat = document.createElement('div');
      botChat.className = 'chat-message bot-message';
      botChat.innerText = '서버 오류가 발생했습니다. 다시 시도해주세요.';
      chatLog.appendChild(botChat);
    }
  }

  // 전송 버튼 클릭 시 메시지 전송
  const sendButton = document.querySelector('#send-button');
  sendButton.addEventListener('click', () => {
    const message = document.querySelector('#message-input').value;  // 사용자 입력값
    if (message) {
      sendMessage(message);  // 메시지 전송
    }
  });
  
  // 좌측 메뉴 토글 기능
  const menuToggleBtn = document.getElementById('menu-toggle');
  const sidebar = document.getElementById('menubar');
  
  menuToggleBtn.addEventListener('click', () => {
    sidebar.classList.toggle('visible');
  });