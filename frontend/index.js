document.addEventListener('DOMContentLoaded', () => {
  const chatLog = document.querySelector('#chat-log');
  const sendButton = document.querySelector('#send-button');
  const messageInput = document.querySelector('#message-input');

  // ☰ 메뉴 토글 기능 추가
  const menuToggle = document.getElementById('menu-toggle');
  const menubar = document.getElementById('menubar');

  if (menuToggle && menubar) {
    menuToggle.addEventListener('click', () => {
      menubar.classList.toggle('visible');
    });
  }

  // 요소가 없으면 에러 처리
  if (!chatLog || !sendButton || !messageInput) {
    console.error("필요한 HTML 요소가 없습니다.");
    return;
  }

  // 사용자 메시지를 보내고 GPT 응답을 받아오는 함수
  async function sendMessage() {
    const message = messageInput.value;  // 사용자 입력값

    if (!message) {
      return;  // 메시지가 없으면 전송하지 않음
    }

    // 사용자 메시지 생성
    const userChat = document.createElement('div');
    userChat.className = 'chat-message user-message';
    userChat.innerText = message;
    chatLog.appendChild(userChat);

    try {
      // 서버로 사용자 메시지 보내기
      const response = await fetch('http://localhost:3000/sendMessage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userMessage: message }),  // 서버로 보낼 메시지
      });

      if (!response.ok) {
        throw new Error('Failed to send message to the server.');
      }

      const data = await response.json();
      const botMessage = data.botMessage;  // GPT 응답 받기

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

    // 입력 필드 비우기
    messageInput.value = '';
  }

  // 전송 버튼 클릭 시 메시지 전송
  sendButton.addEventListener('click', () => {
    const message = messageInput.value;  // 사용자 입력값
    if (message) {
      sendMessage();  // 메시지 전송
      messageInput.value = '';  // 입력 필드 비우기
    }
  });

  // Enter 키를 눌렀을 때 메시지 전송
  messageInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault(); // 기본 Enter 동작 방지 (줄바꿈 방지)
      const message = messageInput.value;  // 사용자 입력값
      if (message) {
        sendMessage();  // 메시지 전송
        messageInput.value = '';  // 입력 필드 비우기
      }
    }
  });

  // 설정 열기
  function openSettings() {
    const overlay = document.getElementById('settings-overlay');
    if (overlay) {
      overlay.classList.remove('hidden');
    }
  }

  // 설정 닫기
  function closeSettings() {
    const overlay = document.getElementById('settings-overlay');
    if (overlay) {
      overlay.classList.add('hidden');
    }
  }

  // 라이트 / 다크 모드 설정
  function setMode(mode) {
    if (mode === 'light') {
      document.body.classList.remove('dark');
      document.body.classList.add('light');
    } else if (mode === 'dark') {
      document.body.classList.remove('light');
      document.body.classList.add('dark');
    }
  }
  
  window.openSettings = openSettings;
  window.closeSettings = closeSettings;
  window.setMode = setMode;
});