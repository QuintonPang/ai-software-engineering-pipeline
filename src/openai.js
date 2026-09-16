export class OpenAIClient {
  constructor(apiKey, model) {
    this.apiKey = apiKey;
    this.model = model;
  }

  async complete(instructions, input) {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: this.model,
        instructions,
        input,
        reasoning: { effort: "medium" },
        max_output_tokens: 12000
      })
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`OpenAI ${response.status}: ${body}`);
    }

    const payload = await response.json();
    if (typeof payload.output_text === "string" && payload.output_text.trim()) {
      return payload.output_text.trim();
    }

    const text = (payload.output || [])
      .flatMap((item) => item.content || [])
      .filter((content) => content.type === "output_text" && typeof content.text === "string")
      .map((content) => content.text)
      .join("\n")
      .trim();

    if (!text) throw new Error("OpenAI response contained no text output");
    return text;
  }
}
