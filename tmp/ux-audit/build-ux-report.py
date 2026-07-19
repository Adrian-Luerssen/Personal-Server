from __future__ import annotations

import json
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    Image,
    KeepTogether,
    ListFlowable,
    ListItem,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path.cwd()
ASSET_DIR = ROOT / "output" / "pdf" / "ux-audit-assets"
RESULTS_PATH = ASSET_DIR / "audit-results.json"
PDF_PATH = ROOT / "output" / "pdf" / "personal-server-ux-ui-audit-2026-07-01.pdf"
MD_PATH = ROOT / "output" / "pdf" / "personal-server-ux-ui-audit-2026-07-01.md"


def load_results():
    return json.loads(RESULTS_PATH.read_text(encoding="utf-8"))


def clean(text):
    if text is None:
        return ""
    return (
        str(text)
        .replace("\u2014", "-")
        .replace("\u2013", "-")
        .replace("\u2011", "-")
        .replace("\u2026", "...")
        .replace("\u20ac", "EUR ")
    )


def para(text, style):
    return Paragraph(clean(text), style)


def bullet_list(items, styles):
    return ListFlowable(
        [ListItem(para(item, styles["Body"]), leftIndent=12) for item in items],
        bulletType="bullet",
        start="disc",
        leftIndent=16,
        bulletFontName="Helvetica",
        bulletFontSize=8,
    )


def page_number(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(colors.HexColor("#6b7280"))
    canvas.drawString(0.62 * inch, 0.42 * inch, "Personal Server UX/UI audit")
    canvas.drawRightString(A4[0] - 0.62 * inch, 0.42 * inch, f"Page {doc.page}")
    canvas.restoreState()


def image_flowable(filename, width=5.6 * inch):
    path = ASSET_DIR / filename
    if not path.exists():
        return para(f"Missing screenshot: {filename}", STYLES["Body"])
    img = Image(str(path))
    ratio = img.imageHeight / img.imageWidth
    img.drawWidth = width
    img.drawHeight = width * ratio
    max_height = 5.9 * inch
    if img.drawHeight > max_height:
        img.drawHeight = max_height
        img.drawWidth = max_height / ratio
    return img


def make_styles():
    base = getSampleStyleSheet()
    styles = {
        "Title": ParagraphStyle(
            "Title",
            parent=base["Title"],
            fontName="Helvetica-Bold",
            fontSize=25,
            leading=30,
            textColor=colors.HexColor("#0f172a"),
            spaceAfter=14,
        ),
        "Subtitle": ParagraphStyle(
            "Subtitle",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=11,
            leading=16,
            textColor=colors.HexColor("#334155"),
            spaceAfter=16,
        ),
        "H1": ParagraphStyle(
            "H1",
            parent=base["Heading1"],
            fontName="Helvetica-Bold",
            fontSize=17,
            leading=22,
            textColor=colors.HexColor("#0f172a"),
            spaceBefore=8,
            spaceAfter=8,
        ),
        "H2": ParagraphStyle(
            "H2",
            parent=base["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=13,
            leading=17,
            textColor=colors.HexColor("#111827"),
            spaceBefore=8,
            spaceAfter=5,
        ),
        "Body": ParagraphStyle(
            "Body",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=9.4,
            leading=13.2,
            textColor=colors.HexColor("#1f2937"),
            spaceAfter=5,
        ),
        "Small": ParagraphStyle(
            "Small",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=7.4,
            leading=9.6,
            textColor=colors.HexColor("#475569"),
        ),
        "TableHeader": ParagraphStyle(
            "TableHeader",
            parent=base["BodyText"],
            fontName="Helvetica-Bold",
            fontSize=7.2,
            leading=8.8,
            textColor=colors.white,
            alignment=TA_CENTER,
        ),
        "TableCell": ParagraphStyle(
            "TableCell",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=7.1,
            leading=8.6,
            textColor=colors.HexColor("#111827"),
        ),
        "TableCellBold": ParagraphStyle(
            "TableCellBold",
            parent=base["BodyText"],
            fontName="Helvetica-Bold",
            fontSize=7.1,
            leading=8.6,
            textColor=colors.HexColor("#111827"),
        ),
    }
    return styles


STYLES = make_styles()


def severity_rank(value):
    return {"critical": 0, "high": 1, "medium": 2, "low": 3}.get(value, 4)


def build_aggregates(data):
    all_findings = []
    by_area = defaultdict(list)
    by_route = []
    for result in data["results"]:
        route_findings = []
        for finding in result["findings"]:
            item = {
                **finding,
                "group": result["group"],
                "path": result["path"],
                "screenshot": result["screenshot"],
                "viewport": result["metrics"]["viewport"],
                "smallTargets": len(result["metrics"].get("smallTargets", [])),
                "unnamedControls": len(result["metrics"].get("unnamedControls", [])),
                "localOverflow": len(result["metrics"]["overflow"].get("local", [])),
            }
            all_findings.append(item)
            by_area[finding["area"]].append(item)
            route_findings.append(item)
        by_route.append((result, route_findings))
    return all_findings, by_area, by_route


def summary_table(data, all_findings):
    severity = Counter(item["severity"] for item in all_findings)
    area = Counter(item["area"] for item in all_findings)
    routes = len(data["results"])
    screenshots = len(list(ASSET_DIR.glob("*.png")))
    rows = [
        [para("Routes/viewports audited", STYLES["TableHeader"]), para("Screenshots", STYLES["TableHeader"]), para("Findings", STYLES["TableHeader"]), para("Critical", STYLES["TableHeader"]), para("High", STYLES["TableHeader"])],
        [para(str(routes), STYLES["TableCellBold"]), para(str(screenshots), STYLES["TableCellBold"]), para(str(len(all_findings)), STYLES["TableCellBold"]), para(str(severity["critical"]), STYLES["TableCellBold"]), para(str(severity["high"]), STYLES["TableCellBold"])],
    ]
    table = Table(rows, colWidths=[1.35 * inch, 1.1 * inch, 0.95 * inch, 0.9 * inch, 0.75 * inch])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f172a")),
        ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#cbd5e1")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("BACKGROUND", (0, 1), (-1, 1), colors.HexColor("#f8fafc")),
        ("ALIGN", (0, 1), (-1, 1), "CENTER"),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]))
    return table, severity, area


