#!/usr/bin/env python3
"""Generate B2B catalog PDFs (master + per-category) using close-up mockup
images and SEO category descriptions. Run from project root."""

import os, re, json
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor, white, black
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader

ROOT = os.path.abspath(os.path.dirname(__file__) + "/..")
ASSETS = os.path.join(ROOT, "src/assets/products")
OUT_DIR = os.path.join(ROOT, "public/catalogs")
os.makedirs(OUT_DIR, exist_ok=True)

# Brand palette
BG = HexColor("#0E0E10")
INK = HexColor("#111111")
PAPER = HexColor("#F7F4EE")
ACCENT = HexColor("#B08854")
MUTED = HexColor("#6B6B6B")
LINE = HexColor("#D9D2C4")

PAGE_W, PAGE_H = A4

# --- Categories: slug -> images (mix all + close-ups), seo data ---
def imgs(slug, extras=()):
    files = []
    for i in range(1, 9):
        p = f"{ASSETS}/{slug}-{i}.jpg"
        if os.path.exists(p): files.append(p)
    for tag in extras:
        for i in range(1, 9):
            p = f"{ASSETS}/{slug}-{tag}-{i}.jpg"
            if os.path.exists(p): files.append(p)
    return files

CATS = [
    {
        "slug": "bavarian", "name": "Bavarian Wear",
        "tag": "Lederhosen · Dirndl · Trachten",
        "title": "Bavarian Wear — Lederhosen, Dirndl & Trachten",
        "intro": "Authentic European trachten produced at our Sialkot atelier for Oktoberfest retailers, alpine boutiques and trachten chains across Germany, Austria, Switzerland and the United States. Genuine deer suede, hand-embroidered florals, antique alpine hardware and made-to-measure sizing — at wholesale MOQs starting from 50 sets.",
        "markets": "Germany · Austria · Switzerland · USA · Italy",
        "products": [
            ("Heritage Lederhosen Set", "Genuine 1.2 mm deer suede · hand-embroidered floral yoke · antique deer-horn buttons · EU 44–60", "from $58.00 FOB"),
            ("Alpine Dirndl Dress", "Cotton-linen bodice · printed apron · custom lace trim · EU 34–46", "from $32.00 FOB"),
            ("Trachten Vest & Shirt", "Wool-blend vest · pleated linen shirt · hand-stitched silver buttons", "from $24.00 FOB"),
            ("Kids Lederhosen Outfit", "Soft cowhide suede · braided H-strap · age 2–14", "from $22.00 FOB"),
        ],
        "files": imgs("bavarian", ("cu", "detail")),
    },
    {
        "slug": "leatherwear", "name": "Leatherwear", "imgslug": "leather",
        "tag": "Lambskin · Cowhide · Suede",
        "title": "Leather Garments — Jackets, Vests & Outerwear",
        "intro": "Three generations of Sialkot leatherworking, applied to premium fashion outerwear, biker jackets, bombers, vests and skirts. We work with lambskin, cowhide nappa, sheep nappa and genuine suede from LWG-rated tanneries — built for fashion houses, motorcycle brands and private-label boutiques across the USA, EU, UK and the Gulf.",
        "markets": "USA · UK · Germany · Italy · UAE · Canada",
        "products": [
            ("Classic Biker Jacket", "0.9 mm lambskin nappa · YKK Excella · viscose-twill lining", "from $74.00 FOB"),
            ("Napa Moto Jacket — Women", "Sheep nappa · asymmetric zip · waist belt · XS–3XL", "from $69.00 FOB"),
            ("Leather Trousers", "Goatskin nappa · slim straight · stretch-lined waistband", "from $54.00 FOB"),
            ("Leather Bomber Jacket", "Cowhide aniline · ribbed knit cuffs · quilted lining", "from $78.00 FOB"),
        ],
        "files": imgs("leather", ("cu", "detail")),
    },
    {
        "slug": "sportswear", "name": "Sportswear",
        "tag": "Sublimated Jerseys · Tracksuits · Gym Wear",
        "title": "Sportswear — Sublimated Jerseys, Tracksuits & Gym Wear",
        "intro": "Sialkot's sportswear heritage applied to modern teamwear, performance training kits and gym apparel. In-house dye-sublimation, recycled polyester knits, four-way stretch and bonded seams — engineered for sports brands, e-commerce activewear labels and clubs across the USA, UK, UAE, Australia and the EU.",
        "markets": "USA · UK · Australia · UAE · Germany · France",
        "products": [
            ("Pro Sublimated Soccer Kit", "160 GSM micro-mesh · full dye-sub · unlimited print colors", "from $14.00 FOB"),
            ("Performance Tracksuit", "Tricot polyester · bonded zip pockets · taped seams", "from $19.00 FOB"),
            ("Compression Training Set", "Recycled poly-elastane · flatlock · four-way stretch", "from $16.00 FOB"),
            ("Basketball Uniform Set", "Reversible mesh · heat-pressed numbers · NBA-spec fit", "from $15.00 FOB"),
        ],
        "files": imgs("sportswear", ("detail",)),
    },
    {
        "slug": "streetwear", "name": "Streetwear",
        "tag": "Heavyweight Hoodies · Oversized Tees",
        "title": "Streetwear — Heavyweight Hoodies & Oversized Tees",
        "intro": "A dedicated streetwear program for emerging fashion labels and established drops — 320–500 GSM heavyweight fleece, garment dye, acid wash, puff print, 3D embroidery and applique. Built for streetwear brands, influencer drops and private-label retailers across the USA, UK, Canada, Germany and Australia.",
        "markets": "USA · UK · Canada · Germany · Australia",
        "products": [
            ("Heavyweight Oversized Hoodie", "420 GSM brushed fleece · garment-dye · puff print", "from $17.50 FOB"),
            ("Boxy Heavyweight Tee", "240 GSM combed cotton · drop shoulder · garment wash", "from $7.00 FOB"),
            ("Cargo Pants", "Brushed twill · utility pockets · drawstring hem", "from $14.00 FOB"),
            ("Varsity Letterman Jacket", "Melton wool body · leather sleeves · chenille patches", "from $46.00 FOB"),
        ],
        "files": imgs("streetwear", ("detail",)),
    },
    {
        "slug": "leisurewear", "name": "Leisurewear", "imgslug": "leisure",
        "tag": "Loungewear · Athleisure · Resort",
        "title": "Leisurewear — Loungewear, Athleisure & Resort Sets",
        "intro": "Soft-hand loungewear, athleisure sets and resort co-ords for DTC lounge brands, hotel boutiques and lifestyle retailers. French terry, modal jersey, bamboo viscose and recycled cotton — built for the USA, UK, EU, UAE, Australia and GCC resort markets with full private-label and packaging support.",
        "markets": "USA · UK · UAE · Saudi Arabia · Australia · France",
        "products": [
            ("Cashmere Blend Lounge Set", "Wool-cashmere knit · ribbed cuffs · luxurious hand", "from $42.00 FOB"),
            ("Organic Cotton Joggers & Crew", "GOTS organic cotton · 280 GSM French terry", "from $18.00 FOB"),
            ("Bamboo Tee & Shorts Set", "Bamboo viscose jersey · thermo-regulating · OEKO-TEX", "from $14.00 FOB"),
            ("Knit Cardigan & Pant", "Cotton-linen knit · open front · easy fit", "from $26.00 FOB"),
        ],
        "files": imgs("leisure", ("detail",)),
    },
    {
        "slug": "nightwear", "name": "Nightwear",
        "tag": "Silk · Satin · Cotton Pyjamas",
        "title": "Nightwear — Silk, Satin & Cotton Pyjamas",
        "intro": "Luxury sleepwear and intimate loungewear produced for boutique lingerie brands, bridal stores and hotel retail across the USA, UK, EU, UAE and Australia. Mulberry silk, French satin, brushed cotton and bamboo — finished with French seams, custom lace trims and signature packaging.",
        "markets": "USA · UK · France · UAE · Australia · Italy",
        "products": [
            ("Mulberry Silk Pajama Set", "22 momme grade-6A mulberry silk · piped trim · French seams", "from $48.00 FOB"),
            ("Lace-Trim Modal Slip", "Modal jersey · stretch lace · adjustable straps", "from $14.00 FOB"),
            ("Brushed Cotton Pajama", "180 GSM brushed cotton · contrast piping · button-front", "from $16.00 FOB"),
            ("Satin Robe", "Heavyweight charmeuse satin · self-tie · monogram-ready", "from $19.00 FOB"),
        ],
        "files": imgs("nightwear", ("detail",)),
    },
]

