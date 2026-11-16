# TÀI LIỆU ĐẶC TẢ ĐỀ TÀI 

* **Tên đề tài tiếng Việt:** Xây dựng Ứng dụng Hỗ trợ Du lịch Thông minh Thích ứng Ngữ cảnh: Tích hợp Dữ liệu Thời tiết Thời gian thực, Truy vấn Không gian và Trí tuệ Nhân tạo

* **Tên đề tài tiếng Anh:** *Smart Travel Companion: Context-Aware & Weather-Adaptive Travel Recommendation Platform*

* **Chuyên ngành:** Kỹ thuật Phần mềm (Software Engineering)

* **Loại hình đề tài:** Đồ án Tốt nghiệp Đại học / Ứng dụng Thực tiễn (Applied Software Engineering)

## 1. TỔNG QUAN VÀ ĐẶT VẤN ĐỀ (PROBLEM STATEMENT)

### 1.1. Bối cảnh thực tế

Du lịch tự túc (solo travel, du lịch nhóm bạn/gia đình nhỏ) đang là xu thế áp đảo trong xã hội hiện đại. Tuy nhiên, hành trình từ lúc lập kế hoạch đến khi trải nghiệm thực tế tại điểm đến bộc lộ nhiều điểm nghẽn nghiêm trọng:

* **Phân mảnh công cụ (Tool Fragmentation):** Du khách phải sử dụng đồng thời 4–5 nền tảng: mạng xã hội để lướt tìm điểm check-in, Google Maps để đo cự ly tìm quán ăn, app thời tiết xem mưa nắng, sàn OTA (Agoda/Booking) để tìm phòng, và Notion/Sheets để ghi chép ghép nối.

* **Lịch trình tĩnh và sự bị động trước biến đổi thời tiết (Static Schedule vs. Dynamic Weather):** Các ứng dụng hiện nay chỉ tạo ra lịch trình cố định. Khi đến điểm du lịch gặp trời mưa dông, nắng gắt cực đoan hoặc sương mù dày đặc, toàn bộ hoạt động ngoài trời (Outdoor) bị đổ vỡ, người dùng rơi vào thế lúng túng tìm điểm thay thế.

* **Lựa chọn chỗ ở thiếu tối ưu với lộ trình (Stay-Trip Disconnect):** Khách thường đặt phòng theo giá rẻ hoặc ảnh đẹp trên sàn OTA mà không đối chiếu với cụm điểm sẽ đi chơi, dẫn đến việc phòng ở cách xa 10–15km, gây tốn kém thời gian và chi phí di chuyển.

* **Gợi ý ẩm thực "mù ngữ cảnh" (Context-Blind Food Discovery):** Đề xuất quán ăn theo lượt review hoặc tài trợ quảng cáo, không gắn với thời tiết (ví dụ: giữa trưa nắng 38°C gợi ý quán lẩu vỉa hè; ngày mưa lạnh lại gợi ý quán giải khát ven sông).

### 1.2. Mục tiêu của Đề tài

Xây dựng một nền tảng hỗ trợ du lịch hợp nhất (One-Stop Context-Aware Platform), chuyển đổi từ mô hình lập kế hoạch cố định sang **"Lịch trình thích ứng theo ngữ cảnh thực tế (Living & Adaptive Itinerary)"**:

1. Hợp nhất dữ liệu điểm đến, ẩm thực bản địa, phòng lưu trú và dữ liệu thời tiết từng giờ.

2. Ứng dụng dữ liệu không gian (PostGIS) để tìm phòng ở tại **"Tâm chuyến đi" (Centroid)** và quét radar lân cận.

3. Ứng dụng AI phối hợp dự báo thời tiết để tự động kích hoạt **"Kế hoạch B" (Dynamic Plan B Fallback)**: tự động phát hiện xung đột thời tiết và hoán đổi sang hoạt động trong nhà (*Indoor*) gần nhất chỉ với một thao tác.

## 2. KIẾN TRÚC HỆ THỐNG VÀ CÔNG NGHỆ (TECHNICAL ARCHITECTURE)

### 2.1. Ngăn xếp Công nghệ (Tech Stack)

