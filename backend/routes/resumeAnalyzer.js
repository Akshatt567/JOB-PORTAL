const express = require("express");
const multer = require("multer");
const { PDFParse } = require("pdf-parse");
const { GoogleGenAI } = require("@google/genai");
require("dotenv").config();

const router = express.Router();

// PDF upload configuration
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      return cb(new Error("Only PDF files are allowed."));
    }
    cb(null, true);
  },
});

// Gemini AI client
const ai = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  : null;

// JSON response schema
const resumeSchema = {
  type: "object",
  properties: {
    score: {
      type: "integer",
      description: "Resume score from 0 to 100.",
    },
    summary: {
      type: "string",
    },
    strengths: {
      type: "array",
      items: { type: "string" },
    },
    weaknesses: {
      type: "array",
      items: { type: "string" },
    },
    skills: {
      type: "array",
      items: { type: "string" },
    },
    missingInformation: {
      type: "array",
      items: { type: "string" },
    },
    suggestions: {
      type: "array",
      items: { type: "string" },
    },
    recommendedRoles: {
      type: "array",
      items: { type: "string" },
    },
  },
  required: [
    "score",
    "summary",
    "strengths",
    "weaknesses",
    "skills",
    "missingInformation",
    "suggestions",
    "recommendedRoles",
  ],
};

router.post("/", (req, res) => {
  upload.single("resume")(req, res, async (uploadError) => {
    if (uploadError) {
      return res.status(400).json({
        message: uploadError.message || "PDF upload failed.",
      });
    }

    let parser;

    try {
      // Authentication
      if (!req.session || !req.session.user) {
        return res.status(401).json({
          message: "Please log in first.",
        });
      }

      // Job Seeker access only
      if (req.session.user.role !== "Job Seeker") {
        return res.status(403).json({
          message: "Only Job Seekers can use the Resume Analyzer.",
        });
      }

      // Check file
      if (!req.file) {
        return res.status(400).json({
          message: "Please upload a PDF resume.",
        });
      }

      if (!ai) {
        return res.status(500).json({
          message: "Gemini API key is not configured.",
        });
      }

      // Validate PDF signature
      if (req.file.buffer.subarray(0, 5).toString() !== "%PDF-") {
        return res.status(400).json({
          message: "The uploaded file is not a valid PDF.",
        });
      }

      // Extract PDF text
      parser = new PDFParse({
        data: req.file.buffer,
      });

      const pdfResult = await parser.getText();
      const resumeText = pdfResult.text.trim();

      if (!resumeText || resumeText.length < 50) {
        return res.status(400).json({
          message:
            "Could not extract enough text. Please upload a text-based PDF resume. Scanned PDFs are not supported yet.",
        });
      }

      if (resumeText.length > 30000) {
        return res.status(400).json({
          message: "Resume text is too long to analyze.",
        });
      }

      // Resume analysis prompt
      const prompt = `
You are an experienced professional resume evaluator and career advisor.

Analyze the following resume carefully.

Evaluate:
1. Overall resume quality.
2. Formatting and clarity based on the extracted text.
3. Technical and professional skills.
4. Work experience and projects.
5. Education and qualifications.
6. Missing or weak information.
7. Improvements that can make the resume stronger.
8. Suitable job roles for this candidate.

Give honest, practical feedback. Do not invent qualifications,
experience, or skills that are not present in the resume.

The score must be an integer between 0 and 100.

Return your analysis using the requested JSON schema.

RESUME TEXT:
${resumeText}
`;

      // Gemini 3.8 Flash - Interactions API
      const interaction = await ai.interactions.create({
        model: "gemini-3.8-flash",
        input: prompt,
        response_format: {
          type: "text",
          mime_type: "application/json",
          schema: resumeSchema,
        },
      });

      const responseText = interaction.output_text;

      if (!responseText) {
        throw new Error("Gemini returned an empty response.");
      }

      const analysis = JSON.parse(responseText);

      // Validate score
      if (
        typeof analysis.score !== "number" ||
        !Number.isInteger(analysis.score) ||
        analysis.score < 0 ||
        analysis.score > 100
      ) {
        throw new Error("Gemini returned an invalid resume score.");
      }

      return res.status(200).json({
        message: "Resume analyzed successfully.",
        analysis,
      });
    } catch (error) {
      // Log the actual error for debugging
      console.error("Resume analysis error:", error);

      return res.status(500).json({
        message: "Resume analysis failed. Please try again.",
      });
    } finally {
      if (parser) {
        await parser.destroy().catch(() => {});
      }
    }
  });
});

// Upload error handler
router.use((error, req, res, next) => {
  console.error("Resume upload error:", error.message);

  return res.status(400).json({
    message: error.message || "Invalid PDF upload.",
  });
});

module.exports = router;