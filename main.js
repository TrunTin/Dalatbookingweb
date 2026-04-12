/* =========================================
   1. NAVIGATION & MENU MOBILE
   ========================================= */
const menuBtn = document.getElementById("menu-btn");
const navLinks = document.getElementById("nav-links");
const menuBtnIcon = menuBtn.querySelector("i");

menuBtn.addEventListener("click", () => {
  navLinks.classList.toggle("open");
  const isOpen = navLinks.classList.contains("open");
  menuBtnIcon.setAttribute("class", isOpen ? "ri-close-line" : "ri-menu-line");
});

navLinks.addEventListener("click", (e) => {
  if (!e.target.closest(".nav__user")) {
    navLinks.classList.remove("open");
    menuBtnIcon.setAttribute("class", "ri-menu-line");
  }
});

/* =========================================
   2. HỆ THỐNG AUTH
   ========================================= */
const API_BASE_URL =
  "https://dalattripweb-326170003754.asia-southeast1.run.app/api";

const loginBtn = document.querySelector('a[href="#login"]');
const signupBtn = document.querySelector('a[href="#signup"]');
const newsSection = document.getElementById("nav-news");
const userProfile = document.getElementById("user-profile");
const usernameDisplay = document.getElementById("username-display");
const userDropdownBtn = document.getElementById("user-dropdown-btn");
const userDropdownContent = document.getElementById("user-dropdown-content");
const logoutBtn = document.getElementById("logout-btn");

const authModal = document.getElementById("auth-modal");
const authClose = document.getElementById("auth-close");
const authTabBtns = document.querySelectorAll(".auth-tab-btn");
const authForms = document.querySelectorAll(".auth-form");

function openAuthModal(targetFormId) {
  authModal.classList.add("show");
  authTabBtns.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.target === targetFormId);
  });
  authForms.forEach((form) => {
    form.classList.toggle("active", form.id === targetFormId);
  });
}

if (loginBtn) {
  loginBtn.addEventListener("click", (e) => {
    e.preventDefault();
    openAuthModal("login-form");
  });
}

if (signupBtn) {
  signupBtn.addEventListener("click", (e) => {
    e.preventDefault();
    openAuthModal("signup-form");
  });
}

if (authClose) {
  authClose.addEventListener("click", () => authModal.classList.remove("show"));
}

function updateUIOnLogin(username) {
  if (loginBtn) loginBtn.parentElement.style.display = "none";
  if (signupBtn) signupBtn.parentElement.style.display = "none";
  if (newsSection) newsSection.style.display = "block";
  if (userProfile) userProfile.style.display = "block";
  if (usernameDisplay) usernameDisplay.innerText = username;
}