* **Frontend:**

  * Framework: React.js (TypeScript) hoặc Next.js, kết hợp Vite và Tailwind CSS.

  * Bản đồ tương tác: Leaflet.js / Mapbox GL JS (OpenStreetMap base tiles).

  * Quản lý State & Data Fetching: Zustand / TanStack Query (React Query).

  * Thư viện kéo thả: `@hello-pangea/dnd` hoặc `dnd-kit` cho giao diện Timeline.

* **Backend:**

  * Framework: Node.js (NestJS / Express.js) hoặc Java (Spring Boot 3).

  * Kiến trúc mã nguồn: Clean Architecture / Modular Monolith, chuẩn RESTful API.

  * Tác vụ định kỳ (Cron Job): Đồng bộ thời tiết định kỳ theo giờ.

* **Cơ sở dữ liệu & Lưu trữ (Database & Caching):**

  * **PostgreSQL + PostGIS Extension:** Lưu trữ dữ liệu quan hệ và dữ liệu không gian (`GEOMETRY(Point, 4326)`).

  * **Chỉ mục không gian:** `GIST index` trên các trường tọa độ để tối ưu hóa truy vấn bán kính `ST_DWithin` dưới 10ms.

  * **Redis Cache:** Cache kết quả API thời tiết với TTL = 30 phút; lưu session người dùng.

* **Tích hợp Ngoại vi & AI:**

  * **Weather API:** Open-Meteo API (Miễn phí, không cần API Key, hỗ trợ dữ liệu theo giờ và xác suất mưa).

  * **AI Integration:** LLM API (Gemini / OpenAI API) triển khai theo cơ chế **Function Calling / Tool Use** để truy vấn CSDL nội bộ, loại bỏ hoàn toàn hiện tượng ảo giác (hallucination).

### 2.2. Sơ đồ Kiến trúc Hệ thống

```
┌────────────────────────────────────────────────────────────────────────┐
│                        TẦNG TRÌNH DIỄN (FRONTEND)                      │
│        - Bản đồ số tương tác (Leaflet / Mapbox)                        │
│        - Giao diện Timeline lịch trình kéo thả                         │
│        - Dashboard Radar tìm kiếm theo bán kính                        │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP / RESTful API
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                         TẦNG DỊCH VỤ (BACKEND)                         │
│                                                                        │
│   ┌─────────────────────┐ ┌────────────────────┐ ┌─────────────────┐   │
│   │   Trip Management   │ │  Spatial Discovery │ │ Weather Poller  │   │
│   │      (Service)      │ │   (PostGIS Engine) │ │ (Cron Job sync) │   │
│   └──────────┬──────────┘ └─────────┬──────────┘ └────────┬────────┘   │
│              └──────────────────────┼─────────────────────┘            │
│                                     ▼                                  │
│                 ┌───────────────────────────────────────┐              │
│                 │       AI Adaptive Controller          │              │
│                 │   (Tool Calling + Fallback Agent)     │              │
│                 └───────────────────┬───────────────────┘              │
└─────────────────────────────────────┼──────────────────────────────────┘
                                      │
              ┌───────────────────────┴───────────────────────┐
              ▼                                               ▼
┌────────────────────────────────────────┐ ┌─────────────────────────────┐
│          PostgreSQL + PostGIS          │ │         Redis Cache         │
│  - Bảng Places, Stays, Itineraries     │ │ - Cache dữ liệu thời tiết   │
│  - Spatial Index (GIST)                │ │ - Session & Rate Limit      │
└────────────────────────────────────────┘ └─────────────────────────────┘

```

## 3. PHẠM VI CHỨC NĂNG CỐT LÕI (MVP - MINIMUM VIABLE PRODUCT)

Hệ thống tập trung triển khai 4 phân hệ cốt lõi:

### 3.1. Phân hệ Khám phá & Bản đồ Không gian (Discovery & Spatial Radar)

* **Hiển thị trực quan đa lớp:** Điểm tham quan, Quán ăn/Cà phê, Cơ sở lưu trú được đánh dấu bằng các marker phân biệt trên bản đồ.

