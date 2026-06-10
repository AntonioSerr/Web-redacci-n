/* ============================================
   llm.js — Gemini API Integration
   ============================================ */

const SUGGEST_TOPIC_SYSTEM = `You are a creative language learning assistant.
Your task is to suggest an engaging, interesting writing topic appropriate for a student
learning {target_language} at level {level}.

The topic should be:
- A typical exam-style topic for this level (e.g., Environment, Technology, Education, Travel, Health, Work, Society)
- DIFFERENT from previous requests. Pick a random category from the typical exam themes each time to ensure high variety.
- Suitable for a short essay (150-300 words at the student's level)
- Specific enough to guide writing, but open enough for creativity

Respond in valid JSON with EXACTLY this schema:
{
  "topic": "<short title of the topic>",
  "description": "<a 2-3 sentence description of the topic, written in {native_language} to help the student understand what to write about>"
}`;

const SUGGEST_VOCABULARY_SYSTEM = `You are a language learning vocabulary assistant.
Generate useful vocabulary for a student learning {target_language} at level {level} who will write about the given topic.

Provide:
- 10 to 15 key words relevant to the topic, with translations to {native_language} and an example sentence in {target_language}
- 5 to 8 useful connectors/linking words appropriate for the level, with translations to {native_language}, a brief usage note in {native_language}, AND an example sentence in {target_language} demonstrating how to use the connector

CRITICAL: Every single connector MUST include ALL four fields: "connector", "translation", "usage", and "example". The "example" field must be a complete sentence in {target_language} that demonstrates how to use the connector naturally. NEVER omit the "example" field.

The vocabulary MUST match the {level} proficiency level:
- A1/A2: basic, high-frequency words
- B1/B2: intermediate, more nuanced vocabulary
- C1/C2: advanced, idiomatic, sophisticated vocabulary

Respond in valid JSON with EXACTLY this schema:
{
  "words": [
    {"word": "<word in {target_language}>", "translation": "<translation in {native_language}>", "example": "<example sentence in {target_language}>"}
  ],
  "connectors": [
    {"connector": "<connector in {target_language}>", "translation": "<translation in {native_language}>", "usage": "<usage note in {native_language}>", "example": "<full example sentence using the connector in {target_language}>"}
  ]
}`;

const REVIEW_WRITING_SYSTEM = `You are an expert {target_language} language teacher reviewing a student's writing.
The student is at level {level} and their native language is {native_language}.

Carefully analyze the text for errors in these categories:
- **vocabulary**: wrong word choice, false friends, incorrect word usage
- **grammar**: incorrect verb conjugation, agreement errors, wrong tense, syntax issues
- **spelling**: misspellings, accent errors, typos
- **collocation**: unnatural word combinations, non-idiomatic expressions

For EACH error found:
1. Identify the exact fragment in the original text (original_text)
2. Provide the correction (correction)
3. Explain the error in {native_language} (explanation)
4. Provide the character start_index and end_index of the error in the original text
5. If it's a grammar error, specify the grammar_rule (e.g. "subject-verb agreement", "past tense usage"); otherwise set grammar_rule to null
6. If it's a vocabulary, spelling, or collocation error, provide the correct target_word; otherwise null
7. If it's a vocabulary or spelling error, provide the native_translation of the correct target_word in {native_language}; otherwise null

CRITICAL: ONLY extract actual errors. DO NOT suggest new vocabulary or improvements if the student's word was perfectly correct. If the text is flawless, the "errors" array MUST be empty [].
CRITICAL: For ALL errors of type 'vocabulary', 'spelling', and 'collocation', you MUST always provide the native_translation field with the translation of target_word to {native_language}. This field must NEVER be null or empty for these error types.

Also provide:
- A complete rewritten version of the text corrected and polished to match {level} level
- Feedback with strengths, weaknesses, and improvement tips (all in {native_language})
- A grades object containing specific evaluations in {native_language} for:
  - general: An overall grade/score and a brief summary from an examiner's perspective.
  - grammar: Did they use structures required for {level}? Did they use them correctly?
  - spelling: List of typos/mistakes. Is this an acceptable amount for {level}?
  - vocabulary: Is the vocabulary appropriate and rich enough for {level}?

Respond in valid JSON with EXACTLY this schema:
{
  "errors": [
    {
      "type": "vocabulary|grammar|spelling|collocation",
      "original_text": "<exact fragment from user text>",
      "correction": "<corrected version>",
      "explanation": "<detailed explanation in {native_language}>",
      "start_index": 0,
      "end_index": 10,
      "grammar_rule": "<rule or null>",
      "target_word": "<correct word or null>",
      "native_translation": "<translation or null>",
      "suggested_correction": "<if type is grammar, provide the full corrected sentence; otherwise null>"
    }
  ],
  "rewritten_text": "<full corrected and polished text>",
  "feedback": {
    "strengths": ["<strength 1>", "<strength 2>"],
    "weaknesses": ["<weakness 1>", "<weakness 2>"],
    "improvement_tips": ["<tip 1>", "<tip 2>"],
    "grades": {
      "general": "<general evaluation in {native_language}>",
      "grammar": "<grammar evaluation in {native_language}>",
      "spelling": "<spelling evaluation in {native_language}>",
      "vocabulary": "<vocabulary evaluation in {native_language}>"
    }
  }
}

The tone must be:
{severity_tone}

CRITICAL: Regardless of the tone, you MUST point out ALL errors found. The change in tone must NEVER cause the omission of information.
Evaluate against the CEFR level standard rigorously.
`;

