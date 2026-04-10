const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");
require("dotenv").config(); // 1. Sử dụng biến môi trường

const app = express();

// 2. Giới hạn dung lượng body để tránh tấn công DOS
app.use(express.json({ limit: "10kb" }));
app.use(cors());

// Kết nối MongoDB qua biến môi trường
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.error("Lỗi kết nối DB:", err));

const UserSchema = new mongoose.Schema({
  fullname: { type: String, required: true, trim: true },
  email: {
    type: String,
    unique: true,
    required: true,
    lowercase: true, // Tự động chuyển về chữ thường để tránh trùng lặp Admin@ và admin@
    trim: true,
  },
  password: { type: String, required: true, minlength: 6 }, // 3. Kiểm tra độ dài tối thiểu
});
const User = mongoose.model("User", UserSchema);

// ==========================================
// 2. SCHEMA CHO ĐỊA ĐIỂM & PHÒNG (Dành cho AI Chatbot)
// ==========================================
const LocationSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true }, // Tên Homestay/Khách sạn
  address: { type: String, required: true }, // Địa chỉ chi tiết
  pricePerNight: { type: Number, required: true }, // Giá (Số để AI so sánh đắt/rẻ)
  totalRooms: { type: Number, required: true }, // Tổng số phòng ban đầu
  availableRooms: { type: Number, required: true }, // Số phòng còn trống (AI sẽ tự trừ khi có khách đặt)
  distanceInfo: { type: String }, // Khoảng cách tới các điểm check-in khác
  description: { type: String }, // Mô tả ngắn gọn về tiện ích
  tags: [String], // Từ khóa tìm kiếm: ["view đồi", "giá rẻ", "gần trung tâm"]
  imageUrl: { type: String, required: true }, // URL ảnh đại diện của địa điểm
});

const Location = mongoose.model("Location", LocationSchema);

// API Đăng ký
app.post("/api/register", async (req, res) => {
  try {
    const { fullname, email, password } = req.body;

    // 4. Kiểm tra dữ liệu sơ bộ
    if (!fullname || !email || !password) {
      return res
        .status(400)
        .json({ message: "Vui lòng điền đầy đủ thông tin!" });
    }

    const hashedPassword = await bcrypt.hash(password, 12); // Độ phức tạp 12 sẽ an toàn hơn 10
    const newUser = new User({ fullname, email, password: hashedPassword });
    await newUser.save();

    res.status(201).json({ message: "Đăng ký thành công!" });
  } catch (error) {
    res
      .status(400)
      .json({ message: "Email đã tồn tại hoặc dữ liệu không hợp lệ!" });
  }
});

// API Đăng nhập
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Tìm user và chỉ lấy những trường cần thiết
    const user = await User.findOne({ email });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: "Sai email hoặc mật khẩu!" });
    }

    // 5. Sử dụng Secret Key từ file .env
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    res.json({
      token,
      user: { id: user._id, fullname: user.fullname, email: user.email },
    });
  } catch (err) {
    res.status(500).json({ message: "Lỗi hệ thống!" });
  }
});

// --- API cho Địa điểm (DÁN ĐOẠN NÀY VÀO ĐÂY) ---
app.get("/api/locations", async (req, res) => {
  try {
    const locations = await Location.find();
    res.json(locations);
  } catch (error) {
    res.status(500).json({ message: "Lỗi hệ thống!" });
  }
});

// 2. API để AI trừ số lượng phòng (Đưa nó lên trên app.listen)
app.patch("/api/locations/:id/book", async (req, res) => {
  try {
    const location = await Location.findById(req.params.id);

    if (!location) {
      return res.status(404).json({ message: "Không tìm thấy địa điểm!" });
    }

    if (location.availableRooms > 0) {
      location.availableRooms -= 1; // Trừ đi 1 phòng
      await location.save();
      res.json({
        message: "Đặt phòng thành công!",
        remaining: location.availableRooms,
      });
    } else {
      res.status(400).json({ message: "Đã hết phòng tại địa điểm này!" });
    }
  } catch (error) {
    res.status(500).json({ message: "Lỗi hệ thống khi đặt phòng!" });
  }
});

