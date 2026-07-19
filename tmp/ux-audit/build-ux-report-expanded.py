from __future__ import annotations

import json
from collections import Counter, defaultdict
from pathlib import Path

from PIL import Image as PILImage
from PIL import ImageDraw, ImageFont
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    Image,
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


def clean(value):
    if value is None:
        return ""
    return (
        str(value)
        .replace("\u2014", "-")
        .replace("\u2013", "-")
        .replace("\u2011", "-")
        .replace("\u2026", "...")
        .replace("\u20ac", "EUR ")
        .replace("\u00b7", "-")
        .replace("\u2192", "->")
        .replace("\u2264", "<=")
        .replace("\u2265", ">=")
    )


def load_results():
    return json.loads(RESULTS_PATH.read_text(encoding="utf-8"))


def make_styles():
    base = getSampleStyleSheet()
    return {
        "Title": ParagraphStyle(
            "Title",
            parent=base["Title"],
            fontName="Helvetica-Bold",
            fontSize=24,
            leading=29,
            textColor=colors.HexColor("#0f172a"),
            spaceAfter=13,
        ),
        "Subtitle": ParagraphStyle(
            "Subtitle",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=10.5,
            leading=15,
            textColor=colors.HexColor("#334155"),
            spaceAfter=13,
        ),
        "H1": ParagraphStyle(
            "H1",
            parent=base["Heading1"],
            fontName="Helvetica-Bold",
            fontSize=16,
            leading=21,
            textColor=colors.HexColor("#0f172a"),
            spaceBefore=8,
            spaceAfter=7,
        ),
        "H2": ParagraphStyle(
            "H2",
            parent=base["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=12.4,
            leading=16,
            textColor=colors.HexColor("#111827"),
            spaceBefore=8,
            spaceAfter=4,
        ),
        "Body": ParagraphStyle(
            "Body",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=8.9,
            leading=12.4,
            textColor=colors.HexColor("#1f2937"),
            spaceAfter=4.5,
        ),
        "Small": ParagraphStyle(
            "Small",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=7.1,
            leading=9.2,
            textColor=colors.HexColor("#475569"),
        ),
        "TableHeader": ParagraphStyle(
            "TableHeader",
            parent=base["BodyText"],
            fontName="Helvetica-Bold",
            fontSize=6.9,
            leading=8.4,
            textColor=colors.white,
            alignment=TA_CENTER,
        ),
        "TableCell": ParagraphStyle(
            "TableCell",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=6.8,
            leading=8.2,
            textColor=colors.HexColor("#111827"),
        ),
        "TableCellBold": ParagraphStyle(
            "TableCellBold",
            parent=base["BodyText"],
            fontName="Helvetica-Bold",
            fontSize=6.8,
            leading=8.2,
            textColor=colors.HexColor("#111827"),
        ),
    }


STYLES = make_styles()


def p(text, style="Body"):
    return Paragraph(clean(text), STYLES[style])


def bullets(items):
    return ListFlowable(
        [ListItem(p(item), leftIndent=12) for item in items],
        bulletType="bullet",
        start="disc",
        leftIndent=15,
        bulletFontName="Helvetica",
        bulletFontSize=7.5,
    )


def page_number(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(colors.HexColor("#6b7280"))
    canvas.drawString(0.55 * inch, 0.42 * inch, "Personal Server UX/UI audit")
    canvas.drawRightString(A4[0] - 0.55 * inch, 0.42 * inch, f"Page {doc.page}")
    canvas.restoreState()


def severity_rank(value):
    return {"critical": 0, "high": 1, "medium": 2, "low": 3}.get(value, 4)


def screenshot(name, width=4.15 * inch):
    path = ASSET_DIR / name
    if not path.exists():
        return p(f"Missing screenshot: {name}", "Small")
    img = Image(str(path))
    ratio = img.imageHeight / img.imageWidth
    img.drawWidth = width
    img.drawHeight = width * ratio
    max_height = 7.0 * inch
    if img.drawHeight > max_height:
        img.drawHeight = max_height
        img.drawWidth = max_height / ratio
    img.hAlign = "CENTER"
    return img


def get_annotation_font(size=34, bold=False):
    names = ["arialbd.ttf" if bold else "arial.ttf", "C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf"]
    for name in names:
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            continue
    return ImageFont.load_default()


ANNOTATED_DIR = ASSET_DIR / "annotated"


ANNOTATED_SCREENSHOTS = [
    {
        "title": "Today overview - review surface",
        "source": "native-s24-overview-home.png",
        "output": "annotated-overview-home.png",
        "crop": (0, 0, 972, 1540),
        "callouts": [
            {
                "box": (638, 8, 945, 105),
                "issue": "Top app switcher competes with the actual Today task.",
                "improvement": "Keep the switcher compact or move module switching into the bottom Apps route.",
            },
            {
                "box": (24, 116, 950, 190),
                "issue": "Cached state says '5h ago' globally, but not which modules are stale.",
                "improvement": "Show per-domain freshness: habits local, finance verified, Spotify queued, steps live.",
            },
            {
                "box": (622, 700, 910, 1240),
                "issue": "Habit decision controls are icon-only and can look preselected.",
                "improvement": "Use neutral default buttons with one clear selected state after the user acts.",
            },
            {
                "box": (22, 1390, 950, 1535),
                "issue": "Quick cards mix action buttons and passive metrics without hierarchy.",
                "improvement": "Separate 'Do now' actions from review metrics and explain period/source labels.",
            },
        ],
    },
    {
        "title": "Navigation - app switcher overlay",
        "source": "native-s24-interaction-navigation-native-app-switcher-sheet.png",
        "output": "annotated-navigation-switcher.png",
        "crop": (0, 0, 972, 1260),
        "callouts": [
            {
                "box": (635, 8, 945, 225),
                "issue": "The selector opens a second navigation system while the first remains visible.",
                "improvement": "Define one primary navigation model: Today, Apps, Assistant, then module-local tabs.",
            },
            {
                "box": (30, 230, 945, 675),
                "issue": "The sheet repeats module tiles but does not expose settings/import/data ownership.",
                "improvement": "Add module destinations plus one clear 'Manage modules and data' control.",
            },
            {
                "box": (40, 690, 930, 1250),
                "issue": "Underlying content remains visually busy behind the overlay.",
                "improvement": "Increase scrim discipline and keep modal content isolated from active task controls.",
            },
        ],
    },
    {
        "title": "Finance transactions - hot path",
        "source": "native-s24-finance-finance-transactions.png",
        "output": "annotated-finance-transactions.png",
        "crop": (0, 0, 972, 1650),
        "callouts": [
            {
                "box": (24, 118, 948, 310),
                "issue": "Large header uses a full card before the user reaches transactions.",
                "improvement": "Use a compact period header with balance, month controls, and add action in one row.",
            },
            {
                "box": (24, 620, 948, 1008),
                "issue": "Detected payment prompt is prominent but lacks confidence/source/dedupe context.",
                "improvement": "Group detected payments into a review queue with transaction fingerprint and cooldown.",
            },
            {
                "box": (24, 1026, 948, 1370),
                "issue": "Filters occupy a large block and hide the resulting ledger context below.",
                "improvement": "Use compact chips, persistent search, and a clear active-filter summary.",
            },
            {
                "box": (600, 1405, 925, 1505),
                "issue": "Add and Manage compete inside the feed header.",
                "improvement": "Make Add a floating/primary action; put manage/configuration in settings/data.",
            },
        ],
    },
    {
        "title": "Finance add transaction - form flow",
        "source": "native-s24-interaction-finance-add-transaction-sheet.png",
        "output": "annotated-finance-add-transaction.png",
        "crop": (0, 0, 972, 1924),
        "callouts": [
            {
                "box": (28, 142, 945, 220),
                "issue": "Transaction type tabs are wide, but the current amount/action is not the focus.",
                "improvement": "Make type a compact segmented control and keep amount entry dominant.",
            },
            {
                "box": (28, 412, 944, 1090),
                "issue": "Category selection consumes most of the first viewport before title/date/save.",
                "improvement": "Use recent categories first, then open a searchable picker only when needed.",
            },
            {
                "box": (28, 1110, 944, 1646),
                "issue": "Wallet and metadata are below a long picker, increasing correction cost.",
                "improvement": "Keep wallet/date/title visible near amount; defer notes until after core fields.",
            },
            {
                "box": (28, 1660, 944, 1924),
                "issue": "Numeric keypad pushes the primary save action out of the first viewport.",
                "improvement": "Use a sticky bottom save bar above the keypad with visible validation state.",
            },
        ],
    },
    {
        "title": "Habits - daily logging",
        "source": "native-s24-habits-habits.png",
        "output": "annotated-habits-daily.png",
        "crop": (0, 0, 972, 1924),
        "callouts": [
            {
                "box": (24, 116, 948, 318),
                "issue": "Daily progress is visually large but does not explain pending vs missed vs skipped.",
                "improvement": "Show a compact status row with due, logged, missed, skipped, and recovery state.",
            },
            {
                "box": (24, 441, 948, 557),
                "issue": "Instructional copy says secondary states stay one tap away, but all controls are visible.",
                "improvement": "Show the primary expected action first; reveal skip/missed as secondary controls.",
            },
            {
                "box": (75, 697, 900, 1033),
                "issue": "Boolean habit rows repeat three large equal buttons per habit.",
                "improvement": "Use one-tap completion with swipe/overflow for skip and missed.",
            },
            {
                "box": (75, 1195, 900, 1385),
                "issue": "Numeric habit controls require too much precision and scanning.",
                "improvement": "Use steppers/presets around the counter, with larger tap zones and visible target.",
            },
            {
                "box": (0, 1815, 972, 1924),
                "issue": "Bottom tabs use tiny status dots that are not self-explanatory.",
                "improvement": "Reserve dots for real alerts; selected tab alone should indicate location.",
            },
        ],
    },
    {
        "title": "Training history - review density",
        "source": "native-s24-training-workout-history.png",
        "output": "annotated-training-history.png",
        "crop": (0, 0, 972, 1924),
        "callouts": [
            {
                "box": (430, 116, 950, 250),
                "issue": "Large duplicate page title consumes space without adding context.",
                "improvement": "Use a compact header with period and primary action.",
            },
            {
                "box": (24, 282, 948, 905),
                "issue": "Metric cards are oversized, pushing history and filters down.",
                "improvement": "Compress metrics into a horizontal summary strip and prioritize workout records.",
            },
            {
                "box": (24, 940, 948, 1304),
                "issue": "Search and date filter are heavy for a short history list.",
                "improvement": "Use inline search only after enough records exist; make date chips lighter.",
            },
            {
                "box": (0, 1814, 972, 1924),
                "issue": "Multiple tab dots create ambiguity about unread state vs selected state.",
                "improvement": "Use badge counts only when a tab needs attention.",
            },
        ],
    },
    {
        "title": "Media library - empty and data model state",
        "source": "native-s24-media-media.png",
        "output": "annotated-media-library.png",
        "crop": (0, 0, 972, 1924),
        "callouts": [
            {
                "box": (610, 116, 930, 190),
                "issue": "A second large title duplicates the native shell title.",
                "improvement": "Use the native header as location; put module actions in content.",
            },
            {
                "box": (24, 282, 948, 690),
                "issue": "Metric cards dominate even when the library is effectively empty.",
                "improvement": "Show import/match/correction tasks first when data quality is low.",
            },
            {
                "box": (24, 720, 948, 1155),
                "issue": "Filter chips and Add button take more room than the content they affect.",
                "improvement": "Collapse filters into a compact toolbar and keep Add close to library search.",
            },
            {
                "box": (24, 1195, 948, 1814),
                "issue": "Empty state conflicts with non-zero metrics above.",
                "improvement": "Explain active filters/source mismatch or show the matching items.",
            },
        ],
    },
    {
        "title": "Assistant - operational state",
        "source": "native-s24-assistant-chat.png",
        "output": "annotated-assistant-chat.png",
        "crop": (0, 0, 972, 1250),
        "callouts": [
            {
                "box": (24, 232, 948, 308),
                "issue": "Connection banner is passive and does not expose user socket vs agent socket state.",
                "improvement": "Show connected/offline/retrying/agent-unavailable states with retry and diagnostics.",
            },
            {
                "box": (52, 337, 920, 640),
                "issue": "Conversation rows lack timestamps, last message, status, and failure state.",
                "improvement": "Use a compact session list with last activity, unread/thinking/error indicators.",
            },
            {
                "box": (24, 640, 948, 1210),
                "issue": "Large empty panel gives no next step or capability hint.",
                "improvement": "Offer review prompts tied to current data, not generic empty space.",
            },
        ],
    },
    {
        "title": "Settings - modules and home customization",
        "source": "native-s24-settings-settings-section-modules.png",
        "output": "annotated-settings-modules.png",
        "crop": (0, 0, 972, 1550),
        "callouts": [
            {
                "box": (740, 8, 945, 105),
                "issue": "Top app switcher remains available inside deep settings.",
                "improvement": "Reduce shell controls on deep configuration screens to prevent accidental context switch.",
            },
            {
                "box": (24, 116, 948, 343),
                "issue": "Header and intro consume a lot of space before actual controls.",
                "improvement": "Use a tighter settings header and put explanatory copy behind help affordances.",
            },
            {
                "box": (50, 540, 922, 630),
                "issue": "Reset action has no preview of what will change.",
                "improvement": "Show affected modules/cards before confirming reset.",
            },
            {
                "box": (51, 653, 922, 1492),
                "issue": "Feature, Today, Widget, and Background toggles repeat without preview or ordering.",
                "improvement": "Add a live preview for Today/widgets and allow drag ordering or presets.",
            },
        ],
    },
    {
        "title": "Music - Spotify personal view",
        "source": "native-s24-music-spotify-personal.png",
        "output": "annotated-spotify-personal.png",
        "crop": (0, 0, 972, 1924),
        "callouts": [
            {
                "box": (24, 282, 948, 442),
                "issue": "Currently playing state is a large loading block with no timeout/fallback.",
                "improvement": "Show last known track, sync timestamp, and retry/offline state.",
            },
            {
                "box": (24, 475, 948, 708),
                "issue": "Account card uses a generic icon instead of actual profile identity.",
                "improvement": "Use Spotify profile picture, display name, and beta/access status.",
            },
            {
                "box": (24, 774, 948, 898),
                "issue": "Period selector causes horizontal overflow and truncates Custom.",
                "improvement": "Wrap into a scroll-free segmented control or move custom range into a picker.",
            },
            {
                "box": (24, 996, 948, 1615),
                "issue": "Metrics mix real and zero values without explaining missing source data.",
                "improvement": "Label source availability and hide metrics that cannot be computed.",
            },
            {
                "box": (24, 1650, 948, 1924),
                "issue": "Chart is partially cut by the bottom navigation and gesture area.",
                "improvement": "Add safe-area padding and keep charts above module navigation.",
            },
        ],
    },
]


def annotated_image_path(spec):
    return ANNOTATED_DIR / spec["output"]


def ensure_annotated_screenshots():
    ANNOTATED_DIR.mkdir(parents=True, exist_ok=True)
    font = get_annotation_font(30, bold=True)
    small_font = get_annotation_font(22, bold=True)
    for spec in ANNOTATED_SCREENSHOTS:
        src = ASSET_DIR / spec["source"]
        if not src.exists():
            continue
        image = PILImage.open(src).convert("RGBA")
        crop = spec.get("crop")
        offset_x = 0
        offset_y = 0
        if crop:
            offset_x, offset_y, _, _ = crop
            image = image.crop(crop)
        overlay = PILImage.new("RGBA", image.size, (0, 0, 0, 0))
        draw = ImageDraw.Draw(overlay)
        for idx, callout in enumerate(spec["callouts"], start=1):
            x1, y1, x2, y2 = callout["box"]
            x1 -= offset_x
            x2 -= offset_x
            y1 -= offset_y
            y2 -= offset_y
            x1, y1 = max(0, x1), max(0, y1)
            x2, y2 = min(image.width - 1, x2), min(image.height - 1, y2)
            color = (255, 92, 122, 235)
            fill = (255, 92, 122, 36)
            draw.rounded_rectangle((x1, y1, x2, y2), radius=22, outline=color, width=6, fill=fill)
            badge_x = max(10, min(x1 + 12, image.width - 74))
            badge_y = max(10, min(y1 + 12, image.height - 74))
            draw.ellipse((badge_x, badge_y, badge_x + 58, badge_y + 58), fill=(255, 92, 122, 245), outline=(255, 255, 255, 245), width=3)
            label = str(idx)
            bbox = draw.textbbox((0, 0), label, font=font)
            draw.text(
                (badge_x + 29 - (bbox[2] - bbox[0]) / 2, badge_y + 29 - (bbox[3] - bbox[1]) / 2 - 2),
                label,
                fill=(255, 255, 255, 255),
                font=font,
            )
        image = PILImage.alpha_composite(image, overlay).convert("RGB")
        draw = ImageDraw.Draw(image)
        strip_h = 58
        draw.rectangle((0, 0, image.width, strip_h), fill=(8, 13, 20))
        draw.text((24, 15), spec["title"], fill=(230, 244, 255), font=small_font)
        image.save(annotated_image_path(spec), quality=92)


def annotated_screenshot_flowable(spec, width=3.9 * inch):
    path = annotated_image_path(spec)
    if not path.exists():
        return [p(f"Missing annotated screenshot: {spec['output']}", "Small")]
    items = [p(spec["title"], "H2"), screenshot(f"annotated/{spec['output']}", width=width)]
    rows = [[p("#", "TableHeader"), p("Issue visible on screenshot", "TableHeader"), p("Recommended improvement", "TableHeader")]]
    for idx, callout in enumerate(spec["callouts"], start=1):
        rows.append([p(idx, "TableCellBold"), p(callout["issue"], "TableCell"), p(callout["improvement"], "TableCell")])
    items.append(table(rows, [0.35 * inch, 2.8 * inch, 3.35 * inch]))
    return items


def table(rows, widths, header=True):
    result = Table(rows, colWidths=widths, repeatRows=1 if header else 0)
    style = [
        ("GRID", (0, 0), (-1, -1), 0.2, colors.HexColor("#d1d5db")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 3.5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3.5),
        ("ROWBACKGROUNDS", (0, 1 if header else 0), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
    ]
    if header:
        style.append(("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f172a")))
    result.setStyle(TableStyle(style))
    return result


def chunked(items, size):
    for index in range(0, len(items), size):
        yield items[index:index + size]


def normalize_findings(data):
    findings = []
    route_rows = []
    interaction_rows = []
    for result in data.get("results", []):
        route_rows.append(result)
        for finding in result.get("findings", []):
            findings.append({
                **finding,
                "kind": "route",
                "group": result.get("group", ""),
                "path": result.get("path", ""),
                "state": "",
                "screenshot": result.get("screenshot", ""),
            })
    for result in data.get("interactions", []):
        interaction_rows.append(result)
        for finding in result.get("findings", []):
            findings.append({
                **finding,
                "kind": "interaction",
                "group": result.get("group", ""),
                "path": result.get("path", ""),
                "state": result.get("state", ""),
                "screenshot": result.get("screenshot", ""),
            })
    return findings, route_rows, interaction_rows


FUNCTIONALITY = [
    {
        "domain": "Review / Today",
        "available": [
            "Cached mobile overview with score, focus headline, habits due, recent training, finance spend, music streams, steps, and assistant prompt.",
            "Fast habit logging from overview with done/skip/missed controls.",
            "Quick entry points for add expense, Spotify ranking, assistant review, and full habit log.",
            "Module-aware home cards driven by feature preferences.",
        ],
        "gaps": [
            "Today does not expose enough freshness detail by domain. Users cannot see which module is stale or queued.",
            "The home/widget customization exists in preferences but has no strong preview or drag ordering UI.",
            "Overview can show aggregate values without enough explanation of period, currency, or data source.",
        ],
    },
    {
        "domain": "Navigation",
        "available": [
            "Native app shell with top app switcher, settings entry, and per-module bottom tabs.",
            "Feature modules can be hidden from navigation and background sync.",
            "Android back handling is implemented through route-aware native back destinations.",
        ],
        "gaps": [
            "The app switcher and bottom navigation duplicate some concepts, increasing cognitive load.",
            "Some pages still lose bottom navigation or highlight more than one tab in edge states.",
            "No visible map explains which module owns imports, settings, and data management.",
        ],
    },
    {
        "domain": "Habits",
        "available": [
            "Boolean and numeric habits with active state, icon, color, description, pass/skip thresholds, and daily/weekly/monthly/yearly cadence.",
            "Today, plan, history, insights, settings, reminders, and import states.",
            "HabitShare import with file selection, preview, streaming progress, and import summary.",
            "Daily reminders, missed-habit nudges, and test notifications.",
        ],
        "gaps": [
            "Numeric counter controls are present but still small and require too much precision.",
            "Streak explanations are not visible enough for weekly/monthly/yearly habits.",
            "The history/review model does not yet make missed streaks and recovery patterns easy to inspect.",
        ],
    },
    {
        "domain": "Training",
        "available": [
            "Workout overview, active session, history, exercises, categories, bodyweight, imports, PRs, and step integration.",
            "Active workout can add sets by category/exercise, use previous set history, delete sets, and end with title/notes.",
            "Exercise/category/bodyweight management with add/edit/delete flows.",
            "Health Connect step permission, live in-app steps, and background WorkManager-style step sync controls.",
        ],
        "gaps": [
            "Steps are configured in Settings but are not yet a strong first-class Training timeline.",
            "Active workout entry is form-heavy and not optimized for repeated set entry on a phone.",
            "History filtering and detail views still feel more desktop than native app.",
        ],
    },
    {
        "domain": "Finance",
        "available": [
            "Summary, transactions, budgets, trends, import, and settings tabs.",
            "Transactions support expense, income, and transfer modes, wallet/category/date/title/note editing, and delete confirmation.",
            "Wallets, categories, subscriptions, and budgets have add/edit/delete or management flows.",
            "Cashew import, detected payment suggestions, payment-notification access, and pending payment import controls exist.",
        ],
        "gaps": [
            "The hot path is still not Cashew-quality: too many controls appear before the transaction list.",
            "Budget cards and graphing exist but do not yet provide the same glanceable progress and daily allowance logic.",
            "Detected payments need strict de-duplication, grouping, and a review queue so one payment cannot produce notification spam.",
        ],
    },
    {
        "domain": "Music / Spotify",
        "available": [
            "Spotify beta connection state, profile, tracking toggle, manual token entry, sync latest plays, custom date range, top tracks/albums/artists/playlists, recent history, global stats, and user ranking.",
            "Ranking supports multiple timeframes and profile-image fields from the API.",
        ],
        "gaps": [
            "Spotify personal and stream history still overflow locally in the native viewport.",
            "The beta tester limitation is not integrated into the main music UX strongly enough.",
            "Tracking/sync failures need a clearer retry and stale-data state.",
        ],
    },
    {
        "domain": "Media",
        "available": [
            "Library stats, type/status/search filters, add via external search, manual add, edit, match, delete, and source import/settings routes.",
            "Edit modal exposes title, status, rating, dates, episodes/chapters/pages, synopsis, genres, notes, and match tab.",
        ],
        "gaps": [
            "The UI currently expects an array response and can render empty if the backend returns a paginated object.",
            "Anime seasons, TV seasons, franchise grouping, source records, and match confidence are not represented as first-class concepts.",
            "Wrong images/categories need a bulk review queue, not item-by-item correction only.",
        ],
    },
    {
        "domain": "Assistant",
        "available": [
            "Conversation list, new conversation, message send area, inline/mobile assistant page, and external agent API keys.",
            "Agent API keys can be scoped, toggled, edited, deleted, and generated with setup instructions.",
        ],
        "gaps": [
            "The chat UI does not show user socket, agent socket, persistence state, queue, read, thinking, finish, or failed states.",
            "No obvious retry/offline draft model is visible.",
            "No clear separation between assistant conversations and agent-worker operations.",
        ],
    },
    {
        "domain": "Settings / Configuration",
        "available": [
            "Account/security, Spotify connections, Health and Payments, Modules and Home, Notifications, Widgets, Sync and Offline, Updates, Appearance, Data and Imports, and Developer Agent Keys.",
            "Feature modules can be active/hidden, shown on Today, allowed on widgets, and background-synced.",
            "Notification types include habit reminders, missed nudges, workout reminders, finance reminders, assistant replies, AI custom alerts, updates, and quiet hours.",
            "Widgets can be pinned/refreshed and lock-screen behavior is explained with Samsung restrictions.",
            "Appearance supports accent color, theme mode, background, sidebar, density, and advanced custom CSS.",
            "Data can link to imports/settings and delete whole module data with typed confirmation.",
        ],
        "gaps": [
            "Settings has the most complete functionality but the densest UI. Many controls need grouping, preview, and clearer consequences.",
            "Widget/home configuration has data structures but not enough visual selection UI.",
            "Sync/offline shows concepts but not a domain-by-domain queue/conflict ledger.",
        ],
    },
]


def functionality_markdown():
    lines = ["## Functionality Inventory", ""]
    for item in FUNCTIONALITY:
        lines.append(f"### {item['domain']}")
        lines.append("")
        lines.append("Available:")
        for entry in item["available"]:
            lines.append(f"- {entry}")
        lines.append("")
        lines.append("Functionality gaps:")
        for entry in item["gaps"]:
            lines.append(f"- {entry}")
        lines.append("")
    return lines


def annotated_markdown():
    lines = [
        "## Annotated Screenshot Evidence",
        "",
        "These screenshots are marked with numbered callouts. The full findings appendix remains the complete measured list; this section points to the most important visible failures and improvements on the actual captured UI.",
        "",
    ]
    for spec in ANNOTATED_SCREENSHOTS:
        rel = annotated_image_path(spec).relative_to(ROOT).as_posix()
        lines.extend([f"### {spec['title']}", "", f"![{spec['title']}]({rel})", ""])
        for idx, callout in enumerate(spec["callouts"], start=1):
            lines.append(f"{idx}. Issue: {callout['issue']} Improvement: {callout['improvement']}")
        lines.append("")
    return lines


def write_markdown(data, findings, route_rows, interaction_rows):
    severity = Counter(item["severity"] for item in findings)
    area = Counter(item["area"] for item in findings)
    screenshots = len(list(ASSET_DIR.glob("*.png")))
    lines = [
        "# Personal Server UX/UI and Functionality Audit",
        "",
        "Date: 2026-07-01",
        "Method: Playwright route audit, interaction-state audit, static source review, and PDF render verification.",
        "",
        "## Coverage",
        "",
        f"- Route/viewport states audited: {len(route_rows)}",
        f"- Interactive popup/sheet/dialog states audited: {len(interaction_rows)}",
        f"- Screenshots captured: {screenshots}",
        f"- Findings: {len(findings)}",
        f"- Critical: {severity['critical']}",
        f"- High: {severity['high']}",
        f"- Medium: {severity['medium']}",
        "",
        "## Finding Areas",
        "",
    ]
    for name, count in area.most_common():
        lines.append(f"- {name}: {count}")
    lines.extend([
        "",
        "## Initial Analysis",
        "",
        "- The app is now broad: it is not one dashboard, it is a private personal operating surface with daily review, module apps, settings, integrations, imports, local cache, widgets, notifications, and an external assistant bridge.",
        "- The main product issue is not only visual style. The deeper issue is that functionality is powerful but scattered across hot paths, settings routes, module tabs, and dialogs without a clean mental model.",
        "- The best design direction remains: mobile is the daily action surface, desktop is the expanded review workspace, settings owns configuration/imports/data, and Today should only show what is due or changed.",
        "- Functionality and working-state reliability must be tracked separately. A feature can exist while still being hard to discover, badly placed, or insufficiently configurable.",
        "",
    ])
    lines.extend(functionality_markdown())
    lines.extend([
        "## Interaction-State Coverage",
        "",
    ])
    for row in interaction_rows:
        inventory = row.get("metrics", {}).get("inventory", {})
        lines.append(
            f"- {row['group']} `{row['path']}` - {row['state']}: "
            f"{len(inventory.get('dialogs', []))} dialogs, "
            f"{len(inventory.get('controls', []))} controls, "
            f"{len(inventory.get('forms', []))} form/control fields."
        )
    lines.extend([""])
    lines.extend(annotated_markdown())
    lines.extend(["", "## Complete Findings", ""])
    for f in sorted(findings, key=lambda f: (severity_rank(f["severity"]), f["kind"], f["group"], f["path"], f["state"])):
        state = f" [{f['state']}]" if f.get("state") else ""
        lines.append(f"- [{f['severity']}] {f['kind']} {f['group']} `{f['path']}`{state} - {f['area']}: {f['issue']} Recommendation: {f['recommendation']}")
    lines.extend([
        "",
        "## Evidence",
        f"- Raw JSON: `{RESULTS_PATH.as_posix()}`",
        f"- Screenshots: `{ASSET_DIR.as_posix()}`",
    ])
    MD_PATH.write_text("\n".join(lines) + "\n", encoding="utf-8")


def summary_table(data, findings, route_rows, interaction_rows):
    severity = Counter(item["severity"] for item in findings)
    screenshots = len(list(ASSET_DIR.glob("*.png")))
    rows = [
        [p("Routes", "TableHeader"), p("Interactions", "TableHeader"), p("Screenshots", "TableHeader"), p("Findings", "TableHeader"), p("Critical", "TableHeader"), p("High", "TableHeader")],
        [p(len(route_rows), "TableCellBold"), p(len(interaction_rows), "TableCellBold"), p(screenshots, "TableCellBold"), p(len(findings), "TableCellBold"), p(severity["critical"], "TableCellBold"), p(severity["high"], "TableCellBold")],
    ]
    return table(rows, [0.8 * inch, 1.0 * inch, 1.0 * inch, 0.9 * inch, 0.8 * inch, 0.8 * inch])


def area_table(findings):
    area = Counter(item["area"] for item in findings)
    rows = [[p("Area", "TableHeader"), p("Count", "TableHeader")]]
    for name, count in area.most_common():
        rows.append([p(name, "TableCell"), p(count, "TableCellBold")])
    return table(rows, [4.8 * inch, 0.8 * inch])


def interaction_table(interaction_rows):
    rows = [[p("Domain", "TableHeader"), p("State", "TableHeader"), p("Route", "TableHeader"), p("Inventory", "TableHeader"), p("Opened", "TableHeader")]]
    for row in interaction_rows:
        inventory = row.get("metrics", {}).get("inventory", {})
        inv = f"{len(inventory.get('dialogs', []))} dialog(s), {len(inventory.get('controls', []))} controls, {len(inventory.get('forms', []))} form/control fields"
        rows.append([
            p(row.get("group", ""), "TableCell"),
            p(row.get("state", ""), "TableCellBold"),
            p(row.get("path", ""), "TableCell"),
            p(inv, "TableCell"),
            p(row.get("openedTarget") or "Not opened / static state", "TableCell"),
        ])
    return table(rows, [0.8 * inch, 1.5 * inch, 1.25 * inch, 2.0 * inch, 1.0 * inch])


def route_table(route_rows):
    rows = [[p("Surface", "TableHeader"), p("Route", "TableHeader"), p("Controls", "TableHeader"), p("Issues", "TableHeader")]]
    for row in route_rows:
        inv = row.get("metrics", {}).get("inventory", {})
        controls = len(inv.get("controls", []))
        issues = "; ".join(
            f"{f['severity']} {f['area']}: {f['issue']}"
            for f in sorted(row.get("findings", []), key=lambda x: severity_rank(x["severity"]))[:2]
        ) or "No automated issue"
        rows.append([p(row.get("group", ""), "TableCell"), p(row.get("path", ""), "TableCell"), p(str(controls), "TableCellBold"), p(issues, "TableCell")])
    return table(rows, [1.05 * inch, 1.55 * inch, 0.55 * inch, 3.2 * inch])


def findings_tables(findings):
    ordered = sorted(findings, key=lambda f: (severity_rank(f["severity"]), f["area"], f["kind"], f["group"], f["path"], f["state"]))
    flowables = []
    for index, chunk in enumerate(chunked(ordered, 36), start=1):
        if index > 1:
            flowables.append(Spacer(1, 8))
        rows = [[p("Severity", "TableHeader"), p("Kind", "TableHeader"), p("Surface", "TableHeader"), p("Route / State", "TableHeader"), p("Issue", "TableHeader"), p("Recommendation", "TableHeader")]]
        for f in chunk:
            route_state = f"{f['path']}" + (f" / {f['state']}" if f.get("state") else "")
            rows.append([
                p(f["severity"], "TableCellBold"),
                p(f["kind"], "TableCell"),
                p(f["group"], "TableCell"),
                p(route_state, "TableCell"),
                p(f"{f['area']}: {f['issue']}", "TableCell"),
                p(f["recommendation"], "TableCell"),
            ])
        flowables.append(table(rows, [0.55 * inch, 0.55 * inch, 0.8 * inch, 1.25 * inch, 1.75 * inch, 1.85 * inch]))
    return flowables


def add_functionality_section(story):
    story.append(p("Functionality Inventory", "H1"))
    story.append(p("This section is intentionally separate from whether screens are working. It describes what the app currently allows users to do, what is configurable, and what functional gaps remain.", "Body"))
    for item in FUNCTIONALITY:
        story.append(p(item["domain"], "H2"))
        story.append(p("Available", "Body"))
        story.append(bullets(item["available"]))
        story.append(p("Functionality gaps", "Body"))
        story.append(bullets(item["gaps"]))
        story.append(Spacer(1, 4))


def build_pdf(data, findings, route_rows, interaction_rows):
    doc = SimpleDocTemplate(
        str(PDF_PATH),
        pagesize=A4,
        rightMargin=0.5 * inch,
        leftMargin=0.5 * inch,
        topMargin=0.55 * inch,
        bottomMargin=0.62 * inch,
        title="Personal Server UX/UI and Functionality Audit",
    )
    story = []
    story.append(p("Personal Server UX/UI and Functionality Audit", "Title"))
    story.append(p("Expanded Playwright evidence report - route coverage, interaction states, functionality inventory, and working-state risks", "Subtitle"))
    story.append(p("Date: 2026-07-01. Scope: authenticated native Android app shell, sampled desktop app parity, public/auth surfaces, subpages, settings subsections, module tabs, and popup/dialog/sheet states.", "Body"))
    story.append(p("Method: Playwright route audit with mocked authenticated API data, Samsung S24 Ultra viewport, small Android stress viewport, desktop viewport, and interactive state opening for key modals and sheets.", "Body"))
    story.append(Spacer(1, 8))
    story.append(summary_table(data, findings, route_rows, interaction_rows))
    story.append(Spacer(1, 12))
    story.append(p("Executive read", "H1"))
    story.append(bullets([
        "The app has a large amount of real functionality, but too much of it is hidden behind dense settings, oversized cards, small controls, or mixed hot-path/configuration flows.",
        "The biggest current UX risk is not whether features exist. It is whether users can understand what is available, configure only what they need, and trust what data is cached, synced, stale, or local.",
        "Finance, Habits, Training, Media, Assistant, Notifications, Widgets, Health Connect, payment detection, imports, and agent keys all have functional surfaces. Several still need clearer interaction contracts.",
        "The expanded pass found 246 measured findings across 94 route/viewport states and 26 interaction states.",
        "Critical layout failures remain in native Spotify personal, native stream history modal, and desktop Habits due local horizontal overflow.",
    ]))
    story.append(Spacer(1, 8))
    story.append(p("Measured findings by area", "H2"))
    story.append(area_table(findings))

    story.append(PageBreak())
    story.append(p("Initial Analysis", "H1"))
    story.append(p("The app should be judged as a private personal ledger, not a generic dashboard. The most important user questions are: what changed, what is due, what needs attention, what is cached, and what can I safely configure or hide.", "Body"))
    story.append(bullets([
        "Information architecture: modules exist, but settings, imports, data deletion, widgets, notifications, and integrations are cross-cutting concerns. Those cross-cutting areas need a clearer control center.",
        "Navigation: the native shell has the right app-switcher direction, but the top selector, settings button, bottom tabs, module tabs, and settings index can still duplicate navigation responsibilities.",
        "Interaction: the app has many modals and sheets. They need consistent anatomy: title, current state, required fields, save/cancel, destructive confirmation, and visible feedback.",
        "Configuration: feature enablement, home visibility, widget visibility, and sync enablement exist. The missing piece is a visual preview of how those choices affect Today, widgets, and navigation.",
        "Data validity: cache and sync are mentioned, but domain-level freshness, queued writes, conflicts, and failed background sync are not consistently visible.",
        "Mobile usability: repeated actions like logging habits, entering transactions, adding sets, and correcting media should use fewer tiny controls and more task-specific sheets.",
    ]))
    story.append(p("Working-state risks", "H2"))
    story.append(p("This is separate from functionality. A feature can exist but still fail in use because state, failure, retry, or feedback is incomplete.", "Body"))
    story.append(bullets([
        "No domain-level sync queue/conflict screen exists for cache-first mobile behavior.",
        "Assistant does not expose socket/agent/message lifecycle states.",
        "Media response contract can make available data appear empty.",
        "Payment detection needs notification de-duplication and review grouping.",
        "Bottom tabbar and Android gesture clearance are still fragile on multiple routes.",
        "Several modals expose many controls below mobile tap-size target.",
    ]))

    story.append(PageBreak())
    add_functionality_section(story)

    story.append(PageBreak())
    story.append(p("Interaction-State Coverage", "H1"))
    story.append(p("These states were opened with Playwright, then inventoried for visible dialogs, controls, and form fields. This is the main addition beyond the earlier route-only report.", "Body"))
    story.append(interaction_table(interaction_rows))

    story.append(PageBreak())
    story.append(p("Annotated Screenshot Evidence", "H1"))
    story.append(p("The screenshots below are marked with numbered callouts. Each callout points to a visible failure on the captured UI and pairs it with a concrete improvement direction.", "Body"))
    for idx, spec in enumerate(ANNOTATED_SCREENSHOTS):
        if idx > 0:
            story.append(PageBreak())
        for flowable in annotated_screenshot_flowable(spec, width=3.75 * inch):
            story.append(flowable)
        story.append(Spacer(1, 6))

    story.append(PageBreak())
    story.append(p("Priority Recommendations", "H1"))
    recommendations = [
        ["P0", "Repair hard layout failures", "Remove native Spotify personal overflow, stream history modal overflow, and desktop Habits overflow. Keep local-container overflow assertions."],
        ["P0", "Add cache/sync state model", "Domain freshness, stale/offline labels, queued writes, failed writes, conflict review, and manual refresh should be consistent across modules."],
        ["P0", "Fix payment detection spam path", "Group notifications by transaction fingerprint, enforce cooldown/dedupe, and show a review queue instead of repeated notifications."],
        ["P1", "Make Finance transaction-first", "Move setup/filter/configuration chrome out of the hot path, add Cashew-quality budget cards and meaningful spending graphs."],
        ["P1", "Finish Assistant operational states", "User socket, agent socket, message persistence, read/thinking/finish/fail/retry/offline states must be visible."],
        ["P1", "Create a native form/sheet standard", "Apply one mobile anatomy for add/edit/delete sheets across finance, habits, workouts, media, and agent keys."],
        ["P1", "Make configuration understandable", "Provide previews for enabled modules, Today cards, widget content, lock-screen content, notifications, and sync behavior."],
        ["P2", "Upgrade Media domain model", "Add franchise/season/source-record/match-confidence model and bulk correction queue."],
    ]
    rec_rows = [[p("Priority", "TableHeader"), p("Workstream", "TableHeader"), p("Outcome", "TableHeader")]]
    for row in recommendations:
        rec_rows.append([p(row[0], "TableCellBold"), p(row[1], "TableCellBold"), p(row[2], "TableCell")])
    story.append(table(rec_rows, [0.65 * inch, 1.75 * inch, 4.0 * inch]))

    story.append(PageBreak())
    story.append(p("Route And Subpage Matrix", "H1"))
    story.append(p("Every route/query state captured by Playwright is listed below, including native, small Android stress, desktop, public/auth, module tabs, and settings subsections.", "Body"))
    for idx, chunk in enumerate(chunked(route_rows, 36), start=1):
        if idx > 1:
            story.append(PageBreak())
        story.append(route_table(chunk))

    story.append(PageBreak())
    story.append(p("Complete Measured Findings", "H1"))
    story.append(p("This appendix contains every automated finding emitted by the expanded Playwright pass. Repeated issues are preserved where reproduced in separate route or interaction states.", "Body"))
    for flowable in findings_tables(findings):
        story.append(flowable)

    story.append(PageBreak())
    story.append(p("Evidence Index", "H1"))
    story.append(p(f"Raw JSON: {RESULTS_PATH}", "Body"))
    story.append(p(f"Screenshots folder: {ASSET_DIR}", "Body"))
    story.append(p("Representative screenshots are embedded above. The full evidence folder contains every route and interaction screenshot from the Playwright run.", "Body"))

    doc.build(story, onFirstPage=page_number, onLaterPages=page_number)


def main():
    data = load_results()
    findings, route_rows, interaction_rows = normalize_findings(data)
    ensure_annotated_screenshots()
    write_markdown(data, findings, route_rows, interaction_rows)
    build_pdf(data, findings, route_rows, interaction_rows)
    print(PDF_PATH)
    print(MD_PATH)


if __name__ == "__main__":
    main()
