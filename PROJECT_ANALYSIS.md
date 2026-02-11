# Phân Tích Chi Tiết Dự Án Scipho-T3

Tài liệu này giải thích chi tiết cấu trúc, công nghệ và luồng hoạt động của dự án `scipho-t3` để phục vụ mục đích học tập và phát triển.

## 1. Tổng Quan Dự Án

**Scipho** là một ứng dụng Web3 tích hợp AI (Trí tuệ nhân tạo).
- **Chức năng chính:** Người dùng chat với AI (như ChatGPT).
- **Điểm đặc biệt:** Hệ thống thanh toán và đăng ký thành viên (Subscription) được quản lý trên Blockchain. Người dùng trả tiền bằng Crypto (Stablecoin) để mua gói Pro/Premium.
- **Mô hình:** Hybrid (Kết hợp Web2 và Web3).
    - **Web2:** Lưu trữ lịch sử chat, thông tin người dùng cơ bản bằng Database truyền thống (PostgreSQL).
    - **Web3:** Xử lý thanh toán và xác thực quyền lợi thành viên bằng Smart Contract.

---

## 2. Công Nghệ Sử Dụng (Tech Stack)

Dự án sử dụng **T3 Stack** mở rộng:

-   **Frontend & Framework:** [Next.js](https://nextjs.org/) (App Router) - Framework React mạnh mẽ nhất hiện nay.
-   **Ngôn ngữ:** [TypeScript](https://www.typescriptlang.org/) - Giúp code an toàn, tránh lỗi vặt.
-   **Database ORM:** [Prisma](https://www.prisma.io/) - Công cụ làm việc với Database dễ dàng.
-   **API:** [tRPC](https://trpc.io/) - Giải pháp API an toàn kiểu dữ liệu (End-to-end type safety) giữa Frontend và Backend.
-   **Giao diện (UI):** [Tailwind CSS](https://tailwindcss.com/) + [Shadcn UI](https://ui.shadcn.com/).
-   **Blockchain:**
    -   **Solidity:** Viết Smart Contract.
    -   **Viem/Wagmi:** Thư viện giúp Web kết nối với Blockchain.
-   **Auth (Đăng nhập):** [Privy](https://www.privy.io/) - Giải pháp đăng nhập Web3 tiện lợi (Login bằng Email, Google, Ví).
-   **AI & Background Jobs:**
    -   **Inngest:** Quản lý các tác vụ chạy nền (ví dụ: khi user gửi tin nhắn, Inngest sẽ lo việc gọi AI trả lời để user không phải đợi lâu).
    -   **Mastra:** Framework AI Agent.

---

## 3. Phân Tích Cấu Trúc Thư Mục & File Quan Trọng

### 3.1. Cấu hình (`Root Directory`)

*   **`package.json`**: Danh sách các thư viện đã cài đặt. Xem mục `dependencies` để biết dự án dùng gì.
*   **`.env` / `src/env.js`**:
    *   `DATABASE_URL`: Đường dẫn kết nối tới Database.
    *   `PRIVY_APP_SECRET`, `NEXT_PUBLIC_PRIVY_APP_ID`: Khóa bí mật để dùng dịch vụ đăng nhập Privy.
    *   `OPENAI_API_KEY`, `GEMINI_API_KEY`: Khóa API của các mô hình AI.
    *   `ADMIN_PRIVATE_KEY`: Khóa ví của Admin (để deploy contract hoặc thực hiện các tác vụ quản trị).

### 3.2. Blockchain (`src/contracts`)

Đây là "trái tim" tài chính của ứng dụng.

*   **`subcription_manager.sol` (Quan trọng nhất):**
    *   Đây là Smart Contract quản lý việc mua gói.
    *   **Struct `UserSubscription`**: Lưu thông tin gói của user (Tier), ngày hết hạn (`subscriptionEndTime`), và số lượt dùng mỗi ngày (`dailyCredits`).
    *   **Hàm `subscribePro()` / `subscribePremium()`**: User gọi hàm này và gửi tiền (Stablecoin) để mua gói. Contract sẽ ghi nhận và cấp quyền.
    *   **Hàm `getMySubscriptionStatus()`**: Cho phép website hỏi Contract xem "Ông này đang dùng gói gì?".
*   **`susdc.sol`**: Một contract giả lập tiền Stablecoin (ví dụ USDC) để thử nghiệm chức năng thanh toán.

### 3.3. Database (`prisma/schema.prisma`)

File này định nghĩa cấu trúc dữ liệu lưu trong PostgreSQL.

*   **Model `User`**:
    *   `plan`: Lưu gói hiện tại (FREE, PRO, PREMIUM).
    *   `credits`: Số lượt chat còn lại.
    *   `subscriptionExpiresAt`: Ngày hết hạn gói.
    *   **Logic:** Dữ liệu này được đồng bộ từ Blockchain về.
*   **Model `Thread`**: Đại diện cho một cuộc hội thoại.
*   **Model `Message`**: Các tin nhắn trong hội thoại.
*   **Model `Fragment`**: Các phần tử nhỏ trong tin nhắn (có thể là code, kết quả chạy code...).

### 3.4. Backend API (`src/server/api/routers`)

Sử dụng tRPC để tạo API. Frontend gọi các hàm này như gọi hàm bình thường.

*   **`user.ts` (Router User):**
    *   **`syncContractStatus`**: Hàm cực quan trọng. Frontend gọi hàm này sau khi thanh toán xong. Hàm này sẽ:
        1.  Kết nối với Blockchain (dùng `viem`).
        2.  Đọc dữ liệu từ Smart Contract (`getMySubscriptionStatus`).
        3.  Cập nhật vào Database (`db.user.update`).
    *   **`subscribeToPlan`**: Xử lý logic nâng cấp gói. Nếu gói FREE thì update luôn, nếu gói trả phí thì kiểm tra giao dịch Blockchain (`verify transaction hash`) rồi mới update.
*   **`thread.ts` (Router Thread):**
    *   **`createThread`**: Tạo cuộc hội thoại mới. Kiểm tra xem user còn `credits` không. Nếu còn thì trừ credit và gửi sự kiện cho Inngest chạy AI.
*   **`message.ts` (Router Message):**
    *   **`sendMessage`**: Gửi tin nhắn. Cũng kiểm tra credits, lưu tin nhắn vào DB, và kích hoạt AI agent.

### 3.5. Frontend (`src/app`)

Sử dụng Next.js App Router.

*   **`_providers/privy-provider.tsx`**: Cấu hình Privy để quản lý đăng nhập và ví Web3 cho toàn bộ ứng dụng.
*   **`(home)/page.tsx`**: Trang chủ.
*   **`layout.tsx`**: Khung sườn chung của toàn bộ web (Header, Footer, Providers...).

---

## 4. Luồng Hoạt Động Điển Hình (Workflow)

### Luồng 1: Mua gói thành viên (Subscription Flow)

1.  **Người dùng (Frontend):** Chọn gói "Premium" và bấm "Thanh toán".
2.  **Ví (Wallet):** Privy hoặc MetaMask hiện lên yêu cầu xác nhận giao dịch chuyển tiền.
3.  **Blockchain:** Tiền được chuyển vào `SciphoSubscriptionManager`. Contract ghi nhận địa chỉ ví này đã mua Premium.
4.  **Frontend:** Sau khi giao dịch thành công trên Blockchain, Frontend gọi API `user.subscribeToPlan`.
5.  **Backend (`user.ts`):**
    *   Kiểm tra giao dịch đó có thật không.
    *   Nếu thật, gọi Smart Contract để lấy thông tin hạn dùng.
    *   Cập nhật Database: `plan = PREMIUM`, `dailyCredits = 60`.
6.  **Kết quả:** User thấy giao diện chuyển sang trạng thái Premium.

### Luồng 2: Chat với AI (Chat Flow)

1.  **Người dùng:** Nhập "Hãy viết cho tôi một bài thơ".
2.  **Frontend:** Gọi API `message.sendMessage`.
3.  **Backend (`message.ts`):**
    *   Kiểm tra `user.credits` > 0 ?
    *   Nếu OK: Trừ credits, lưu tin nhắn vào DB.
    *   Gửi tín hiệu `agent/call` tới Inngest.
4.  **Background Job (Inngest):** Nhận tín hiệu, gọi mô hình AI (Gemini/OpenAI) để xử lý.
5.  **Kết quả:** AI trả lời, lưu câu trả lời vào DB, và Frontend hiển thị ra cho user.

---

## 5. Hướng Dẫn Cho Dev Mới

1.  **Chạy dự án:**
    *   `npm install` (cài thư viện)
    *   `npm run dev` (chạy web local)
    *   `npx prisma studio` (mở giao diện xem DB)
2.  **Sửa Smart Contract:**
    *   Sửa file trong `src/contracts`.
    *   Sẽ cần deploy lại lên mạng testnet (không đơn giản chỉ là lưu file).
3.  **Sửa Logic Chat:**
    *   Vào `src/server/api/routers/message.ts` hoặc logic Inngest (trong `src/inngest` - cần check thêm folder này).

---
*Tài liệu được tạo tự động bởi Antigravity Agent để hỗ trợ nhóm phát triển.*
