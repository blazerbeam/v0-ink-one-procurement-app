export async function POST(req: Request) {
  try {
    const { 
      org_name, 
      mission, 
      event_name, 
      business_name, 
      specific_ask, 
      sender_name,
      // Organization profile for signature block
      legal_name,
      org_address,
      tax_id,
      contact_email,
      contact_phone,
      website
    } = await req.json()

    // Build signature block if we have profile info
    let signatureInfo = ""
    if (legal_name || org_address || tax_id || contact_email || contact_phone || website) {
      signatureInfo = `

Organization Profile for Signature Block:
- Legal Name: ${legal_name || org_name}
${org_address ? `- Address: ${org_address}` : ""}
${tax_id ? `- Tax ID/EIN: ${tax_id}` : ""}
${contact_email ? `- Email: ${contact_email}` : ""}
${contact_phone ? `- Phone: ${contact_phone}` : ""}
${website ? `- Website: ${website}` : ""}

Include a professional signature block at the end of each email using this organization information.`
    }

    const systemPrompt = `You are helping a nonprofit volunteer write donation request emails for their fundraising gala. Generate FOUR versions of the same outreach email, one for each tone style below.

Tone descriptions:
- Professional: formal, respectful, brief, business-appropriate
- Friendly: warm, conversational, community-focused  
- Enthusiastic: energetic, passionate about the cause, uses exclamation points
- Parent-to-Parent: personal, peer-to-peer, 'we're all in this together' feel, casual

IMPORTANT: Respond with ONLY a valid JSON object in this exact format, no other text:
{
  "professional": { "subject": "subject line", "body": "email body" },
  "friendly": { "subject": "subject line", "body": "email body" },
  "enthusiastic": { "subject": "subject line", "body": "email body" },
  "parentToParent": { "subject": "subject line", "body": "email body" }
}`

    const userPrompt = `Write four versions of an outreach email (one per tone) with these details:
Organization: ${org_name}
Mission: ${mission || "Supporting our community"}
Event: ${event_name}
Donor/Business: ${business_name}
Specific Ask: ${specific_ask}
Sender Name: ${sender_name}${signatureInfo}

Remember to respond with ONLY the JSON object containing all four versions.`

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY || "",
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2500,
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
    
    // Return all four tone versions
    return Response.json({
      professional: parsed.professional,
      friendly: parsed.friendly,
      enthusiastic: parsed.enthusiastic,
      parentToParent: parsed.parentToParent
    })

  } catch (error) {
    console.error("[v0] Generate email error:", error)
    return Response.json({ error: "Generation failed" }, { status: 500 })
  }
}