# ---------- helpers ----------
def wrap(c, text, font, size, max_w):
    c.setFont(font, size)
    words = text.split()
    lines, cur = [], ""
    for w in words:
        test = (cur + " " + w).strip()
        if c.stringWidth(test, font, size) <= max_w:
            cur = test
        else:
            if cur: lines.append(cur)
            cur = w
    if cur: lines.append(cur)
    return lines

def draw_text(c, x, y, lines, font, size, color, leading=None):
    c.setFillColor(color); c.setFont(font, size)
    lh = leading or size * 1.32
    for ln in lines:
        c.drawString(x, y, ln); y -= lh
    return y

def draw_image_fit(c, path, x, y, w, h):
    """Cover-fit an image inside (x,y,w,h)."""
    img = ImageReader(path)
    iw, ih = img.getSize()
    ratio = max(w / iw, h / ih)
    nw, nh = iw * ratio, ih * ratio
    # clip
    c.saveState()
    p = c.beginPath(); p.rect(x, y, w, h); c.clipPath(p, stroke=0, fill=0)
    c.drawImage(img, x - (nw - w) / 2, y - (nh - h) / 2, nw, nh, mask='auto')
    c.restoreState()

def footer(c, page_no, total=None):
    c.setStrokeColor(LINE); c.setLineWidth(0.4)
    c.line(20*mm, 14*mm, PAGE_W - 20*mm, 14*mm)
    c.setFont("Helvetica", 8); c.setFillColor(MUTED)
    c.drawString(20*mm, 9*mm, "IRHA APPARELS  ·  Sialkot, Pakistan  ·  hello@irhaapparels.com  ·  irhaapparels.com")
    label = f"{page_no}" + (f" / {total}" if total else "")
    c.drawRightString(PAGE_W - 20*mm, 9*mm, label)

