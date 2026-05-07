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

    // Calculate total value
    const totalValue = (items || []).reduce(
      (sum: number, item: { snapshot_estimated_value: number | null }) =>
        sum + (item.snapshot_estimated_value || 0),
      0
    )

    // Format the receipt date
    const formattedDate = format(new Date(receipt.receipt_date), "MMMM d, yyyy")

    // Build the document
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            // Organization name header (centered, bold)
            new Paragraph({
              children: [
                new TextRun({
                  text: receipt.snapshot_org_name,
                  bold: true,
                  size: 32, // 16pt
                }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 100 },
            }),

            // "In-Kind Donation Receipt" subheader
            new Paragraph({
              children: [
                new TextRun({
                  text: "In-Kind Donation Receipt",
                  size: 24, // 12pt
                }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 400 },
            }),

            // Date line
            new Paragraph({
              children: [
                new TextRun({
                  text: `Date: ${formattedDate}`,
                  size: 22,
                }),
              ],
              spacing: { after: 200 },
            }),

            // Recipient info
            new Paragraph({
              children: [
                new TextRun({
                  text: "Received from:",
                  bold: true,
                  size: 22,
                }),
              ],
              spacing: { after: 100 },
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: receipt.snapshot_donor_name,
                  size: 22,
                }),
              ],
            }),
            ...(receipt.snapshot_business_name
              ? [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: receipt.snapshot_business_name,
                        size: 22,
                      }),
                    ],
                  }),
                ]
              : []),
            ...(receipt.snapshot_business_address
              ? [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: receipt.snapshot_business_address,
                        size: 22,
                      }),
                    ],
                  }),
                ]
              : []),
            ...(receipt.snapshot_contact_email
              ? [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: receipt.snapshot_contact_email,
                        size: 22,
                      }),
                    ],
                    spacing: { after: 300 },
                  }),
                ]
              : [
                  new Paragraph({
                    children: [],
                    spacing: { after: 300 },
                  }),
                ]),

            // Acknowledgment paragraph
            new Paragraph({
              children: [
                new TextRun({
                  text: `This letter acknowledges the generous in-kind donation received from ${receipt.snapshot_donor_name}${receipt.snapshot_business_name ? ` on behalf of ${receipt.snapshot_business_name}` : ""} on ${formattedDate}.`,
                  size: 22,
                }),
              ],
              spacing: { after: 300 },
            }),

            // Items header
            new Paragraph({
              children: [
                new TextRun({
                  text: "Items donated:",
                  bold: true,
                  size: 22,
                }),
              ],
              spacing: { after: 100 },
            }),

            // Item list
            ...(items || []).map(
              (item: {
                snapshot_item_name: string
                snapshot_estimated_value: number | null
              }) => {
                const valueStr = item.snapshot_estimated_value
                  ? ` (estimated value: $${item.snapshot_estimated_value.toLocaleString()})`
                  : ""
                return new Paragraph({
                  children: [
                    new TextRun({
                      text: `• ${item.snapshot_item_name}${valueStr}`,
                      size: 22,
                    }),
                  ],
                  indent: { left: 360 }, // 0.25 inch
                })
              }
            ),

            // Total value
            new Paragraph({
              children: [
                new TextRun({
                  text: `Total estimated value: $${totalValue.toLocaleString()}`,
                  bold: true,
                  size: 22,
                }),
              ],
              spacing: { before: 300, after: 300 },
            }),

            // No goods/services disclaimer
            new Paragraph({
              children: [
                new TextRun({
                  text: "No goods or services were provided in exchange for this donation.",
                  size: 22,
                  italics: true,
                }),
              ],
              spacing: { after: 400 },
            }),

            // Organization signature block
            new Paragraph({
              children: [
                new TextRun({
                  text: receipt.snapshot_org_name,
                  bold: true,
                  size: 22,
                }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: `EIN: ${receipt.snapshot_org_tax_id}`,
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
