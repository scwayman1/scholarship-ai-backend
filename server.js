require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Check for API Key
if (!process.env.GEMINI_API_KEY) {
    console.error("Error: GEMINI_API_KEY environment variable is not set.");
    process.exit(1);
}

// Initialize Google Generative AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

// Initialize Express App
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors()); // Enable CORS for all origins (adjust for production)
app.use(express.json()); // Parse JSON request bodies

// --- Helper Function to Construct Prompt ---
function constructPrompt(section, context) {
    let prompt = `You are an AI assistant helping a student write a scholarship application letter for the A.J. Wang Foundation Scholarship.

Generate a paragraph for the '${section}' section of the letter based on the following student information:
`;

    // Add context details if available
    if (context.name) prompt += `- Student Name: ${context.name}\n`;
    if (context.gpa) prompt += `- GPA: ${context.gpa}\n`;
    if (context.major) prompt += `- Major: ${context.major}\n`;
    if (context.goals) prompt += `- Career Goals: ${context.goals}\n`;
    if (context.achievements) prompt += `- Key Achievements: ${context.achievements}\n`;
    if (context.involvement) prompt += `- Extracurricular Involvement: ${context.involvement}\n`;
    if (context.financialNeed) prompt += `- Financial Need Context: ${context.financialNeed}\n`;
    if (context.existingText) prompt += `\nConsider the existing text in this section (if any):\n"${context.existingText}"\n`;

    prompt += `
Please generate a concise and relevant paragraph suitable for the '${section}' section. Focus on being helpful and constructive.`;

    // Add section-specific instructions if needed
    if (section === "Introduction") {
        prompt += " The introduction should briefly state the student's name, the scholarship they are applying for, and their primary field of study or career aspiration.";
    } else if (section === "Academic Achievements") {
        prompt += " Highlight key academic successes, mentioning the GPA if relevant, and connect them to the student's suitability for the scholarship.";
    } else if (section === "Career Goals") {
        prompt += " Describe the student's future aspirations and how this scholarship will help achieve them.";
    } else if (section === "Extracurricular Activities") {
        prompt += " Mention significant activities or involvement and relate them to the student's character or goals.";
    } else if (section === "Financial Need") {
        prompt += " Briefly explain the student's financial situation and why the scholarship support is needed, maintaining a respectful tone.";
    } else if (section === "Conclusion") {
        prompt += " Summarize the student's interest, reiterate their suitability, and thank the foundation for their consideration. Keep it brief and professional.";
    }

    return prompt;
}

// --- API Endpoint ---
app.post("/api/generate", async (req, res) => {
    const { section, context } = req.body;

    if (!section || !context) {
        return res.status(400).json({ error: "Missing 'section' or 'context' in request body" });
    }

    try {
        console.log(`Received request for section: ${section}`);
        const prompt = constructPrompt(section, context);
        console.log(`Generated Prompt: ${prompt.substring(0, 200)}...`); // Log start of prompt

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const generatedText = response.text();

        console.log(`Successfully generated text for section: ${section}`);
        res.json({ generatedText });

    } catch (error) {
        console.error("Error calling Gemini API:", error);
        // Check for specific rate limit error (example, adjust based on actual API error structure)
        if (error.message && error.message.includes("429")) {
             res.status(429).json({ error: "Rate limit exceeded. Please try again later." });
        } else {
             res.status(500).json({ error: "Failed to generate text from AI model." });
        }
    }
});

// --- Start Server ---
app.listen(port, () => {
    console.log(`Scholarship AI backend listening on port ${port}`);
});