def cover(c, title_main, subtitle, cover_img):
    c.setFillColor(BG); c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    if cover_img and os.path.exists(cover_img):
        draw_image_fit(c, 0, PAGE_H * 0.42, PAGE_W, PAGE_H * 0.58)
        # gradient-ish overlay
        c.setFillColorRGB(0.055, 0.055, 0.063, alpha=0.55)
        c.rect(0, PAGE_H * 0.42, PAGE_W, PAGE_H * 0.58, fill=1, stroke=0)
    # Brand mark
    c.setFillColor(PAPER); c.setFont("Helvetica-Bold", 9)
    c.drawString(20*mm, PAGE_H - 20*mm, "IRHA  APPARELS")
    c.setFillColor(ACCENT); c.setFont("Helvetica", 8)
    c.drawString(20*mm, PAGE_H - 25*mm, "WHOLESALE B2B CATALOGUE  ·  2026")
    # Title
    y = PAGE_H * 0.30
    c.setFillColor(PAPER); c.setFont("Helvetica-Bold", 30)
    for ln in wrap(c, title_main, "Helvetica-Bold", 30, PAGE_W - 40*mm):
        c.drawString(20*mm, y, ln); y -= 36
    c.setFillColor(ACCENT); c.setFont("Helvetica", 11)
    c.drawString(20*mm, y - 6, subtitle)
    # Footer strip
    c.setFillColor(ACCENT); c.rect(0, 0, PAGE_W, 4, fill=1, stroke=0)
    c.showPage()