* **Bộ lọc thuộc tính chuyên sâu:**

  * Thuộc tính không gian: Hoạt động ngoài trời (*Outdoor*) hoặc Hoạt động trong nhà (*Indoor*).

  * Thuộc tính ẩm thực: Đồ nướng, lẩu, món cuốn, giải khát; Không gian điều hòa hoặc vỉa hè.

* **Radar lân cận (Proximity Radar):** Quét danh sách các điểm nổi bật trong bán kính tùy chọn ($1\text{km} - 5\text{km}$) xung quanh vị trí hiện tại hoặc điểm neo do người dùng chọn trên bản đồ.

### 3.2. Phân hệ Lập Lịch trình Tương tác (Interactive Timeline Planner)

* **Quản lý chuyến đi:** Tạo chuyến đi theo ngày bắt đầu và kết thúc (ví dụ: Chuyến đi Đà Lạt 3 ngày 2 đêm).

* **Dòng thời gian kéo - thả (Drag & Drop Timeline):**

  * Mỗi ngày được chia thành 4 khung giờ: Sáng (8h - 11h), Trưa (11h - 13h), Chiều (13h - 17h), Tối (17h - 22h).

  * Người dùng có thể kéo thả địa điểm vào các slot, sắp xếp lại thứ tự linh hoạt.

* **Cảnh báo lộ trình ngược đường:** Đo đạc khoảng cách giữa các điểm kế tiếp trong ngày để đưa ra khuyến cáo nếu lộ trình di chuyển quá xa nhau.

### 3.3. Phân hệ Đồng bộ Thời tiết & Kích hoạt Kế hoạch B (Adaptive Weather Fallback)

* **Đồng bộ thời tiết theo từng slot:** Tự động lấy dự báo thời tiết (Nhiệt độ, Biểu tượng nắng/mưa, Xác suất mưa `%`) hiển thị trực tiếp lên từng slot của lịch trình.

* **Phát hiện xung đột tự động:** Khi một hoạt động ngoài trời (`is_outdoor = true`) rơi vào slot có xác suất mưa $\ge 60\%$, hệ thống tự động gắn nhãn cảnh báo đỏ.

* **Kích hoạt Kế hoạch B (One-click Plan B Swap):**

  * Nhấn vào cảnh báo, AI kết hợp truy vấn CSDL để lọc ngay 2–3 địa điểm trong nhà (*Indoor*) gần nhất tính từ vị trí trước đó.

  * Người dùng chọn phương án thay thế, hệ thống tự động hoán đổi điểm trên Timeline và cập nhật CSDL mà không làm gián đoạn chuyến đi.

### 3.4. Phân hệ Gợi ý Lưu trú tại "Tâm Chuyến Đi" (Centroid Stay Finder)

* **Tính toán trọng tâm hình học:**
  

  $$
  \bar{x} = \frac{1}{n} \sum_{i=1}^n x_i, \quad \bar{y} = \frac{1}{n} \sum_{i=1}^n y_i
  $$

  
  Trong đó $(x_i, y_i)$ là tọa độ của các điểm tham quan/ăn uống mà người dùng đã chọn vào lịch trình.

* **Gợi ý chỗ ở tối ưu:** Hệ thống tự động truy vấn bảng `stays` để tìm các khách sạn/homestay gần tọa độ trọng tâm $(\bar{x}, \bar{y})$ nhất, giúp tối thiểu hóa tổng quãng đường di chuyển của cả kỳ nghỉ.

## 4. ỨNG DỤNG TRÍ TUỆ NHÂN TẠO (AI) TRONG ĐỀ TÀI

AI không chỉ đóng vai trò chatbot tư vấn mà tham gia trực tiếp vào việc ra quyết định của hệ thống:

```
┌────────────────────────────────────────────────────────────────────────┐
│                          LUỒNG XỬ LÝ CỦA AI                            │
├────────────────────────────────────────────────────────────────────────┤
│ 1. AI Constraint Satisfaction & Tool Calling:                          │
│    Prompt người dùng ➔ AI Intent Parsing ➔ Gọi PostGIS API nội bộ      │
│    ➔ Trả về lịch trình chứa tọa độ và dữ liệu thực 100%.               │
├────────────────────────────────────────────────────────────────────────┤
│ 2. Thuật toán Xếp hạng Ngữ cảnh Lai (Contextual Ranking):              │
│    Score = w1·Sở thích + w2·Thời tiết + w3·Khoảng cách + w4·Đánh giá   │
├────────────────────────────────────────────────────────────────────────┤
│ 3. Giám sát & Đề xuất Kế hoạch B Tự động:                             │
│    Sự kiện [Outdoor] + [Mưa > 60%] ➔ Tìm điểm Indoor bán kính < 3km    │
│    ➔ Gợi ý phương án hoán đổi tức thì.                                 │
└────────────────────────────────────────────────────────────────────────┘

```

