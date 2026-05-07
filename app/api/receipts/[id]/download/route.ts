import { NextRequest, NextResponse } from "next/server"
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
} from "docx"
import { createClient } from "@/lib/supabase/server"
import { format } from "date-fns"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const supabase = await createClient()

    // Get current authenticated user for signature
    const { data: { user } } = await supabase.auth.getUser()
    const signerName = user?.user_metadata?.full_name || user?.email || "Authorized Representative"

    // Fetch receipt with items
    const { data: receipt, error: receiptError } = await supabase
      .from("receipts")
      .select("*")
      .eq("id", id)
      .single()

    if (receiptError || !receipt) {
      return NextResponse.json(
        { error: "Receipt not found" },
        { status: 404 }
      )
    }

    const { data: items, error: itemsError } = await supabase
      .from("receipt_items")
      .select("*")
      .eq("receipt_id", id)
      .order("created_at", { ascending: true })

    if (itemsError) {
      return NextResponse.json(
        { error: "Failed to fetch receipt items" },
        { status: 500 }
      )
    }

    // Format the receipt date as M/D/YYYY
    const formattedDate = format(new Date(receipt.receipt_date), "M/d/yyyy")

    // Build the document with exact spec format
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            // Organization name header (centered, bold, larger font - Heading 1)
            new Paragraph({
              children: [
                new TextRun({
                  text: receipt.snapshot_org_name,
                  bold: true,
                  size: 36, // 18pt
                }),
              ],
              heading: HeadingLevel.HEADING_1,
              alignment: AlignmentType.CENTER,
              spacing: { after: 120 },
            }),

            // "In-Kind Donation Receipt" subheader (centered, smaller, gray - Heading 3)
            new Paragraph({
              children: [
                new TextRun({
                  text: "In-Kind Donation Receipt",
                  size: 22, // 11pt
                  color: "666666",
                }),
              ],
              heading: HeadingLevel.HEADING_3,
              alignment: AlignmentType.CENTER,
              spacing: { after: 400 },
            }),

            // Blank line
            new Paragraph({ children: [] }),

            // Date line
            new Paragraph({
              children: [
                new TextRun({
                  text: `Date: ${formattedDate}`,
                  size: 22,
                }),
              ],
              spacing: { after: 400 },
            }),

            // Blank line
            new Paragraph({ children: [] }),

            // Donor info
            new Paragraph({
              children: [
                new TextRun({
                  text: `Donor Name: ${receipt.snapshot_donor_name}`,
                  size: 22,
                }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: `Business Name (if applicable): ${receipt.snapshot_business_name || ""}`,
                  size: 22,
                }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: `Address: ${receipt.snapshot_business_address || ""}`,
                  size: 22,
                }),
              ],
            }),

            // Blank line
            new Paragraph({ children: [] }),

            new Paragraph({
              children: [
                new TextRun({
                  text: `Email: ${receipt.snapshot_contact_email || ""}`,
                  size: 22,
                }),
              ],
              spacing: { after: 400 },
            }),

            // Blank line
            new Paragraph({ children: [] }),

            // Thank you paragraph with tax info
            new Paragraph({
              children: [
                new TextRun({
                  text: `Thank you for your generous in-kind donation to the ${receipt.snapshot_org_name}, a 501(c)(3) charitable organization. Tax ID: ${receipt.snapshot_org_tax_id}. This letter serves as your record for tax purposes. ${receipt.snapshot_org_name} did not provide any goods or services in exchange for this donation.`,
                  size: 22,
                }),
              ],
              spacing: { after: 400 },
            }),

            // Blank line
            new Paragraph({ children: [] }),

            // Items header
            new Paragraph({
              children: [
                new TextRun({
                  text: "Description of Donated Item(s):",
                  size: 22,
                }),
              ],
              spacing: { after: 200 },
            }),

            // Blank line
            new Paragraph({ children: [] }),

            // Item list - NO dollar values, just names
            ...(items || []).map(
              (item: { snapshot_item_name: string }) => {
                return new Paragraph({
                  children: [
                    new TextRun({
                      text: `- ${item.snapshot_item_name}`,
                      size: 22,
                    }),
                  ],
                })
              }
            ),

            // Blank line
            new Paragraph({ children: [], spacing: { after: 400 } }),

            // Sincerely
            new Paragraph({
              children: [
                new TextRun({
                  text: "Sincerely,",
                  size: 22,
                }),
              ],
              spacing: { after: 400 },
            }),

            // Blank line for signature space
            new Paragraph({ children: [] }),

            // Signer name
            new Paragraph({
              children: [
                new TextRun({
                  text: signerName,
                  size: 22,
                }),
              ],
            }),

            // Organization name
            new Paragraph({
              children: [
                new TextRun({
                  text: receipt.snapshot_org_name,
                  size: 22,
                }),
              ],
            }),
          ],
        },
      ],
    })

    // Generate the document buffer
    const buffer = await Packer.toBuffer(doc)

    // Generate filename
    const safeBusinessName = receipt.snapshot_business_name
      .replace(/[^a-zA-Z0-9]/g, "_")
      .substring(0, 30)
    const dateStr = format(new Date(receipt.receipt_date), "yyyy-MM-dd")
    const filename = `InKind_Receipt_${safeBusinessName}_${dateStr}.docx`

    // Return the document
    return new NextResponse(buffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error("Error generating receipt document:", error)
    return NextResponse.json(
      { error: "Failed to generate receipt document" },
      { status: 500 }
    )
  }
}