def intro_page(c, cat):
    c.setFillColor(PAPER); c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    c.setFillColor(ACCENT); c.setFont("Helvetica-Bold", 8)
    c.drawString(20*mm, PAGE_H - 22*mm, cat["tag"].upper())
    c.setFillColor(INK); c.setFont("Helvetica-Bold", 22)
    y = PAGE_H - 32*mm
    for ln in wrap(c, cat["title"], "Helvetica-Bold", 22, PAGE_W - 40*mm):
        c.drawString(20*mm, y, ln); y -= 26
    y -= 4
    c.setStrokeColor(ACCENT); c.setLineWidth(1.2)
    c.line(20*mm, y, 50*mm, y); y -= 14
    lines = wrap(c, cat["intro"], "Helvetica", 10.5, PAGE_W - 40*mm)
    y = draw_text(c, 20*mm, y, lines, "Helvetica", 10.5, INK, leading=15)
    y -= 6
    c.setFillColor(MUTED); c.setFont("Helvetica-Oblique", 9)
    c.drawString(20*mm, y, f"Export markets: {cat['markets']}")
    # Lead image (big mockup) below
    if cat["files"]:
        img_y = 18*mm
        img_h = y - 22*mm
        if img_h > 60*mm:
            draw_image_fit(c, 20*mm, img_y, PAGE_W - 40*mm, img_h - 6*mm, )
    return

def gallery_page(c, cat, files, page_label):
    c.setFillColor(white); c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    # Header
    c.setFillColor(ACCENT); c.setFont("Helvetica-Bold", 8)
    c.drawString(20*mm, PAGE_H - 18*mm, cat["name"].upper())
    c.setFillColor(INK); c.setFont("Helvetica", 8)
    c.drawRightString(PAGE_W - 20*mm, PAGE_H - 18*mm, page_label)
    c.setStrokeColor(LINE); c.line(20*mm, PAGE_H - 21*mm, PAGE_W - 20*mm, PAGE_H - 21*mm)

    # 2x3 grid
    cols, rows = 2, 3
    gx, gy = 20*mm, 18*mm
    gw = PAGE_W - 40*mm
    gh = PAGE_H - 21*mm - gy - 4*mm
    gap = 5*mm
    cw = (gw - gap * (cols - 1)) / cols
    ch = (gh - gap * (rows - 1)) / rows
    for i, f in enumerate(files[:cols * rows]):
        col = i % cols; row = i // cols
        x = gx + col * (cw + gap)
        y = gy + gh - (row + 1) * ch - row * gap
        # frame
        c.setFillColor(HexColor("#F2EFE9"))
        c.rect(x, y, cw, ch, fill=1, stroke=0)
        draw_image_fit(c, x, y, cw, ch)
        c.setStrokeColor(LINE); c.setLineWidth(0.3)
        c.rect(x, y, cw, ch, fill=0, stroke=1)

def products_page(c, cat):
    c.setFillColor(PAPER); c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    c.setFillColor(ACCENT); c.setFont("Helvetica-Bold", 8)
    c.drawString(20*mm, PAGE_H - 18*mm, f"{cat['name'].upper()}  ·  KEY STYLES")
    c.setStrokeColor(LINE); c.line(20*mm, PAGE_H - 21*mm, PAGE_W - 20*mm, PAGE_H - 21*mm)

    files = cat["files"]
    rows = cat["products"]
    # 2 columns of product cards
    cols = 2
    gx = 20*mm; gy = 20*mm
    gw = PAGE_W - 40*mm
    gh = PAGE_H - 21*mm - gy - 4*mm
    gap = 6*mm
    cw = (gw - gap) / cols
    ch = (gh - gap) / 2
    for i, (name, desc, price) in enumerate(rows[:4]):
        col = i % cols; row = i // cols
        x = gx + col * (cw + gap)
        y = gy + gh - (row + 1) * ch - row * gap
        # image (top 62%)
        ih = ch * 0.62
        if i < len(files):
            draw_image_fit(c, x, y + ch - ih, cw, ih)
        # text panel
        ty = y + ch - ih - 5
        c.setFillColor(INK); c.setFont("Helvetica-Bold", 11)
        c.drawString(x + 4, ty, name); ty -= 14
        for ln in wrap(c, desc, "Helvetica", 8.5, cw - 8)[:3]:
            c.setFillColor(MUTED); c.setFont("Helvetica", 8.5)
            c.drawString(x + 4, ty, ln); ty -= 11
        c.setFillColor(ACCENT); c.setFont("Helvetica-Bold", 9)
        c.drawString(x + 4, ty - 2, price)
        # frame
        c.setStrokeColor(LINE); c.setLineWidth(0.3)
        c.rect(x, y, cw, ch, fill=0, stroke=1)

