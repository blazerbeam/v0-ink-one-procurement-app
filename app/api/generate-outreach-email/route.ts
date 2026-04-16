export async function POST(req: Request) {
  try {
    const {
      org_name,
      mission,
      event_name,
      event_date,
      event_location,
      guest_count,
      business_name,
      business_category,
      contact_first_name,
      items,
    } = await req.json()

    // Build items context
    const itemsContext = items && items.length > 0
      ? `Specific items being requested: ${items.join(", ")}`
      : `This is an "open ask" — suggest an appropriate donation based on the business category (${business_category || "general business"}). Be specific but reasonable in your suggestion.`

    const systemPrompt = `You are helping a nonprofit volunteer write donation request emails for their fundraising event. Generate FOUR versions of the same outreach email, one for each tone style below.

Tone descriptions:
- Professional: formal, respectful, brief, business-appropriate
- Friendly: warm, conversational, community-focused  
- Enthusiastic: energetic, passionate about the cause, uses exclamation points sparingly
- Parent-to-Parent: personal, peer-to-peer, 'we're all in this together' feel, casual

Guidelines:
- Keep emails concise (150-250 words)
- Include a clear call to action
- Mention the event name and organization
- Be specific about what you're asking for
- Don't mention packages or sponsorship tiers
- If there's a contact name, address them personally
- If no items are specified, suggest an appropriate donation based on the business type

IMPORTANT: Respond with ONLY a valid JSON object in this exact format, no other text:
{
  "professional": { "subject": "subject line", "body": "email body" },
  "friendly": { "subject": "subject line", "body": "email body" },
  "enthusiastic": { "subject": "subject line", "body": "email body" },
  "parent": { "subject": "subject line", "body": "email body" }
}`

    const eventDetails = [
      event_date ? `Date: ${new Date(event_date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}` : null,
      event_location ? `Location: ${event_location}` : null,
      guest_count ? `Expected guests: ${guest_count}` : null,
    ].filter(Boolean).join("\n")

    const userPrompt = `Write four versions of a donation request email with these details:

Organization: ${org_name}
${mission ? `Mission: ${mission}` : ""}
Event: ${event_name}
${eventDetails}

Business: ${business_name}
${business_category ? `Business Category: ${business_category}` : ""}
${contact_first_name ? `Contact: ${contact_first_name}` : ""}

${itemsContext}

Remember to respond with ONLY the JSON object containing all four versions.`

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY || "",
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 3000,
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

    return Response.json({
      professional: parsed.professional,
      friendly: parsed.friendly,
      enthusiastic: parsed.enthusiastic,
      parent: parsed.parent,
    })

  } catch (error) {
    console.error("[v0] Generate outreach email error:", error)
    return Response.json({ error: "Generation failed" }, { status: 500 })
  }
}
