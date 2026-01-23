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

export const GenerateQuiz = async (
  originalQuestion: IQuestionInput,
  quantity: number = 3
) => {
  try {
    // 1. Prompt rõ ràng hơn, ép buộc cấu trúc JSON
    const prompt = `
      Bạn là trợ lý soạn đề thi chuyên nghiệp. 
      Nhiệm vụ: Tạo ${quantity} câu hỏi biến thể (giữ nguyên độ khó, chủ đề, kiến thức).
      
      DỮ LIỆU GỐC:
      - Câu hỏi: "${originalQuestion.name}"
      - Lựa chọn: ${JSON.stringify(originalQuestion.choice)}
      - Đáp án đúng: ${JSON.stringify(originalQuestion.correctAns)}
      - Loại câu hỏi: ${originalQuestion.type}

      YÊU CẦU QUAN TRỌNG VỀ OUTPUT:
      Chỉ trả về một mảng JSON (Array of Objects), trong đó mỗi object MỐT phải có đúng các trường sau:
      1. "name": (string) Nội dung câu hỏi mới.
      2. "choice": (array string) Danh sách các lựa chọn (BẮT BUỘC PHẢI CÓ).
      3. "correctAns": (array string) Danh sách đáp án đúng (lấy từ tập choice).
      4. "type": (string) Giữ nguyên là "${originalQuestion.type}".

      Tuyệt đối không thêm Markdown (như \`\`\`json), chỉ trả về JSON thuần.
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
        responseMimeType: "application/json", // Ép trả về JSON
      },
    });

    const text = response.text;

    // 2. Sử dụng hàm cleanAndParseJSON (bạn đã có ở dưới) để an toàn hơn
    // Thay vì JSON.parse(text) trực tiếp dễ gây lỗi
    const parsedData = cleanAndParseJSON(text);

    // 3. (Quan trọng) Validate dữ liệu trước khi trả về
    // Đảm bảo mọi câu hỏi đều có trường 'choice'
    if (Array.isArray(parsedData)) {
      return parsedData.map((q) => ({
        ...q,
        choice: q.choice || [], // Fallback nếu thiếu
        correctAns: q.correctAns || [], // Fallback nếu thiếu
      }));
    }

    return parsedData;
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
      model: "gemma-3-4b-it", 
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