// ==========================================
// CẤU HÌNH GEMINI AI CHUYÊN NGHIỆP (System Instruction)
// ==========================================
const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({
  model: "gemini-3.1-flash-lite-preview",
  systemInstruction: `VAI TRÒ:
Bạn là Miranda Assistant - Nhân viên tư vấn ảo của Hotel Miranda (Chuyên dịch vụ Homestay/Khách sạn tại Đà Lạt).
QUY TẮC PHẢN HỒI (STRICT):
1. TRẢ LỜI ĐÚNG TRỌNG TÂM: Khách hỏi gì trả lời đó. 
   - Nếu hỏi giá: Chỉ trả lời tên phòng và giá.
   - Nếu hỏi ảnh: Chỉ gửi định dạng [IMAGE: URL] (Không kèm văn bản).
   - Chỉ đưa mô tả chi tiết hoặc xin thông tin liên hệ khi khách có ý định đặt phòng hoặc hỏi chi tiết.
   - Khi khách hàng đã cung cấp SĐT và Email và đồng ý đặt phòng, bạn PHẢI tổng kết thông tin và kèm theo một dòng ẩn định dạng như sau ở cuối phản hồi:
[BOOKING_DATA: {"phone": "SĐT_KHÁCH", "email": "EMAIL_KHÁCH", "room": "TÊN_PHÒNG", "details": "Tên phòng - X ngày Y đêm}].
   - Chỉ được xuất gói [BOOKING_DATA: ...] MỘT LẦN DUY NHẤT khi khách vừa cung cấp đủ thông tin và xác nhận đặt.
   - Nếu khách chỉ nhắn "Ok", "Cảm ơn" ở câu sau, TUYỆT ĐỐI không xuất lại gói [BOOKING_DATA] nữa để tránh lưu trùng.
2. PHONG CÁCH: Thân thiện, ngắn gọn, dùng gạch đầu dòng (-). Trả lời đầy đủ câu, tuyệt đối không cắt lửng lơ.
3. PHẠM VI: Chỉ trả lời về phòng ốc/du lịch Đà Lạt. Từ chối các chủ đề khác.
4. HỦY PHÒNG: Hướng dẫn gọi 1800-2026.

QUY TẮC GỬI ẢNH:
- Khách yêu cầu xem ảnh phòng nào, chỉ gửi đúng ảnh phòng đó.
- ĐỊNH DẠNG: [IMAGE: URL_HINH_ANH] (Không được có thêm chữ bên ngoài).
- Nếu không có ảnh cho phòng đó, hãy đáp: "Dạ, hiện tại phòng [Tên phòng] chưa có ảnh trên hệ thống ạ."

QUY TRÌNH CHỐT PHÒNG:
- Chỉ xin Số điện thoại và Email và số ngày đêm khi khách đã chọn được phòng và xác nhận muốn đặt (Ví dụ: "Tôi muốn đặt phòng này", "Chốt cho tôi").
- Không xin thông tin liên hệ lặp đi lặp lại ở mọi câu chat.
- Sau khi có thông tin, tổng kết: Tên phòng | Giá | Địa chỉ | SĐT | Email.`,
});

// --- API CHATBOT (CÓ LỊCH SỬ & DỮ LIỆU THỰC TẾ) ---
app.post("/api/chat", async (req, res) => {
  try {
    const { message, history } = req.body;

    // Kiểm tra đầu vào rỗng hoặc chỉ có dấu cách
    if (!message || message.trim().length === 0) {
      return res
        .status(400)
        .json({ reply: "Bạn cần hỗ trợ gì về phòng ốc tại Miranda không ạ?" });
    }

    // 1. Lấy dữ liệu mới nhất từ MongoDB
    const locations = await Location.find();
    const dataContext = locations
      .map(
        (loc) =>
          `- Tên: ${loc.name}
        Giá: ${loc.pricePerNight}đ/đêm
        Phòng trống: ${loc.availableRooms}
        Địa chỉ: ${loc.address}
        Mô tả: ${loc.description || "Đang cập nhật"}
        Link_Ảnh: ${loc.imageUrl || "None"}`,
      )
      .join("\n---\n");
    // 2. Khởi tạo phiên chat có lịch sử (Memory)
    const chat = model.startChat({
      history: history || [],
      generationConfig: {
        temperature: 0.4, // Giữ AI trả lời thực tế, không bịa đặt
        maxOutputTokens: 1024,
      },
    });

    // 3. Nhúng dữ liệu Database vào tin nhắn gửi đi
    const fullMessage = `DỮ LIỆU PHÒNG THỜI GIAN THỰC:\n${dataContext}\n\nCÂU HỎI KHÁCH HÀNG: ${message}`;

    const result = await chat.sendMessage(fullMessage);
    const response = await result.response;

    res.json({ reply: response.text() });
  } catch (error) {
    console.error("AI Error:", error);
    res.status(500).json({
      reply: "Dạ, hệ thống gặp chút trục trặc, Anh/Chị thử lại sau ạ!",
    });
  }
});

// 1. Tạo Schema Đặt phòng
const BookingSchema = new mongoose.Schema({
  userEmail: String, // Email người đang đăng nhập
  email: String, // Email để liên hệ
  phone: String,
  roomName: String,
  status: { type: String, default: "Đang duyệt" },
});
const Booking = mongoose.model("Booking", BookingSchema);

// 2. API Lưu đặt phòng (Gọi khi Bot xác nhận xong)
app.post("/api/save-booking", async (req, res) => {
  try {
    const newBooking = new Booking(req.body);
    await newBooking.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).send(err);
  }
});

// 3. API Lấy lịch sử
app.get("/api/booking-history", async (req, res) => {
  try {
    const { email } = req.query;
    if (!email)
      return res.status(400).json({ message: "Thiếu email người dùng" });

    const bookings = await Booking.find({ userEmail: email });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: "Lỗi khi lấy lịch sử" });
  }
});

// 4. API Cập nhật
app.post("/api/update-booking", async (req, res) => {
  const { id, email, phone } = req.body;
  await Booking.findByIdAndUpdate(id, { email, phone });
  res.json({ success: true });
});

// API Xóa đặt phòng (Chỉ cho phép khi đang ở trạng thái Đang duyệt)
app.delete("/api/delete-booking/:id", async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: "Không tìm thấy đơn đặt phòng!" });
    }

    if (booking.status !== "Đang duyệt") {
      return res
        .status(400)
        .json({ message: "Chỉ có thể xóa đơn ở trạng thái Đang duyệt!" });
    }

    await Booking.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Đã xóa đơn đặt phòng thành công!" });
  } catch (err) {
    res.status(500).json({ message: "Lỗi hệ thống khi xóa!" });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server đang chạy trên cổng ${PORT}`);
});
