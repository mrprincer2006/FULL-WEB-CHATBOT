export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { message } = req.body;
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: 'API Key not configured on server' });
    }

    const systemPrompt = `You are a cheerful Holi Festival Assistant.
Strict Rules:
- ALWAYS respond with festive, joyful language about Holi.
- Include relevant emojis (🎨, 🌈, 🎉, 🎊) in responses.
- Focus on Holi history, traditions, celebrations, and cultural significance.
- NEVER provide information outside Holi festival context.
- Style: Pure text content only. No bolding (**), no italics (*), no bullet points (•).
- Tone: Enthusiastic, colorful, and educational.
- Max 3-4 sentences.
- If asked about non-Holi topics, gently redirect back to Holi festival.`;

    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: message }
                ],
                temperature: 0.7,
                max_tokens: 200
            })
        });

        const data = await response.json();
        res.status(200).json(data);
    } catch (error) {
        console.error("Backend API Error:", error);
        res.status(500).json({ error: 'Failed to fetch from LLM provider' });
    }
}
