// Shared helper: asks Gemini, tries a second model if the first is busy
const MODELS = ['gemini-flash-lite-latest', 'gemini-3.8-flash'];

async function askGemini(prompt) {
  for (const model of MODELS) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
            signal: AbortSignal.timeout(8000),
          }
        );
        if (response.ok) return await response.json();
        console.log(`GEMINI ERROR (${model}, try ${attempt}):`, response.status);
        if (response.status !== 503 && response.status !== 429) break;
      } catch (e) {
        console.log(`GEMINI TIMEOUT/FAIL (${model}, try ${attempt}):`, e.name);
      }
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  return null;
}

module.exports = { askGemini };