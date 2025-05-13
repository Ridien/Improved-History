import { GoogleAuth } from 'google-auth-library';
import {
    GoogleGenerativeAI,
    HarmCategory,
    HarmBlockThreshold,
} from "@google/generative-ai";
import {
    Type
} from '@google/genai';
import dotenv from 'dotenv'
dotenv.config()
const apiKey = process.env.API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

async function sendMessage(history = [], prompt, generationConfig = {
    "temperature": 1,
    "top_p": 0.95,
    "top_k": 64,
    "max_output_tokens": 8192,
    "response_mime_type": "text/plain",
}, modelConfig = {
    model: "gemini-2.5-pro-preview-03-25",
    systemInstruction: "",
}) {
    try {

        const model = genAI.getGenerativeModel(modelConfig);
        const chatSession = model.startChat({
            generationConfig,
            history: history
        });
        const result = await chatSession.sendMessage(prompt);
        if (!result || !result.response || !result.response.text) {
            throw new Error("Invalid response from chatSession");
        }
        const resultText = result.response.text();
        return resultText;

    } catch (error) {
        console.error("Error generating text:", error);
        throw error;
    }
}

const gemini = {
    sendMessage
}

export default gemini


