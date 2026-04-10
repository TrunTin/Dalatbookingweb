# Bước 1: Sử dụng Node.js bản chính thức (phiên bản 18 hoặc 20 đều tốt)
FROM node:20-slim

# Bước 2: Tạo thư mục làm việc bên trong container
WORKDIR /usr/src/app

# Bước 3: Copy các file quản lý thư viện vào trước
# Việc copy riêng package.json giúp tận dụng cache của Docker, build sẽ nhanh hơn ở các lần sau
COPY package*.json ./

# Bước 4: Cài đặt các thư viện (dependencies)
# Dùng --production để bỏ qua các thư viện phục vụ code (devDependencies) giúp container nhẹ hơn
RUN npm install --production

# Bước 5: Copy toàn bộ mã nguồn vào container
# Docker sẽ tự động bỏ qua node_modules và .env nếu bạn đã có file .dockerignore hoặc .gitignore
COPY . .

# Bước 6: Thông báo cổng mà container sẽ lắng nghe (Cloud Run thường dùng 8080)
EXPOSE 8080

# Bước 7: Lệnh để khởi chạy ứng dụng
# Đảm bảo file chính của bạn là app.js, nếu là server.js thì hãy đổi lại
CMD [ "node", "server/app.js" ]