def route_matrix_table(by_route):
    rows = [[
        para("Surface", STYLES["TableHeader"]),
        para("Route", STYLES["TableHeader"]),
        para("Count", STYLES["TableHeader"]),
        para("Top measured issues", STYLES["TableHeader"]),
    ]]
    for result, findings in by_route:
        issue_text = "; ".join(
            f"{f['severity']}: {f['area']} - {f['issue']}" for f in sorted(findings, key=lambda f: severity_rank(f["severity"]))[:3]
        ) or "No measured issue in the automated pass"
        rows.append([
            para(result["group"], STYLES["TableCell"]),
            para(result["path"], STYLES["TableCell"]),
            para(str(len(findings)), STYLES["TableCellBold"]),
            para(issue_text, STYLES["TableCell"]),
        ])
    table = Table(rows, colWidths=[1.05 * inch, 1.45 * inch, 0.42 * inch, 3.45 * inch], repeatRows=1)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f172a")),
        ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#d1d5db")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    return table


def findings_table(findings):
    rows = [[
        para("Severity", STYLES["TableHeader"]),
        para("Surface", STYLES["TableHeader"]),
        para("Route", STYLES["TableHeader"]),
        para("Issue", STYLES["TableHeader"]),
        para("Recommendation", STYLES["TableHeader"]),
    ]]
    ordered = sorted(findings, key=lambda f: (severity_rank(f["severity"]), f["area"], f["group"], f["path"]))
    for f in ordered:
        rows.append([
            para(f["severity"], STYLES["TableCellBold"]),
            para(f["group"], STYLES["TableCell"]),
            para(f["path"], STYLES["TableCell"]),
            para(f"{f['area']}: {f['issue']}", STYLES["TableCell"]),
            para(f["recommendation"], STYLES["TableCell"]),
        ])
    table = Table(rows, colWidths=[0.62 * inch, 0.85 * inch, 1.25 * inch, 2.0 * inch, 2.0 * inch], repeatRows=1)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#111827")),
        ("GRID", (0, 0), (-1, -1), 0.22, colors.HexColor("#d1d5db")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f9fafb")]),
        ("TOPPADDING", (0, 0), (-1, -1), 3.5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3.5),
    ]))
    return table


