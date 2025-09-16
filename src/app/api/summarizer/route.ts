import { NextRequest, NextResponse } from 'next/server';

// HuggingFace chat completions endpoint
const HUGGINGFACE_API_URL = 'https://router.huggingface.co/v1/chat/completions';

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.HUGGINGFACE_API_KEY;
    
    if (!apiKey) {
      console.error('HUGGINGFACE_API_KEY environment variable is not set');
      return NextResponse.json(
        { error: 'HuggingFace API is not configured' },
        { status: 500 }
      );
    }

    // Construct the prompt as specified in the requirements
    const prompt = `Identify the high-level or main concept of the first sentence or two of the provided text. IGNORE any lists or competing options and only consider the one main concept being discussed. Summarize the main concept as concisely as possible, and no more than 5 words. Format your response like this: 'concept: <summarized main concept>'. Provided text: ${text}`;

    // Use the chat completions format
    const response = await fetch(HUGGINGFACE_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          {
            role: "system",
            content: "/think",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        model: "HuggingFaceTB/SmolLM3-3B:hf-inference",
        max_tokens: 1000
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('HuggingFace API error:', errorData);
      return NextResponse.json(
        { error: errorData || 'Failed to generate summary' },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // DEBUG: Log the full response for debugging
    console.log('HuggingFace API Response:', JSON.stringify(data, null, 2));
    
    // Handle chat completion response format
    let summary = '';
    
    if (data.choices && Array.isArray(data.choices) && data.choices.length > 0) {
      // Chat completions format
      if (data.choices[0].message && data.choices[0].message.content) {
        summary = data.choices[0].message.content.trim();
      } else if (data.choices[0].text) {
        summary = data.choices[0].text.trim();
      }
    } else if (data.content) {
      // Direct content response
      summary = data.content.trim();
    }
    
    if (summary) {
      // Remove <think>...</think> metadata if present
      const thinkPattern = /^<think>[\s\S]*?<\/think>/gi;
      summary = summary.replace(thinkPattern, '').trim();
      
      // Remove concept: preamble if present
      const conceptPreamblePattern = /^concept: /gi;
      summary = summary.replace(conceptPreamblePattern, '').trim();

      // Clean up the summary - remove any newlines and extra spaces
      summary = summary.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
      
      // Return the cleaned summary
      return NextResponse.json({ summary });
    } else {
      console.error('Unexpected HuggingFace response format:', JSON.stringify(data));
      return NextResponse.json(
        { error: 'Unexpected response format from HuggingFace' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in HuggingFace API route:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}