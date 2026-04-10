export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const { locationName } = await req.json();

    // Unified Vercel AI Gateway Endpoint
    // This allows us to use standard fetch without any SDKs
    const response = await fetch(
      'https://ai-gateway.vercel.sh/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.VERCEL_AI_GATEWAY_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'openai/gpt-4o-mini', // Возвращаемся к GPT-4o-mini
          messages: [
            {
              role: 'system',
              content: `Вы — профессиональный гид по Риму (издание "Donna Alevtonna Edition"). 
            Предоставьте один очень короткий (максимум 2 предложения), удивительный и интересный факт о достопримечательности, указанной ниже. 
            Факт должен быть написан на РУССКОМ ЯЗЫКЕ, в премиальном, увлекательном стиле, как будто вы делитесь "секретом для своих". 
            ВАЖНО: Каждый раз старайся рассказать НОВЫЙ факт, не повторяя самые известные.
            Достопримечательность: ${locationName}`,
            },
            {
              role: 'user',
              content: `Расскажите мне секрет о ${locationName} на русском языке.`,
            },
          ],
          stream: true, // Enable streaming
          temperature: 0.7,
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway Error Response:', errorText);
      return new Response(
        JSON.stringify({
          error: 'AI Gateway Error',
          details: errorText,
        }),
        { status: response.status },
      );
    }

    return new Response(response.body);
  } catch (error) {
    console.error('Server Internal Error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal Server Error',
        details: error instanceof Error ? error.message : 'Unknown',
      }),
      { status: 500 },
    );
  }
}