1. **Tool Calling đảm bảo độ chính xác dữ liệu:** LLM được cấu hình để gọi các hàm API nội bộ (`get_places_by_radius`, `get_weather_forecast`). AI chỉ sắp xếp và gợi ý các địa điểm có thật trong CSDL, loại bỏ hoàn toàn vấn đề địa chỉ giả mạo.

2. **Cơ chế Kế hoạch B (Adaptive Agent):** Đóng vai trò là một agent giám sát lịch trình. Khi điều kiện khí tượng vi phạm ràng buộc an toàn/tiện nghi, agent chủ động tính toán giải pháp dự phòng ngắn nhất.

3. **Gợi ý ẩm thực theo thời tiết:** Mô hình ưu tiên các món ăn nóng hổi (lẩu, nướng) khi nhiệt độ thấp và ưu tiên không gian máy lạnh, món thanh nhiệt khi trời nắng nóng gay gắt.

## 5. THIẾT KẾ CƠ SỞ DỮ LIỆU CỐT LÕI (DATABASE SCHEMA)

```
-- Kích hoạt extension không gian địa lý
CREATE EXTENSION IF NOT EXISTS postgis;

-- 1. Bảng Danh mục địa điểm (Điểm tham quan, Ẩm thực, Cà phê)
CREATE TABLE places (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL, -- 'attraction', 'restaurant', 'cafe'
    subcategory VARCHAR(50),       -- 'hotpot', 'bbq', 'museum', 'nature'
    is_outdoor BOOLEAN NOT NULL DEFAULT true,
    suitable_weather VARCHAR(50)[], -- ARRAY['sunny', 'cloudy', 'rainy']
    price_level INT DEFAULT 2,     -- 1: rẻ, 2: vừa, 3: cao
    rating DECIMAL(2, 1) DEFAULT 4.0,
    address TEXT,
    location GEOMETRY(Point, 4326) NOT NULL, -- Tọa độ chuẩn WGS84
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tạo chỉ mục không gian GIST để tăng tốc độ truy vấn bán kính
CREATE INDEX idx_places_location ON places USING GIST (location);

-- 2. Bảng Cơ sở lưu trú (Khách sạn, Homestay, Resort)
CREATE TABLE stays (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    stay_type VARCHAR(50) NOT NULL, -- 'hotel', 'homestay', 'resort'
    price_per_night DECIMAL(12, 2) NOT NULL,
    rating DECIMAL(2, 1) DEFAULT 4.0,
    address TEXT,
    location GEOMETRY(Point, 4326) NOT NULL,
    amenities JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_stays_location ON stays USING GIST (location);

-- 3. Bảng Chuyến đi (Trip)
CREATE TABLE trips (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    destination_city VARCHAR(100) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    centroid_location GEOMETRY(Point, 4326),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Bảng Chi tiết lịch trình theo slot (Itinerary Items)
CREATE TABLE itinerary_items (
    id SERIAL PRIMARY KEY,
    trip_id INT REFERENCES trips(id) ON DELETE CASCADE,
    place_id INT REFERENCES places(id),
    stay_id INT REFERENCES stays(id),
    day_number INT NOT NULL,       -- Ngày 1, Ngày 2...
    time_slot VARCHAR(20) NOT NULL, -- 'morning', 'lunch', 'afternoon', 'dinner'
    order_index INT NOT NULL,
    weather_alert_flag BOOLEAN DEFAULT false,
    note TEXT
);

```

## 6. SO SÁNH VỚI CÁC ỨNG DỤNG HIỆN HÀNH TRÊN THỊ TRƯỜNG

