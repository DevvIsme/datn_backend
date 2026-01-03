// src/services/Gemini.service.ts
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// 1. Khởi tạo Client (Chuẩn SDK mới)
const genAI = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY,
});

// Định nghĩa Interface
interface IQuestionInput {
  name: string;
  type: string;
  choice: string[];
  correctAns: string[];
}

// === HÀM 1: GIẢI THÍCH CÂU HỎI ===
export const ExplainQuestion = async (questionData: any) => {
  try {
    const prompt = `
            Bạn là một giáo viên giỏi. Giải thích câu hỏi trắc nghiệm sau:
            - Câu hỏi: "${questionData.name}"
            - Các lựa chọn: ${JSON.stringify(questionData.choice)}
            - Đáp án đúng: "${JSON.stringify(questionData.correctAns)}"
            
            YÊU CẦU:
            1. Giải thích ngắn gọn tại sao đáp án đúng lại đúng.
            2. Phân tích sơ lược tại sao các phương án khác sai.
            3. Trả về JSON: { "explanation": "...", "key_point": "..." }
        `;

    // CÚ PHÁP ĐÚNG: client.models.generateContent
    const response = await genAI.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
      config: {
        responseMimeType: "application/json",
      },
    });

    // SDK mới trả về data trực tiếp qua .text()
    const text = response.text;
    if (!text) return null;

    try {
      return JSON.parse(text);
    } catch (e) {
      return { explanation: text, key_point: "Kiến thức quan trọng" };
    }
  } catch (error) {
    console.error("Gemini Explain Error:", error);
    return null;
  }
};

// === HÀM 2: TẠO ĐỀ THI (QUIZ) ===
export const GenerateQuiz = async (
  originalQuestion: IQuestionInput,
  quantity: number = 3
) => {
  try {
    const prompt = `
      Bạn là trợ lý soạn đề thi. Tạo ${quantity} câu hỏi biến thể dựa trên:
      - Nội dung: "${originalQuestion.name}"
      - Lựa chọn: ${JSON.stringify(originalQuestion.choice)}
      - Đáp án: ${JSON.stringify(originalQuestion.correctAns)}
      - Loại: ${originalQuestion.type}

      YÊU CẦU: Giữ nguyên độ khó, chủ đề. Trả về mảng JSON.
    `;

    const response = await genAI.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
      config: {
        responseMimeType: "application/json",
      },
    });

    const text = response.text;
    return text ? JSON.parse(text) : null;
  } catch (error) {
    console.error("Generate Quiz Error:", error);
    return null;
  }
};

// === HÀM 3: SOI CAMERA (PROCTORING) ===
export const AnalyzeExamImage = async (base64Image: string) => {
  try {
    // Prompt được tối ưu để ép Gemma trả về ít chữ thừa nhất có thể
  const prompt = `
            Đóng vai trò là Giám thị AI. Phân tích ảnh webcam và phát hiện gian lận.

            HÃY PHÂN LOẠI VI PHẠM VÀO CÁC NHÓM SAU (để lưu Database):
            1. "face_missing": Không thấy mặt, quá tối, hoặc bị che.
            2. "multiple_faces": Có nhiều hơn 1 người.
            3. "detect_phone": Cầm điện thoại, thiết bị điện tử, tai nghe.
            4. "other": Mắt nhìn lệch hướng liên tục, cử chỉ lạ, hoặc lỗi khác.
            5. "none": Không vi phạm, hợp lệ.

            YÊU CẦU OUTPUT (JSON RAW):
            { 
              "is_suspicious": boolean, 
              "violation_type": "face_missing" | "multiple_faces" | "detect_phone" | "other" | null,
              "message": "Mô tả ngắn gọn tiếng Việt" 
            }
            
            Ví dụ: { "is_suspicious": true, "violation_type": "detect_phone", "message": "Phát hiện cầm điện thoại" }
        `;

    const response = await genAI.models.generateContent({
      model: "gemma-3-12b-it", 
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: base64Image,
              },
            },
          ],
        },
      ],
    });

    const text = response.text;

    // SỬ DỤNG HÀM CLEAN MỚI ĐỂ TRÁNH LỖI "Unexpected token"
    const result = cleanAndParseJSON(text);

    return result
      ? result
      : { is_suspicious: false, message: "Không phân tích được (JSON Error)" };
  } catch (error: any) {
    console.log("------------------------------------------------");
    console.error("🔥 CHI TIẾT LỖI GEMINI:");
    if (error.status) console.error("Status Code:", error.status);
    console.error("Message:", error.message);
    console.log("------------------------------------------------");

    if (
      error.status === 429 ||
      error.message?.includes("429") ||
      error.status === 503
    ) {
      return { is_suspicious: false, message: "Server bận (Bỏ qua)" };
    }

    return { is_suspicious: false, message: "Lỗi kỹ thuật AI" };
  }
};

const cleanAndParseJSON = (text: string | undefined | null) => {
  if (!text) return null;
  try {
    // 1. Thử parse trực tiếp (cho trường hợp model trả về chuẩn)
    return JSON.parse(text);
  } catch (e) {
    try {
      // 2. Nếu lỗi, lọc bỏ Markdown code block
      const cleanText = text
        .replace(/```json/g, "") // Xóa tag mở
        .replace(/```/g, "") // Xóa tag đóng
        .trim(); // Cắt khoảng trắng thừa
      return JSON.parse(cleanText);
    } catch (error) {
      console.error("❌ Lỗi Parse JSON Final:", error);
      console.log("⚠️ Chuỗi text gây lỗi:", text);
      return null;
    }
  }
};