// Đăng ký
document
  .getElementById("signup-form")
  ?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const inputs = e.target.querySelectorAll("input");
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const [fullname, email, password, confirmPassword] = Array.from(inputs).map(
      (i) => i.value,
    );

    if (password !== confirmPassword)
      return alert("Mật khẩu xác nhận không khớp!");

    try {
      submitBtn.disabled = true;
      const response = await fetch(`${API_BASE_URL}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullname, email, password }),
      });
      const data = await response.json();
      if (response.ok) {
        alert("Đăng ký thành công!");
        openAuthModal("login-form");
      } else {
        alert(data.message);
      }
    } catch (err) {
      alert("Lỗi kết nối Server!");
    } finally {
      submitBtn.disabled = false;
    }
  });

// Đăng nhập
document.getElementById("login-form")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const inputs = e.target.querySelectorAll("input");
  const submitBtn = e.target.querySelector('button[type="submit"]');
  const [email, password] = [inputs[0].value, inputs[1].value];

  try {
    submitBtn.disabled = true;
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
    if (response.ok) {
      localStorage.setItem("token", data.token);
      localStorage.setItem("username", data.user.fullname);
      localStorage.setItem("userEmail", data.user.email);
      authModal.classList.remove("show");
      updateUIOnLogin(data.user.fullname);
    } else {
      alert(data.message);
    }
  } catch (err) {
    alert("Lỗi kết nối Server!");
  } finally {
    submitBtn.disabled = false;
  }
});

window.addEventListener("DOMContentLoaded", () => {
  const savedUser = localStorage.getItem("username");
  if (savedUser) updateUIOnLogin(savedUser);
});

/* =========================================
   3. CHAT WIDGET LOGIC
   ========================================= */
const chatBubble = document.getElementById("chat-bubble");
const chatWindow = document.getElementById("chat-window");
const chatClose = document.getElementById("chat-close");
const chatInput = document.getElementById("chat-input");
const chatSend = document.getElementById("chat-send");
const chatBody = document.getElementById("chat-body");
const typingIndicator = document.getElementById("typing-indicator");

const imageModal = document.getElementById("image-modal");
const imageModalImg = document.getElementById("image-modal-img");
const imageModalClose = document.getElementById("image-modal-close");

let chatHistory = [];
let isBookingProcessing = false;

function openImageZoom(src) {
  if (imageModal && imageModalImg) {
    imageModalImg.src = src;
    imageModal.classList.add("show");
  }
}

if (imageModalClose) {
  imageModalClose.addEventListener("click", () =>
    imageModal.classList.remove("show"),
  );
}

chatBubble?.addEventListener("click", (e) => {
  e.stopPropagation();
  chatWindow.classList.toggle("show");
  const notification = document.getElementById("chat-notification");
  if (notification) notification.style.display = "none";
  if (chatWindow.classList.contains("show")) {
    chatInput.focus();
    chatBody.scrollTop = chatBody.scrollHeight;
  }
});

chatClose?.addEventListener("click", () => chatWindow.classList.remove("show"));

async function sendMessage() {
  const text = chatInput.value.trim();
  if (text.length === 0) {
    chatInput.value = "";
    return;
  }

  const msg = document.createElement("div");
  msg.className = "message user-message";
  msg.textContent = text;
  chatBody.insertBefore(msg, typingIndicator);

  chatInput.value = "";
  chatInput.style.height = "auto";
  chatBody.scrollTop = chatBody.scrollHeight;

  typingIndicator.style.display = "flex";
  chatBody.scrollTop = chatBody.scrollHeight;

  try {
    const response = await fetch(
      "https://dalattripweb-326170003754.asia-southeast1.run.app/api/chat",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history: chatHistory }),
      },
    );

    const data = await response.json();
    typingIndicator.style.display = "none";

    let botReply = data.reply || "Xin lỗi, tôi gặp trục trặc.";

    // --- XỬ LÝ LỌC DỮ LIỆU BOOKING ẨN ---
    let bookingData = null;
    const dataMatch = botReply.match(/\[BOOKING_DATA:\s*({.*?})\]/);
    if (dataMatch) {
      try {
        bookingData = JSON.parse(dataMatch[1]);
        botReply = botReply.replace(dataMatch[0], "").trim();
      } catch (e) {
        console.error("Lỗi phân tích dữ liệu đặt phòng");
      }
    }

    const botMsg = document.createElement("div");
    botMsg.className = "message bot-message";

    const imageMatch = botReply.match(/\[IMAGE:\s*(.*?)\]/);
    if (imageMatch) {
      const imageUrl = imageMatch[1];
      const imgEle = document.createElement("img");
      imgEle.src = imageUrl;
      imgEle.className = "message-image";
      imgEle.alt = "Miranda Room";
      imgEle.onclick = () => openImageZoom(imageUrl);
      botMsg.appendChild(imgEle);
    } else {
      botMsg.textContent = botReply;
    }

    chatBody.insertBefore(botMsg, typingIndicator);

    // --- PHẦN LƯU BOOKING TỰ ĐỘNG ---
    if (bookingData && !isBookingProcessing) {
      isBookingProcessing = true;
      const currentUserEmail = localStorage.getItem("userEmail");

      if (!currentUserEmail) {
        console.warn("Chưa đăng nhập, không thể lưu lịch sử!");
        isBookingProcessing = false;
        bookingData = null; // Reset
      } else {
        fetch(
          "https://dalattripweb-326170003754.asia-southeast1.run.app/api/save-booking",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userEmail: currentUserEmail,
              email: bookingData.email || "Chưa cung cấp",
              phone: bookingData.phone || "Chưa cung cấp",
              roomName: bookingData.details || "Phòng đặt qua DALAT TRIP AI",
            }),
          },
        )
          .then(() => {
            console.log("Đã lưu lịch sử thành công!");
            bookingData = null; // RESET SAU KHI LƯU THÀNH CÔNG
          })
          .catch((err) => console.error("Lỗi lưu booking:", err))
          .finally(() => {
            isBookingProcessing = false;
            bookingData = null; // ĐẢM BẢO LUÔN RESET
          });
      }
    } else {
      bookingData = null; // ĐẢM BẢO LUÔN RESET NẾU KHÔNG CÓ DATA
    }

    // ĐẨY VÀO LỊCH SỬ DẠNG SẠCH
    chatHistory.push({ role: "user", parts: [{ text: text }] });
    chatHistory.push({ role: "model", parts: [{ text: botReply }] });
    chatBody.scrollTop = chatBody.scrollHeight;
  } catch (error) {
    typingIndicator.style.display = "none";
    console.error("Lỗi:", error);
    const errorMsg = document.createElement("div");
    errorMsg.className = "message bot-message";
    errorMsg.textContent = "Không thể kết nối với máy chủ!";
    chatBody.insertBefore(errorMsg, typingIndicator);
    chatBody.scrollTop = chatBody.scrollHeight;
  }
}

chatSend?.addEventListener("click", (e) => {
  e.preventDefault();
  sendMessage();
});

chatInput?.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

chatInput?.addEventListener("input", function () {
  this.style.height = "auto";
  this.style.height = this.scrollHeight + "px";
});

/* =========================================
   4. CLICK OUTSIDE & SCROLL REVEAL
   ========================================= */
window.addEventListener("click", (e) => {
  if (userDropdownContent) userDropdownContent.classList.remove("show");
  if (e.target === authModal) authModal.classList.remove("show");
  if (e.target === imageModal) imageModal.classList.remove("show");

  if (
    window.innerWidth > 768 &&
    chatWindow &&
    !chatWindow.contains(e.target) &&
    e.target !== chatBubble
  ) {
    chatWindow.classList.remove("show");
  }
});

authTabBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    const target = btn.dataset.target;
    authTabBtns.forEach((b) => b.classList.remove("active"));
    authForms.forEach((f) => f.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(target).classList.add("active");
  });
});

if (userDropdownBtn) {
  userDropdownBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    userDropdownContent.classList.toggle("show");
  });
}

if (logoutBtn) {
  logoutBtn.addEventListener("click", (e) => {
    e.preventDefault();
    localStorage.clear();
    location.reload();
  });
}

const scrollRevealOption = {
  distance: "50px",
  origin: "bottom",
  duration: 1000,
};
ScrollReveal().reveal(".header__container p", { ...scrollRevealOption });
ScrollReveal().reveal(".header__container h1", {
  ...scrollRevealOption,
  delay: 500,
});
