const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

async function callOpenRouter(body) {
  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.error?.message || `OpenRouter request failed with status ${response.status}`
    );
  }

  return data;
}

export async function generateStory(prompt) {
  const data = await callOpenRouter({
    model: "openrouter/free",
    messages: [
      {
        role: "user",
        content: prompt
      }
    ]
  });

  return data.choices?.[0]?.message?.content || "";
}

export async function generateStructured(prompt, schema) {
  const data = await callOpenRouter({
    model: "openrouter/free",
    messages: [
      {
        role: "user",
        content: prompt
      }
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "structured_response",
        strict: true,
        schema
      }
    }
  });

  const content = data.choices?.[0]?.message?.content;
  console.log("OpenRouter structured content:", content);

  if (!content) {
    throw new Error("OpenRouter returned an empty response.");
  }

  return JSON.parse(content);
}