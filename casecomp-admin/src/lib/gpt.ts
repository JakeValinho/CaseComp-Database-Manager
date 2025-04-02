import OpenAI from 'openai';

// Check if OpenAI API key is available
const apiKey = process.env.OPENAI_API_KEY;
const isOpenAIAvailable = !!apiKey;

// Initialize OpenAI client if API key is available
const openai = isOpenAIAvailable
  ? new OpenAI({ apiKey: apiKey! })
  : null;

/**
 * Generates a shortened description using OpenAI
 * @param longDescription The long description to shorten
 * @returns Shortened description or null if OpenAI is not available
 */
export async function generateShortDescription(longDescription: string): Promise<string | null> {
  if (!isOpenAIAvailable || !openai) {
    console.warn('OpenAI integration is disabled. API key is missing.');
    return null;
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a helpful assistant that shortens text. Condense the following text to a maximum of 50 words while preserving the key information:' },
        { role: 'user', content: longDescription }
      ],
      temperature: 0.5,
      max_tokens: 200,
    });

    return response.choices[0]?.message?.content?.trim() || null;
  } catch (error) {
    console.error('Error generating short description:', error);
    return null;
  }
}

/**
 * Checks if OpenAI integration is available
 * @returns Boolean indicating if OpenAI is available
 */
export function isOpenAIEnabled(): boolean {
  return isOpenAIAvailable;
}