const STRUCTURE_CHECK_SYSTEM = `You are an expert {target_language} grammar teacher.
A student (level {level}, native language {native_language}) previously made a grammar error
involving the rule: "{grammar_rule_broken}"

Their original wrong sentence was:
"{original_wrong_sentence}"

The student has now written 3 new sentences attempting to correctly apply this grammar rule.
Your job is to evaluate whether EACH sentence correctly demonstrates the grammar rule.

Evaluate ONLY whether the grammar rule in question is correctly applied in each sentence.
Minor unrelated errors should not cause failure, but do mention them.
Each sentence must be a genuinely different sentence, not a trivial variation.

Respond in valid JSON with EXACTLY this schema:
{
  "all_correct": true/false,
  "evaluations": [
    {"sentence_index": 1, "correct": true/false, "explanation": "<explanation in {native_language}>"},
    {"sentence_index": 2, "correct": true/false, "explanation": "<explanation in {native_language}>"},
    {"sentence_index": 3, "correct": true/false, "explanation": "<explanation in {native_language}>"}
  ]
}
`;

const CHAT_SYSTEM = `You are a helpful AI assistant.
Answer the user's requests concisely and helpfully.
The user is a native {native_language} speaker learning {target_language} at a {level} level, but you can chat with them about anything they want as a general AI.
CRITICAL: You MUST always reply in {native_language} (the source language).`;

const TRANSLATE_WORD_SYSTEM = `You are a translator. Translate the given word or short phrase from {source_language} to {target_language}. Respond with ONLY the translation, no explanations, no quotes, no extra text.`;

const VOCAB_CHECK_SYSTEM = `You are a strict {target_language} language teacher.
Your student (level {level}, native language {native_language}) made a mistake with this vocabulary word before: "{word}"
The correct translation is: "{translation}"

The student has written a new sentence trying to use this word correctly:
"{sentence}"

Did the student use the word "{word}" correctly in their sentence?
Consider grammar, context, and meaning.

Respond in valid JSON with EXACTLY this schema:
{
  "correct": true/false,
  "explanation": "<detailed explanation in {native_language}>"
}
`;

/**
 * Format a string replacing {placeholders} with variables.
 */
function formatPrompt(template, variables) {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{${key}\\}`, 'g');
    result = result.replace(regex, value);
  }
  return result;
}

/**
 * Call the Gemini 3.1 Flash Lite REST API directly.
 */
async function callGeminiAPI(systemInstruction, userPrompt, jsonMode = true, temperature = 0.7, retryCount = 0) {
  const apiKey = localStorage.getItem('wt_gemini_key');
  if (!apiKey) {
    throw new Error('API Key de Gemini no configurada');
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`;
  
  const payload = {
    contents: [{
      role: "user",
      parts: [{ text: userPrompt }]
    }],
    systemInstruction: {
      role: "system",
      parts: [{ text: systemInstruction }]
    },
    generationConfig: {
      temperature: temperature,
      topP: 0.95,
      topK: 40
    }
  };

  // Modificación: No enviamos responseMimeType para correr bajo la cuota general de texto plano

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMsg = errorData.error?.message || `Error del servidor de IA (${response.status})`;
    
    if (response.status === 429 || response.status === 503 || errorMsg.toLowerCase().includes('high demand') || errorMsg.toLowerCase().includes('quota') || errorMsg.toLowerCase().includes('overloaded')) {
      if (retryCount === 0) {
        if (typeof showAiToast === 'function') {
          showAiToast('Modelo saturado. Esperando 5s...');
        }
        await new Promise(resolve => setTimeout(resolve, 5000));
        if (typeof showAiToast === 'function') showAiToast('Reintentando petición...');
        return callGeminiAPI(systemInstruction, userPrompt, jsonMode, temperature, 1);
      }
    }
    
    console.error("Gemini API Error:", errorData);
    throw new Error(errorMsg);
  }

  const data = await response.json();
  
  // Extract token info
  const tokenInfo = {
    prompt_tokens: data.usageMetadata?.promptTokenCount || 0,
    completion_tokens: data.usageMetadata?.candidatesTokenCount || 0,
    total_tokens: data.usageMetadata?.totalTokenCount || 0
  };

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

  if (typeof updateCostTracker === 'function') {
    updateCostTracker(tokenInfo, 'gemini');
  }

  if (jsonMode) {
    try {
      let cleanText = text.trim();
      if (cleanText.startsWith('```')) {
        cleanText = cleanText.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/, '').trim();
      }
      return { data: JSON.parse(cleanText), tokenInfo };
    } catch (e) {
      console.error("LLM returned invalid JSON:", text);
      throw new Error("El modelo de IA devolvió un formato inválido. Por favor, intenta de nuevo.");
    }
  }

  return { data: text, tokenInfo };
}

window.formatPrompt = formatPrompt;
window.callGeminiAPI = callGeminiAPI;