def capabilities_page(c):
    c.setFillColor(BG); c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    c.setFillColor(ACCENT); c.setFont("Helvetica-Bold", 8)
    c.drawString(20*mm, PAGE_H - 22*mm, "CAPABILITIES  ·  COMPLIANCE  ·  TERMS")
    c.setFillColor(PAPER); c.setFont("Helvetica-Bold", 22)
    c.drawString(20*mm, PAGE_H - 34*mm, "Why brands manufacture with Irha")
    blocks = [
        ("MOQ", "From 50 sets per design and colorway across all categories. Start-Up Program available for emerging brands."),
        ("LEAD TIME", "25–35 days sportswear · 30–45 days streetwear & loungewear · 45–70 days leather · 45–60 days trachten."),
        ("FABRICS", "GRS recycled polyester · GOTS organic cotton · 22-momme mulberry silk · LWG-rated leather · OEKO-TEX 100 across all programs."),
        ("PRINT & FINISH", "Dye-sublimation · puff & plastisol print · 3D embroidery · garment dye · acid wash · stone wash — all in-house."),
        ("COMPLIANCE", "REACH Annex XVII · CPSIA · BSCI audit · ISO 9001 quality · CITES paperwork on leather shipments."),
        ("SHIPPING", "FOB Karachi default. DDP shipping available to USA, UK, EU, UAE, Australia and GCC. Air-freight upgrades on request."),
        ("PAYMENT", "30% T/T advance + 70% against B/L copy. L/C at sight accepted from $50,000."),
        ("PRIVATE LABEL", "Custom woven labels, hangtags, polybags, kraft boxes, branded mailers and tissue — all sourced in-house."),
    ]
    y = PAGE_H - 50*mm
    for label, body in blocks:
        c.setFillColor(ACCENT); c.setFont("Helvetica-Bold", 9)
        c.drawString(20*mm, y, label)
        c.setFillColor(PAPER); c.setFont("Helvetica", 9.5)
        lines = wrap(c, body, "Helvetica", 9.5, PAGE_W - 60*mm)
        for ln in lines:
            c.drawString(50*mm, y, ln); y -= 12
        y -= 4

def contact_page(c):
    c.setFillColor(PAPER); c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    c.setFillColor(ACCENT); c.rect(0, PAGE_H - 4, PAGE_W, 4, fill=1, stroke=0)
    c.setFillColor(ACCENT); c.setFont("Helvetica-Bold", 8)
    c.drawString(20*mm, PAGE_H - 25*mm, "REQUEST A QUOTATION")
    c.setFillColor(INK); c.setFont("Helvetica-Bold", 28)
    c.drawString(20*mm, PAGE_H - 40*mm, "Let's build your next collection.")
    c.setFillColor(MUTED); c.setFont("Helvetica", 11)
    intro = "Share your tech pack, reference sample or mood board — we will reply within one business day with a counter-sample plan, costing, lead time and freight quote."
    y = PAGE_H - 55*mm
    for ln in wrap(c, intro, "Helvetica", 11, PAGE_W - 40*mm):
        c.drawString(20*mm, y, ln); y -= 16
    y -= 6
    fields = [
        ("EMAIL", "hello@irhaapparels.com"),
        ("WHATSAPP", "+92 300 000 0000"),
        ("WEB", "www.irhaapparels.com"),
        ("ATELIER", "Sialkot Industrial Estate, Punjab, Pakistan"),
        ("INCOTERMS", "FOB Karachi · CIF · DDP on request"),
    ]
    for k, v in fields:
        c.setFillColor(ACCENT); c.setFont("Helvetica-Bold", 9)
        c.drawString(20*mm, y, k)
        c.setFillColor(INK); c.setFont("Helvetica", 11)
        c.drawString(50*mm, y, v); y -= 16

