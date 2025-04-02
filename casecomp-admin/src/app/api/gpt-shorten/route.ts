import { NextResponse } from 'next/server';
import { generateShortDescription, isOpenAIEnabled } from '@/lib/gpt';

export async function POST(req: Request) {
  try {
    // Check if OpenAI is enabled
    if (!isOpenAIEnabled()) {
      return NextResponse.json(
        { error: 'OpenAI API is not configured' },
        { status: 503 }
      );
    }

    // Parse request body
    const body = await req.json();
    const { longDescription } = body;

    // Validate request
    if (!longDescription) {
      return NextResponse.json(
        { error: 'Missing longDescription in request body' },
        { status: 400 }
      );
    }

    // Generate short description
    const shortDescription = await generateShortDescription(longDescription);

    // Check if generation was successful
    if (!shortDescription) {
      return NextResponse.json(
        { error: 'Failed to generate short description' },
        { status: 500 }
      );
    }

    // Return short description
    return NextResponse.json({ shortDescription });
  } catch (error) {
    console.error('Error in GPT shorten API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
