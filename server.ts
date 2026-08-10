import express from "express";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "5mb" }));

// Initialize Gemini Client
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
};

// API Health route
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", aiEnabled: !!process.env.GEMINI_API_KEY });
});

// AI Financial Assistant Endpoint
app.post("/api/ai/assistant", async (req, res) => {
  try {
    const { message, context } = req.body;

    if (!message || typeof message !== "string") {
      res.status(400).json({ error: "Nội dung tin nhắn không hợp lệ" });
      return;
    }

    const ai = getGeminiClient();
    if (!ai) {
      res.json({
        success: false,
        fallbackToRule: true,
        reason: "Chưa cấu hình GEMINI_API_KEY",
      });
      return;
    }

    const {
      currentDate = new Date().toISOString().split("T")[0],
      expenses = [],
      goals = [],
      categoryLimits = {},
      income = 0,
    } = context || {};

    const systemInstruction = `Bạn là Trợ lý Tài chính AI Tiếng Việt cho ứng dụng Sổ Tay Chi Tiêu Cá Nhân.
Nhiệm vụ của bạn là bóc tách thông tin chi tiêu HOẶC trả lời truy vấn phân tích tài chính dựa trên dữ liệu người dùng.

Hôm nay là ngày: ${currentDate}

Danh mục chi tiêu hợp lệ (chỉ được dùng category ID chính xác này):
- an_uong (Ăn uống: phở, cơm, cafe, trà sữa, chợ, siêu thị, ăn vặt...)
- di_chuyen (Di chuyển: xăng, xe, Grab, taxi, vé xe, sửa xe, gửi xe...)
- mua_sam (Mua sắm: quần áo, giày dép, mỹ phẩm, đồ dùng, điện thoại, máy tính...)
- giai_tri (Giải trí: xem phim, game, du lịch, karaoke, concert...)
- hoa_don (Hóa đơn: điện, nước, internet, wifi, học phí, tiền nhà, dịch vụ...)
- suc_khoe (Sức khỏe: thuốc, khám bệnh, gym, yoga, bác sĩ...)
- giao_duc (Giáo dục: sách vở, khóa học, chứng chỉ, văn phòng phẩm...)
- khac (Khác)

1. Nếu tin nhắn có ý định GHI CHI TIÊU (ví dụ: "ăn sáng 35k", "hôm qua đi Grab 85 nghìn", "mua áo 350k hôm kia", "tối qua đi xem phim hết 150k"):
- Trả về intent = "create_expense"
- amount: Số tiền nguyên bằng VNĐ (Ví dụ: "35k" -> 35000; "1.5tr" hoặc "1,5 triệu" -> 1500000; "85 nghìn" -> 85000; "150k" -> 150000; "120000" -> 120000)
- category: Một trong các category ID ở trên.
- categoryName: Tên danh mục Tiếng Việt tương ứng.
- date: Định dạng YYYY-MM-DD. Lưu ý: "hôm qua" = ngày ${currentDate} trừ 1 ngày; "hôm kia" = ngày ${currentDate} trừ 2 ngày; "hôm nay" = ${currentDate}.
- note: Ghi chú ngắn gọn thể hiện món chi tiêu (Ví dụ: "Ăn sáng", "Đi Grab", "Mua áo", "Xem phim").
- confidence: Số thực từ 0.0 đến 1.0 đánh giá độ tin cậy.
- explanation: Giải thích vắn tắt (VD: "Đã nhận diện chi tiêu Ăn uống 35.000₫ vào hôm nay").

2. Nếu tin nhắn có ý định HỎI HOẶC TRUY VẤN TÀI CHÍNH (ví dụ: "tháng này tôi tiêu bao nhiêu?", "tôi đang tiêu nhiều nhất vào đâu?", "tôi có vượt ngân sách không?", "bao lâu nữa tôi đạt mục tiêu mua laptop?", "Top 3 khoản chi của tôi tháng này?", "Tháng này tôi tiêu nhiều hơn tháng trước bao nhiêu?", "Danh mục nào vượt ngân sách?", "Nếu giảm ăn uống 20% thì tôi tiết kiệm được bao nhiêu?"):
- Trả về intent = "financial_query"
- reply: Câu trả lời tài chính ngắn gọn, chính xác, tính toán rõ ràng theo dữ liệu thực tế dưới đây:
  * Thu nhập hàng tháng: ${income.toLocaleString("vi-VN")} VNĐ
  * Danh sách chi tiêu thực tế (expenses): ${JSON.stringify(expenses)}
  * Mục tiêu tiết kiệm (goals): ${JSON.stringify(goals)}
  * Hạn mức danh mục (categoryLimits): ${JSON.stringify(categoryLimits)}
- confidence: 0.95

3. Nếu là trò chuyện xã giao thông thường:
- Trả về intent = "general_chat"
- reply: Câu trả lời thân thiện, lịch sự bằng tiếng Việt.
- confidence: 0.90`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: `Tin nhắn người dùng: "${message}"`,
      config: {
        systemInstruction,
        temperature: 0.2,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            intent: {
              type: Type.STRING,
              description: "create_expense, financial_query, hoặc general_chat",
            },
            amount: {
              type: Type.NUMBER,
              description: "Số tiền VNĐ",
            },
            currency: {
              type: Type.STRING,
              description: "VND",
            },
            category: {
              type: Type.STRING,
              description: "Category ID",
            },
            categoryName: {
              type: Type.STRING,
              description: "Tên danh mục tiếng Việt",
            },
            date: {
              type: Type.STRING,
              description: "YYYY-MM-DD",
            },
            note: {
              type: Type.STRING,
              description: "Ghi chú chi tiêu",
            },
            confidence: {
              type: Type.NUMBER,
              description: "Độ tin cậy 0.0 - 1.0",
            },
            explanation: {
              type: Type.STRING,
              description: "Mô tả vắn tắt",
            },
            reply: {
              type: Type.STRING,
              description: "Nội dung phản hồi cho financial_query hoặc general_chat",
            },
          },
          required: ["intent"],
        },
      },
    });

    const responseText = response.text || "{}";
    const data = JSON.parse(responseText);

    res.json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error("Gemini AI Assistant Error:", error);
    res.json({
      success: false,
      fallbackToRule: true,
      reason: error?.message || "Lỗi xử lý Gemini AI",
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");

    // Serve static files under both /app_chi_tieu sub-path and root
    app.use("/app_chi_tieu", express.static(distPath));
    app.use(express.static(distPath));

    // SPA fallback routes
    app.get("/app_chi_tieu*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;