# ---------- build per-category ----------
def build_category_pdf(cat, path):
    c = canvas.Canvas(path, pagesize=A4)
    cover_img = (cat["files"][0] if cat["files"] else None)
    cover(c, cat["title"], "Wholesale B2B Catalogue  ·  2026", cover_img)
    page = 1
    intro_page(c, cat); footer(c, page+1); c.showPage(); page += 1
    # Gallery pages: use all close-ups + mockups, 6 per page
    files = list(cat["files"])
    # Push close-ups (cu-*) first if present
    files.sort(key=lambda p: (0 if "-cu-" in p else (1 if "-detail-" in p else 2), p))
    per = 6
    total_gal = (len(files) + per - 1) // per
    for gi in range(total_gal):
        chunk = files[gi*per:(gi+1)*per]
        gallery_page(c, cat, chunk, f"Mockups  ·  {gi+1}/{total_gal}")
        footer(c, page+1); c.showPage(); page += 1
    products_page(c, cat); footer(c, page+1); c.showPage(); page += 1
    contact_page(c); footer(c, page+1); c.showPage()
    c.save()

# ---------- build master ----------
def build_master(path):
    c = canvas.Canvas(path, pagesize=A4)
    cover(c, "Irha Apparels — Wholesale B2B Catalogue 2026",
          "Bavarian  ·  Leatherwear  ·  Sportswear  ·  Streetwear  ·  Leisure  ·  Nightwear",
          CATS[0]["files"][0] if CATS[0]["files"] else None)
    page = 1
    # Index page
    c.setFillColor(PAPER); c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    c.setFillColor(ACCENT); c.setFont("Helvetica-Bold", 8)
    c.drawString(20*mm, PAGE_H - 22*mm, "CONTENTS")
    c.setFillColor(INK); c.setFont("Helvetica-Bold", 22)
    c.drawString(20*mm, PAGE_H - 32*mm, "Six divisions. One atelier.")
    y = PAGE_H - 50*mm
    for i, cat in enumerate(CATS, 1):
        c.setFillColor(ACCENT); c.setFont("Helvetica-Bold", 10)
        c.drawString(20*mm, y, f"{i:02d}")
        c.setFillColor(INK); c.setFont("Helvetica-Bold", 12)
        c.drawString(32*mm, y, cat["name"])
        c.setFillColor(MUTED); c.setFont("Helvetica", 10)
        c.drawString(80*mm, y, cat["tag"])
        c.setStrokeColor(LINE); c.setLineWidth(0.3)
        c.line(20*mm, y - 4, PAGE_W - 20*mm, y - 4)
        y -= 14
    footer(c, page+1); c.showPage(); page += 1
    for cat in CATS:
        intro_page(c, cat); footer(c, page+1); c.showPage(); page += 1
        files = list(cat["files"])
        files.sort(key=lambda p: (0 if "-cu-" in p else (1 if "-detail-" in p else 2), p))
        # 1 gallery page (6 thumbs) in master to keep length reasonable
        gallery_page(c, cat, files[:6], "Mockups")
        footer(c, page+1); c.showPage(); page += 1
        products_page(c, cat); footer(c, page+1); c.showPage(); page += 1
    capabilities_page(c); footer(c, page+1); c.showPage(); page += 1
    contact_page(c); footer(c, page+1); c.showPage()
    c.save()

# ---------- run ----------
if __name__ == "__main__":
    slug_to_file = {
        "bavarian": "bavarian-catalog.pdf",
        "leatherwear": "leatherwear-catalog.pdf",
        "sportswear": "sportswear-catalog.pdf",
        "streetwear": "streetwear-catalog.pdf",
        "leisurewear": "leisurewear-catalog.pdf",
        "nightwear": "nightwear-catalog.pdf",
    }
    for cat in CATS:
        out = os.path.join(OUT_DIR, slug_to_file[cat["slug"]])
        build_category_pdf(cat, out)
        print("wrote", out, os.path.getsize(out))
    master = os.path.join(OUT_DIR, "master-catalogue-2026.pdf")
    build_master(master)
    print("wrote", master, os.path.getsize(master))
    # Mirror master to /public root
    import shutil
    shutil.copyfile(master, os.path.join(ROOT, "public/Irha-Apparels-Catalog-2026.pdf"))
    print("mirrored to public/Irha-Apparels-Catalog-2026.pdf")
