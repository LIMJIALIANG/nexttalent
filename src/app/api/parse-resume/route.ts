import { NextResponse, NextRequest } from "next/server";
import { generateGeminiMultimodal } from "@/lib/gemini";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { fileData, mimeType } = (await request.json()) as {
      fileData: string;
      mimeType: string;
    };

    if (!fileData || !mimeType) {
      return NextResponse.json(
        { error: "fileData (base64) and mimeType are required." },
        { status: 400 }
      );
    }

    const prompt = `You are a resume parsing AI. Extract the resume information from this document and structure it exactly into the following JSON format.
Make sure you capture all relevant educational qualifications, work experience, projects, specific skills, achievements, and objective/personal summary. 

Return ONLY valid JSON (no markdown, no code fences) in this exact format:
{
  "personal": {
    "name": "Full name of the candidate",
    "objective": "Objective statement or summary paragraph"
  },
  "education": [
    {
      "institution": "University / school name",
      "degree": "Degree and major",
      "details": "Additional details like CGPA, coursework",
      "duration": "e.g. 2022 - Present"
    }
  ],
  "experience": [
    {
      "company": "Company / Organisation name",
      "role": "Role / Position title",
      "description": "Key responsibilities and bullet points describing the work",
      "duration": "e.g. March 2025 - September 2025"
    }
  ],
  "projects": [
    {
      "title": "Project name / Title",
      "description": "Details of what was built and technologies used"
    }
  ],
  "skills": ["List", "of", "single-word", "or", "short-phrase", "technical", "and", "soft", "skills"],
  "achievements": [
    "Achievement or Certificate 1",
    "Achievement or Certificate 2"
  ]
}

Ensure all extracted text is clean and matches the resume contents exactly. Do not invent any information.`;

    const contents = [
      {
        inlineData: {
          data: fileData,
          mimeType: mimeType,
        },
      },
      prompt,
    ];

    const text = await generateGeminiMultimodal(contents);

    let cleanedText = text.trim();
    if (cleanedText.startsWith("```")) {
      cleanedText = cleanedText
        .replace(/^```(?:json)?\n?/, "")
        .replace(/\n?```$/, "");
    }

    const parsedResume = JSON.parse(cleanedText);

    return NextResponse.json({ success: true, data: parsedResume });
  } catch (error) {
    console.error("Resume parsing error:", error);
    return NextResponse.json(
      { error: "Failed to parse resume file. Please ensure it is a valid PDF or Image." },
      { status: 500 }
    );
  }
}
