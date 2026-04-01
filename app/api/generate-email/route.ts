export async function POST(req: Request) {
  try {
    const { 
      org_name, 
      mission, 
      event_name, 
      business_name, 
      specific_ask, 
      sender_name, 
      tone 
    } = await req.json()

    const systemPrompt = `You are helping a nonprofit volunteer write a donation request email for their fundraising gala. Write a compelling, concise outreach email requesting an in-kind donation.

Tone guidance:
- Professional: formal, respectful, brief
- Friendly: warm, conversational, community-focused  
- Enthusiastic: energetic, passionate about the cause
- Parent-to-Parent: personal, peer-to-peer, 'we're all in this together' feel

IMPORTANT: Respond with ONLY a valid JSON object in this exact format, no other text:
{"subject": "your subject line here", "body": "your email body here"}`

    const userPrompt = `Write an outreach email with these details:
Organization: ${org_name}
Mission: ${mission || "Supporting our community"}
Event: ${event_name}
Donor/Business: ${business_name}
Specific Ask: ${specific_ask}
Sender Name: ${sender_name}
Tone: ${tone}

Remember to respond with ONLY the JSON object.`

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY || "",
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system: systemPrompt,
        messages: [
          { role: "user", content: userPrompt }
        ]
      })
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error("[v0] Anthropic API error:", errorData)
      return Response.json({ error: "Failed to generate email" }, { status: 500 })
    }

    const data = await response.json()
    const text = data.content[0].text

    // Parse the JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error("[v0] Failed to find JSON in response:", text)
      return Response.json({ error: "Failed to parse response" }, { status: 500 })
    }

    const parsed = JSON.parse(jsonMatch[0])
    return Response.json({ subject: parsed.subject, body: parsed.body })

  } catch (error) {
    console.error("[v0] Generate email error:", error)
    return Response.json({ error: "Generation failed" }, { status: 500 })
  }
}
