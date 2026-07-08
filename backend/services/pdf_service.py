import io
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from datetime import datetime

def generate_invoice_pdf(invoice_data, order_data, items_with_products, branch_name) -> bytes:
    """
    Generates a PDF invoice dynamically and returns it as bytes.
    invoice_data: dict/object with invoice details (number, date, subtotal, gst_rate, gst_amount, total_amount)
    order_data: dict/object with order details (payment_method, status)
    items_with_products: list of tuples/dicts [(product_name, quantity, unit_price, total_price)]
    branch_name: str name of the branch
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40
    )
    
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'InvoiceTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        textColor=colors.HexColor('#0F172A') # slate-900
    )
    
    subtitle_style = ParagraphStyle(
        'InvoiceSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#64748B') # slate-500
    )
    
    header_right_style = ParagraphStyle(
        'HeaderRight',
        parent=styles['Normal'],
        alignment=2, # Right alignment
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#334155') # slate-700
    )

    cell_style = ParagraphStyle(
        'Cell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor('#0F172A')
    )

    cell_bold_style = ParagraphStyle(
        'CellBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor('#0F172A')
    )

    cell_right_style = ParagraphStyle(
        'CellRight',
        parent=styles['Normal'],
        alignment=2,
        fontName='Helvetica',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor('#0F172A')
    )

    cell_right_bold_style = ParagraphStyle(
        'CellRightBold',
        parent=styles['Normal'],
        alignment=2,
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor('#0F172A')
    )
    
    story = []
    
    # 1. Header Table (Company Info & Invoice Meta)
    header_left_text = f"<b>{branch_name}</b><br/>AI Business OS Enterprise<br/>GSTIN: 27AAAAA1111A1Z1<br/>support@businessos.ai"
    invoice_date_str = invoice_data.date.strftime("%Y-%m-%d %H:%M") if hasattr(invoice_data, 'date') and isinstance(invoice_data.date, datetime) else str(invoice_data.get('date', datetime.utcnow()))
    
    invoice_num = getattr(invoice_data, 'invoice_number', invoice_data.get('invoice_number', 'INV-UNKNOWN'))
    header_right_text = f"<font size=16 color='#0F172A'><b>INVOICE</b></font><br/><br/><b>Invoice #:</b> {invoice_num}<br/><b>Date:</b> {invoice_date_str}<br/><b>Payment:</b> {getattr(order_data, 'payment_method', order_data.get('payment_method', 'CASH'))} ({getattr(order_data, 'payment_status', order_data.get('payment_status', 'PENDING'))})"
    
    header_table_data = [
        [Paragraph(header_left_text, subtitle_style), Paragraph(header_right_text, header_right_style)]
    ]
    
    header_table = Table(header_table_data, colWidths=[3.5*inch, 3.5*inch])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 10),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 15))
    
    # Divider
    divider = Table([[""]], colWidths=[7.0*inch])
    divider.setStyle(TableStyle([
        ('LINEABOVE', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
        ('BOTTOMPADDING', (0,0), (-1,-1), 0),
        ('TOPPADDING', (0,0), (-1,-1), 0),
    ]))
    story.append(divider)
    story.append(Spacer(1, 15))
    
    # 2. Items Table
    # Table headers
    table_data = [
        [
            Paragraph("<b>#</b>", cell_bold_style),
            Paragraph("<b>Product / Item</b>", cell_bold_style),
            Paragraph("<b>Qty</b>", cell_right_bold_style),
            Paragraph("<b>Unit Price</b>", cell_right_bold_style),
            Paragraph("<b>Amount</b>", cell_right_bold_style)
        ]
    ]
    
    for i, item in enumerate(items_with_products):
        p_name = item.get('product_name') if isinstance(item, dict) else item[0]
        qty = item.get('quantity') if isinstance(item, dict) else item[1]
        price = item.get('unit_price') if isinstance(item, dict) else item[2]
        amount = qty * price
        
        table_data.append([
            Paragraph(str(i + 1), cell_style),
            Paragraph(p_name, cell_style),
            Paragraph(str(qty), cell_right_style),
            Paragraph(f"${price:.2f}", cell_right_style),
            Paragraph(f"${amount:.2f}", cell_right_style),
        ])
        
    # Table styling
    items_table = Table(table_data, colWidths=[0.4*inch, 3.6*inch, 0.8*inch, 1.1*inch, 1.1*inch])
    items_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#F8FAFC')),
        ('LINEBELOW', (0,0), (-1,0), 1, colors.HexColor('#E2E8F0')),
        ('LINEBELOW', (0,1), (-1,-1), 0.5, colors.HexColor('#F1F5F9')),
    ]))
    story.append(items_table)
    story.append(Spacer(1, 15))
    
    # 3. Summary & GST Info Table
    subtotal = getattr(invoice_data, 'subtotal', invoice_data.get('subtotal', 0.0))
    gst_rate = getattr(invoice_data, 'gst_rate', invoice_data.get('gst_rate', 18.0))
    gst_amount = getattr(invoice_data, 'gst_amount', invoice_data.get('gst_amount', 0.0))
    total_amount = getattr(invoice_data, 'total_amount', invoice_data.get('total_amount', 0.0))
    
    summary_data = [
        [Paragraph("", cell_style), Paragraph("Subtotal", cell_bold_style), Paragraph(f"${subtotal:.2f}", cell_right_style)],
        [Paragraph("", cell_style), Paragraph(f"GST ({gst_rate}%)", cell_bold_style), Paragraph(f"${gst_amount:.2f}", cell_right_style)],
        [Paragraph("", cell_style), Paragraph("Total Amount", cell_bold_style), Paragraph(f"${total_amount:.2f}", cell_right_bold_style)],
    ]
    
    summary_table = Table(summary_data, colWidths=[4.0*inch, 1.7*inch, 1.3*inch])
    summary_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('LINEABOVE', (1,2), (2,2), 1, colors.HexColor('#0F172A')), # Line above Total
    ]))
    story.append(summary_table)
    story.append(Spacer(1, 40))
    
    # 4. Footer Note
    footer_text = "<para align=center>Thank you for doing business with us!<br/><font size=8 color='#94A3B8'>Generated by AI Business OS. This is a system-generated invoice.</font></para>"
    footer_style = ParagraphStyle(
        'FooterStyle',
        parent=styles['Normal'],
        alignment=1,
        fontName='Helvetica-Oblique',
        fontSize=9,
        textColor=colors.HexColor('#64748B')
    )
    story.append(Paragraph(footer_text, footer_style))
    
    doc.build(story)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes
