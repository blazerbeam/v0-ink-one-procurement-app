import { generateText, Output } from "ai"
import { z } from "zod"

export async function POST(req: Request) {
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

Organization: ${org_name}
Mission: ${mission || "Supporting our community"}
Event: ${event_name}
Donor/Business: ${business_name}
Specific Ask: ${specific_ask}
Sender Name: ${sender_name}
Tone: ${tone}

Tone guidance:
- Professional: formal, respectful, brief
- Friendly: warm, conversational, community-focused  
- Enthusiastic: energetic, passionate about the cause
- Parent-to-Parent: personal, peer-to-peer, 'we're all in this together' feel

Write a compelling email with a clear subject line and body. The email should be concise but heartfelt.`

  const result = await generateText({
    model: "anthropic/claude-sonnet-4-20250514",
    prompt: systemPrompt,
    output: Output.object({
      schema: z.object({
        subject: z.string().describe("The email subject line"),
        body: z.string().describe("The full email body"),
      }),
    }),
  })

  return Response.json(result.object)
}