| Tiêu chí | Ứng dụng truyền thống (Google Maps, Tripadvisor) | Chatbot AI độc lập (ChatGPT, Gemini) | **Hệ thống đề xuất của Đồ án** | 
| ----- | ----- | ----- | ----- | 
| **Dạng thức lịch trình** | Lịch trình tĩnh, người dùng tự chép tay sang ứng dụng khác. | Trả về văn bản đơn thuần, không có giao diện kéo thả hay bản đồ đi kèm. | **Lịch trình sống (Dynamic Timeline):** Giao diện kéo thả tương tác, gắn liền bản đồ số. | 
| **Độ tin cậy dữ liệu** | Dữ liệu thật nhưng dễ bị làm phiền bởi review ảo và quảng cáo. | Dễ gặp ảo giác (hallucination), bịa đặt địa chỉ và quán ăn không có thật. | **Dữ liệu thật 100%:** Ràng buộc qua Tool Calling, chỉ gợi ý các địa điểm có tọa độ trong CSDL PostGIS. | 
| **Tương tác thời tiết** | Hoàn toàn tách biệt; không tự động giám sát lịch trình. | Thụ động; không thể tự động cảnh báo xung đột mưa nắng theo giờ. | **Đồng bộ thời gian thực:** Ánh xạ thời tiết từng giờ lên Timeline, tự động phát hiện xung đột. | 
| **Phản ứng khi trời mưa** | Người dùng tự xoay xở tìm chỗ trú chân hoặc điểm thay thế. | Gợi ý lý thuyết chung chung, không nắm rõ khoảng cách thực tế. | **Kế hoạch B tự động:** Tự quét CSDL tìm điểm trong nhà gần nhất và tráo đổi với 1 click. | 
| **Gợi ý phòng lưu trú** | Tìm theo tên thành phố hoặc mức giá, dễ bị xa điểm tham quan. | Không hỗ trợ đo đạc khoảng cách không gian. | **Tối ưu theo "Tâm chuyến đi" (Centroid):** Chọn phòng nằm ở vị trí trung tâm của các điểm vui chơi. | 

## 7. TÍNH KHẢ THI VÀ PHẠM VI DỮ LIỆU THỬ NGHIỆM (DATA READINESS)

* **Chi phí triển khai dữ liệu:** 0 VNĐ (Hoàn toàn miễn phí).

* **Nguồn API Thời tiết:** Open-Meteo API (Open-source, không giới hạn khắt khe, format JSON chuẩn hóa).

* **Nguồn dữ liệu Địa điểm (PoC Scope):**

  * Khoanh vùng thử nghiệm tại 1 thành phố du lịch tiêu biểu (ví dụ: Thành phố Đà Lạt hoặc Thành phố Đà Nẵng).

  * Quy mô dữ liệu: \~50 điểm tham quan nổi bật, \~70 quán ăn đặc sản, \~40 homestay/khách sạn.

  * Phương pháp thu thập: Trích xuất qua OpenStreetMap (Overpass API) hoặc chạy Seeder Script mẫu kết hợp Google Places Free Tier.

## 8. KẾ HOẠCH TRIỂN KHAI (ROADMAP)

* **Giai đoạn 1 (Tuần 1 - Tuần 2):** Phân tích yêu cầu (SRS), thiết kế CSDL PostgreSQL/PostGIS, xây dựng Seeder nạp dữ liệu mẫu điểm đến và chỗ ở.

* **Giai đoạn 2 (Tuần 3 - Tuần 5):** Xây dựng Backend API (Quản lý chuyến đi, Truy vấn không gian PostGIS, Tích hợp Open-Meteo API).

* **Giai đoạn 3 (Tuần 6 - Tuần 8):** Xây dựng Frontend giao diện Bản đồ số tương tác (Leaflet/Mapbox) và Timeline kéo thả.

* **Giai đoạn 4 (Tuần 9 - Tuần 10):** Tích hợp module AI (Tool Calling, Cơ chế kích hoạt Kế hoạch B, Tính toán phòng lưu trú tại Centroid).

* **Giai đoạn 5 (Tuần 11 - Tuần 12):** Kiểm thử phần mềm (Unit Test, Integration Test), tối ưu hóa hiệu năng truy vấn không gian, hoàn thiện báo cáo đồ án.