def build_markdown(data, all_findings, by_area, by_route):
    severity = Counter(item["severity"] for item in all_findings)
    area = Counter(item["area"] for item in all_findings)
    lines = []
    lines.append("# Personal Server UX/UI Audit")
    lines.append("")
    lines.append("Date: 2026-07-01")
    lines.append("Scope: Native Android app shell plus sampled authenticated desktop app parity.")
    lines.append("Method: Playwright route audit with mocked authenticated API data, Samsung S24 Ultra viewport, small Android stress viewport, and desktop viewport.")
    lines.append("")
    lines.append("## Summary")
    lines.append("")
    lines.append(f"- Routes/viewports audited: {len(data['results'])}")
    lines.append(f"- Screenshots captured: {len(list(ASSET_DIR.glob('*.png')))}")
    lines.append(f"- Findings: {len(all_findings)}")
    lines.append(f"- Critical: {severity['critical']}")
    lines.append(f"- High: {severity['high']}")
    lines.append(f"- Medium: {severity['medium']}")
    lines.append("")
    lines.append("## Areas")
    for name, count in area.most_common():
        lines.append(f"- {name}: {count}")
    lines.append("")
    lines.append("## Key Findings")
    key = [
        "Native Spotify personal still creates horizontal overflow.",
        "Desktop habits still creates local horizontal overflow.",
        "Many native routes risk bottom-tabbar collision at the bottom of scroll.",
        "High-frequency mobile flows still contain too many sub-44px controls.",
        "Several icon-only controls have no accessible name.",
        "Assistant has no visible socket, agent, delivery, retry, or offline state.",
        "Media can render an empty library from a paginated `{items,total}` response, and still lacks season/franchise structure.",
        "Finance has better native structure but still exposes too much filtering and management chrome in the transaction path.",
    ]
    for item in key:
        lines.append(f"- {item}")
    lines.append("")
    lines.append("## Route Matrix")
    for result, findings in by_route:
        issue_text = "; ".join(f"{f['severity']} {f['area']}: {f['issue']}" for f in findings[:3]) or "No measured issue"
        lines.append(f"- {result['group']} `{result['path']}`: {len(findings)} findings. {issue_text}")
    lines.append("")
    lines.append("## Complete Findings")
    for f in sorted(all_findings, key=lambda f: (severity_rank(f["severity"]), f["group"], f["path"])):
        lines.append(f"- [{f['severity']}] {f['group']} `{f['path']}` - {f['area']}: {f['issue']} Recommendation: {f['recommendation']}")
    lines.append("")
    lines.append("## Evidence")
    lines.append(f"- Raw JSON: `{RESULTS_PATH.as_posix()}`")
    lines.append(f"- Screenshots: `{ASSET_DIR.as_posix()}`")
    MD_PATH.write_text("\n".join(lines) + "\n", encoding="utf-8")


def build_pdf(data, all_findings, by_area, by_route):
    doc = SimpleDocTemplate(
        str(PDF_PATH),
        pagesize=A4,
        rightMargin=0.55 * inch,
        leftMargin=0.55 * inch,
        topMargin=0.58 * inch,
        bottomMargin=0.62 * inch,
        title="Personal Server UX/UI Audit",
    )
    story = []

    story.append(para("Personal Server UX/UI Audit", STYLES["Title"]))
    story.append(para("Native Android app plus authenticated web app parity - Playwright evidence report", STYLES["Subtitle"]))
    story.append(para("Date: 2026-07-01. Scope: every major native app section, settings subsection, import/data route, assistant surface, finance tabs, media, Spotify, habits, workout, overview/menu, and sampled desktop app routes.", STYLES["Body"]))
    story.append(para("Audit intent: identify UX/UI failures, missing interactions, layout/accessibility risks, and product-structure improvements. The app was exercised with mocked authenticated data so screens could be evaluated without depending on the live backend.", STYLES["Body"]))
    table, severity, area = summary_table(data, all_findings)
    story.append(Spacer(1, 8))
    story.append(table)
    story.append(Spacer(1, 12))
    story.append(para("Executive read", STYLES["H1"]))
    story.append(para("The current native app is materially better than the earlier web-wrapper state, but it still behaves like a compressed ledger console in several domains. The biggest UX risk is not color or visual taste now. It is operational friction: dense controls, bottom navigation collision, hidden state, inconsistent data contracts, and missing assistant/sync status.", STYLES["Body"]))
    story.append(bullet_list([
        "Critical layout issues remain in Spotify personal on native and Habits on desktop due local horizontal overflow.",
        "Native transaction, media, Spotify, settings, and habits screens still include many controls below the 44px mobile comfort target.",
        "Several pages place final content too close to the bottom tabbar, which creates gesture and reachability risk on Android.",
        "Assistant is under-specified for a socket relay: users cannot see agent availability, message persistence, retry, or offline queue state.",
        "Media is still a flat library UI. It cannot adequately explain anime seasons, TV seasons, source records, ambiguous matches, or wrong images.",
        "Finance is closer to Cashew quality but still needs a tighter transaction-first model, clearer graphs, and fewer management controls in the hot path.",
    ], STYLES))

    story.append(PageBreak())
    story.append(para("Method", STYLES["H1"]))
    story.append(bullet_list([
        "Playwright Chromium route audit against local Vite app.",
        "Native viewport: 486 x 962, matching Samsung S24 Ultra class CSS viewport.",
        "Small stress viewport: 320 x 568 for overflow and compression checks.",
        "Desktop parity viewport: 1440 x 1000.",
        "Checks: screenshots, document/local horizontal overflow, active tab count, touch target size, accessible names, sampled text contrast, large low-content blocks, bottom tabbar clearance, console and page errors.",
        "Repo design criteria used: private ledger, dense but readable, cache honesty, no horizontal overflow, 44px mobile touch targets, settings-owned configuration, no generic dashboard theater.",
    ], STYLES))
    story.append(para("Evidence files", STYLES["H2"]))
    story.append(para(f"Raw JSON: {RESULTS_PATH}", STYLES["Body"]))
    story.append(para(f"Screenshots folder: {ASSET_DIR}", STYLES["Body"]))

    story.append(para("Measured findings by area", STYLES["H2"]))
    area_rows = [[para("Area", STYLES["TableHeader"]), para("Count", STYLES["TableHeader"])]]
    for name, count in area.most_common():
        area_rows.append([para(name, STYLES["TableCell"]), para(str(count), STYLES["TableCellBold"])])
    area_table = Table(area_rows, colWidths=[4.8 * inch, 0.8 * inch])
    area_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f172a")),
        ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#d1d5db")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
    ]))
    story.append(area_table)

    story.append(PageBreak())
    story.append(para("Priority Findings", STYLES["H1"]))

    priority_sections = [
        {
            "title": "P0 - Horizontal overflow is still present",
            "body": "The product rule says native screens must have no horizontal scroll. Playwright still found native Spotify personal overflowing through one local scroll container. Desktop Habits also has local horizontal overflow, which matters because the desktop app is the expanded review workspace.",
            "actions": [
                "Convert Spotify personal charts and tab groups to fit-to-width native cards or a dropdown period selector.",
                "Remove fixed-width chart/table wrappers from Habits desktop or constrain them to the parent width.",
                "Keep the existing regression style: inspect document scroll width and local overflow containers.",
            ],
            "images": ["native-s24-music-spotify-personal.png", "desktop-desktop-habits-habits.png"],
        },
        {
            "title": "P0 - Bottom tabbar collision and gesture risk",
            "body": "Seventeen route/viewport states were flagged for bottom-tabbar clearance risk. On Android, this compounds with gesture navigation: users can hit the OS gesture area while trying to use the app, and final rows can feel visually cut off.",
            "actions": [
                "Give every native route a shared bottom-safe spacer based on tabbar height plus safe-area inset.",
                "Move sticky primary actions above the tabbar instead of letting content scroll underneath it.",
                "Add a Playwright assertion for last visible route content staying at least 8px above the tabbar at bottom scroll.",
            ],
            "images": ["native-s24-finance-finance-transactions.png", "native-s24-habits-habits.png"],
        },
        {
            "title": "P1 - Touch ergonomics are not yet app-native",
            "body": "The audit found 38 route instances with visible interactive targets below 44px. This is most visible in Settings, Finance filters, Spotify controls, Media chips, and dense desktop tables. Some tiny controls are acceptable on desktop, but the same patterns leak into native routes.",
            "actions": [
                "Create a shared native control contract: all primary buttons, chips, icon buttons, and tab items get a 44px minimum tap box.",
                "Move dense option sets into bottom sheets or compact menus.",
                "Reduce controls shown at once in finance transaction filtering and media filtering.",
            ],
            "images": ["native-s24-settings-settings-section-notifications.png", "native-s24-media-media.png"],
        },
        {
            "title": "P1 - Finance is improved, but not yet Cashew-quality",
            "body": "The money section now has Summary, Transactions, Budgets, and Trends, but the transaction screen still carries large summary panels, payment setup, filters, and feed management together. The result is functional but heavier than a dedicated finance app.",
            "actions": [
                "Make Transactions the operational default: recent list, clear Add button, period selector, search, and one compact filter summary.",
                "Move detected payment setup to Settings or a collapsible card that only expands when prompts exist.",
                "Add Cashew-like budget cards, balance trend, category donut, daily/monthly spending bars, and wallet list with useful metadata.",
                "Use category icons and wallet colors consistently, but reduce full-width accent fills.",
            ],
            "images": ["native-s24-finance-finance.png", "native-s24-finance-finance-transactions.png"],
        },
        {
            "title": "P1 - Media still cannot represent real viewing structure",
            "body": "The media route rendered an empty state when the audit fixture returned a paginated media object. More importantly, the UI still treats media as flat items. The user problem around Blue Exorcist remains: season progress and franchise structure are not visible enough.",
            "actions": [
                "Normalize media responses so the UI accepts both arrays and paginated {items,total} responses.",
                "Represent anime seasons as separate works grouped under a franchise.",
                "Represent TV as series with seasons and episode rows.",
                "Add an import review queue for wrong images, wrong categories, duplicate candidates, and low-confidence matches.",
            ],
            "images": ["native-s24-media-media.png"],
        },
        {
            "title": "P1 - Assistant lacks operational state",
            "body": "The assistant surface has conversations but no visible connection state. Given the planned two-sided socket relay, the UI must show whether the user socket is connected, whether an agent is connected, whether a message is saved, read, thinking, failed, or finished.",
            "actions": [
                "Add socket status: connected, reconnecting, offline, agent unavailable.",
                "Add message states: queued, sending, sent, delivered to agent, thinking, failed, complete.",
                "Preserve drafts and allow retry for failed messages.",
                "Tie assistant-reply notifications to conversation state and notification preferences.",
            ],
            "images": ["native-s24-assistant-chat.png"],
        },
        {
            "title": "P1 - Settings is functionally complete but visually heavy",
            "body": "Settings now has the right sections, but several subsections have many toggles and small controls. Appearance is especially dense. Notifications has accessible-name misses on toggle-like rows.",
            "actions": [
                "Use grouped setting rows with one leading label, one short description, one control.",
                "Make switch rows expose clear accessible names and states.",
                "Split Appearance into Theme, Density, Modules, and Developer only if each has enough controls.",
                "Keep imports and dangerous data actions in Data, with clear recovery language.",
            ],
            "images": ["native-s24-settings-settings.png", "native-s24-settings-settings-section-appearance.png"],
        },
    ]

    for section in priority_sections:
        story.append(KeepTogether([
            para(section["title"], STYLES["H2"]),
            para(section["body"], STYLES["Body"]),
            bullet_list(section["actions"], STYLES),
        ]))
        for image_name in section["images"]:
            story.append(Spacer(1, 4))
            story.append(image_flowable(image_name, width=4.25 * inch if image_name.startswith("native") else 5.9 * inch))
            story.append(para(f"Evidence: {image_name}", STYLES["Small"]))
        story.append(Spacer(1, 10))

    story.append(PageBreak())
    story.append(para("Missing Interactions And Sections", STYLES["H1"]))
    story.append(para("These are not optional polish items. They are missing interaction contracts required for the app to feel reliable as a private, cache-first daily ledger.", STYLES["Body"]))
    story.append(bullet_list([
        "Global sync/offline center with freshness by domain, queued writes, failed writes, and conflict review.",
        "Per-domain visible data states: cached, refreshing, stale, offline, saved locally, syncing, failed, conflicted.",
        "Assistant socket and agent status across chat list and conversation detail.",
        "Finance review queue for detected payments, uncategorized imports, duplicate candidates, and failed import rows.",
        "Finance category and wallet management as first-class mobile flows, not just settings forms.",
        "Media series/franchise detail with season/work rows and source-match confidence.",
        "Import center with source-specific requirements, progress streaming, retry, cancel, and warning review.",
        "Widget/home customization preview showing exactly what appears on Today, home widgets, and lock-screen eligible widgets.",
        "Step count history in Training, not only settings integration status.",
        "Notification testing and quiet-hour preview by notification type.",
        "Route-level empty, error, stale, permission, and disconnected states for every module.",
    ], STYLES))

    story.append(para("Recommended Roadmap", STYLES["H1"]))
    roadmap = [
        ["P0", "Remove overflow and tabbar collision", "Fix Spotify native overflow, desktop Habits overflow, and shared bottom-safe spacing. Add regression checks."],
        ["P0", "Protect route reliability", "Add response normalization for Media, Spotify, Workout, and Home. Route-level errors must show recovery, never blank or misleading screens."],
        ["P1", "Make Finance a real mobile finance app", "Transaction-first layout, Cashew-quality budgets/graphs, compact filters, review queue, wallet/category management."],
        ["P1", "Finish Assistant state model", "Socket/agent/message status, retry, draft persistence, reply notifications."],
        ["P1", "Fix touch/accessibility contract", "44px native controls, accessible names for icon/toggle rows, visible focus, reduced motion."],
        ["P2", "Upgrade Media structure", "Franchise/season/source-record model, import match review, wrong-image/category correction."],
        ["P2", "Polish density and visual rhythm", "Reduce oversized empty panels, tighten header hierarchy, keep domain colors as accents only."],
    ]
    roadmap_rows = [[para("Priority", STYLES["TableHeader"]), para("Workstream", STYLES["TableHeader"]), para("Outcome", STYLES["TableHeader"])]]
    for row in roadmap:
        roadmap_rows.append([para(row[0], STYLES["TableCellBold"]), para(row[1], STYLES["TableCellBold"]), para(row[2], STYLES["TableCell"])])
    roadmap_table = Table(roadmap_rows, colWidths=[0.65 * inch, 2.0 * inch, 3.7 * inch], repeatRows=1)
    roadmap_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f172a")),
        ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#d1d5db")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]))
    story.append(roadmap_table)

    story.append(PageBreak())
    story.append(para("Route Matrix", STYLES["H1"]))
    story.append(para("Every audited route/viewport state is listed below. The matrix includes native Samsung S24 Ultra routes, small Android stress routes, and desktop parity routes.", STYLES["Body"]))
    story.append(route_matrix_table(by_route))

    story.append(PageBreak())
    story.append(para("Complete Measured Findings", STYLES["H1"]))
    story.append(para("This appendix contains all automated findings emitted by the Playwright audit. Repeated routes appear where the same issue was reproduced at multiple viewports.", STYLES["Body"]))
    story.append(findings_table(all_findings))

    doc.build(story, onFirstPage=page_number, onLaterPages=page_number)


def main():
    data = load_results()
    all_findings, by_area, by_route = build_aggregates(data)
    build_markdown(data, all_findings, by_area, by_route)
    build_pdf(data, all_findings, by_area, by_route)
    print(PDF_PATH)
    print(MD_PATH)


if __name__ == "__main__":
    main()
