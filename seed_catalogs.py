#!/usr/bin/env python3
"""Seed the local JSON 'database' with the fixed catalogs.

Local-JSON equivalent of docs/seed.sql. Writes the 4 catalog tables with the
same rows and ids Postgres would assign (1..N in insertion order), and creates
the other 10 table files empty so all 14 exist. Re-running overwrites only the
catalog files; data files are left untouched if they already hold rows.

Usage:
    python seed_catalogs.py            # writes into ./db
    python seed_catalogs.py --db PATH
"""
import argparse
import json
from pathlib import Path

# ---- catalog data (ported 1:1 from docs/seed.sql) ---------------------------
REGIONS = [
    ("Hokkaido", "北海道"),
    ("Tohoku", "東北"),
    ("Kanto", "関東"),
    ("Chubu", "中部"),
    ("Kinki", "近畿"),
    ("Chugoku", "中国"),
    ("Shikoku", "四国"),
    ("Kyushu", "九州"),
]

# (name_en, name_ja, region_name)
PREFECTURES = [
    ("Hokkaido", "北海道", "Hokkaido"),
    ("Aomori", "青森県", "Tohoku"),
    ("Iwate", "岩手県", "Tohoku"),
    ("Miyagi", "宮城県", "Tohoku"),
    ("Akita", "秋田県", "Tohoku"),
    ("Yamagata", "山形県", "Tohoku"),
    ("Fukushima", "福島県", "Tohoku"),
    ("Ibaraki", "茨城県", "Kanto"),
    ("Tochigi", "栃木県", "Kanto"),
    ("Gunma", "群馬県", "Kanto"),
    ("Saitama", "埼玉県", "Kanto"),
    ("Chiba", "千葉県", "Kanto"),
    ("Tokyo", "東京都", "Kanto"),
    ("Kanagawa", "神奈川県", "Kanto"),
    ("Niigata", "新潟県", "Chubu"),
    ("Toyama", "富山県", "Chubu"),
    ("Ishikawa", "石川県", "Chubu"),
    ("Fukui", "福井県", "Chubu"),
    ("Yamanashi", "山梨県", "Chubu"),
    ("Nagano", "長野県", "Chubu"),
    ("Gifu", "岐阜県", "Chubu"),
    ("Shizuoka", "静岡県", "Chubu"),
    ("Aichi", "愛知県", "Chubu"),
    ("Mie", "三重県", "Kinki"),
    ("Shiga", "滋賀県", "Kinki"),
    ("Kyoto", "京都府", "Kinki"),
    ("Osaka", "大阪府", "Kinki"),
    ("Hyogo", "兵庫県", "Kinki"),
    ("Nara", "奈良県", "Kinki"),
    ("Wakayama", "和歌山県", "Kinki"),
    ("Tottori", "鳥取県", "Chugoku"),
    ("Shimane", "島根県", "Chugoku"),
    ("Okayama", "岡山県", "Chugoku"),
    ("Hiroshima", "広島県", "Chugoku"),
    ("Yamaguchi", "山口県", "Chugoku"),
    ("Tokushima", "徳島県", "Shikoku"),
    ("Kagawa", "香川県", "Shikoku"),
    ("Ehime", "愛媛県", "Shikoku"),
    ("Kochi", "高知県", "Shikoku"),
    ("Fukuoka", "福岡県", "Kyushu"),
    ("Saga", "佐賀県", "Kyushu"),
    ("Nagasaki", "長崎県", "Kyushu"),
    ("Kumamoto", "熊本県", "Kyushu"),
    ("Oita", "大分県", "Kyushu"),
    ("Miyazaki", "宮崎県", "Kyushu"),
    ("Kagoshima", "鹿児島県", "Kyushu"),
    ("Okinawa", "沖縄県", "Kyushu"),
]

# (code, name_en, name_ja, rank_order, description)
RANKS = [
    ("Honso", "Supreme Head Shrine of All Shinto", "本宗", 0,
     "Unique to Ise Jingū; revered by Jinja Honchō as the head of all Shinto shrines and placed outside the ranking system."),
    ("Sohonsha", "Head Shrine of a Network", "総本社", 1,
     "The origin and head shrine of a nationwide network sharing one deity (e.g. the head of all Inari or Hachiman shrines)."),
    ("Chokusaisha", "Imperial Envoy Shrine", "勅祭社", 2,
     "A shrine to whose principal festivals an imperial envoy (chokushi) is dispatched by the Emperor."),
    ("Ichinomiya", "Highest Provincial Shrine", "一宮", 3,
     "The shrine of highest status within a historical province; first visited by the provincial governor."),
    ("Myojin-Taisha", "Eminent Engishiki Shrine", "名神大社", 4,
     "A top-tier shrine of long-recognized eminence within the Engishiki listing (the Myōjin Taisha class)."),
    ("Shikinai-sha", "Engishiki-listed Shrine", "式内社", 5,
     "A shrine recorded in the 10th-century Engishiki, attesting ancient official recognition."),
    ("Kanpei-Taisha", "Major Imperial Shrine", "官幣大社", 6,
     "Highest class of imperial shrine under the modern system (1871–1946), receiving offerings from the imperial court."),
    ("Kokuhei-Taisha", "Major National Shrine", "国幣大社", 7,
     "Highest class of national shrine under the modern system, receiving offerings from provincial governments."),
    ("Kanpei-Chusha", "Mid Imperial Shrine", "官幣中社", 8,
     "Middle class of imperial shrine under the modern system."),
    ("Kokuhei-Chusha", "Mid National Shrine", "国幣中社", 9,
     "Middle class of national shrine under the modern system."),
    ("Kanpei-Shosha", "Minor Imperial Shrine", "官幣小社", 10,
     "Lowest class of imperial shrine under the modern system."),
    ("Kokuhei-Shosha", "Minor National Shrine", "国幣小社", 11,
     "Lowest class of national shrine under the modern system."),
    ("Bekkaku-Kanpeisha", "Special Imperial Shrine", "別格官幣社", 12,
     "A special imperial class created for shrines honoring those of distinguished service to the state."),
    ("Fu-Ken-sha", "Prefectural Shrine", "府県社", 13,
     "Local shrine receiving offerings from a metropolitan or prefectural government."),
    ("Gosha", "District Shrine", "郷社", 14,
     "Local shrine ranked below prefectural shrines, tied to a district."),
    ("Sonsha", "Village Shrine", "村社", 15,
     "A village community shrine; the lowest ranked tier of the modern system."),
    ("Beppyo-sha", "Special-List Shrine (modern)", "別表神社", 20,
     "A post-1946 administrative designation by Jinja Honchō for notable shrines; not a revived prestige rank."),
]

# (code, name_en, name_ja, group_label)
PRAYER_CATEGORIES = [
    ("Victory", "Victory", "勝運", "Fortune & Success"),
    ("GoodFortune", "Good Fortune", "開運", "Fortune & Success"),
    ("WishFulfillment", "Wish Fulfillment", "心願成就", "Fortune & Success"),
    ("Career", "Career Advancement", "出世", "Fortune & Success"),
    ("CompetitionWin", "Competition Win", "必勝", "Fortune & Success"),
    ("Matchmaking", "Matchmaking", "縁結び", "Love & Family"),
    ("Marriage", "Good Marriage", "良縁", "Love & Family"),
    ("Fertility", "Fertility", "子宝", "Love & Family"),
    ("SafeChildbirth", "Safe Childbirth", "安産", "Love & Family"),
    ("FamilySafety", "Family Safety", "家内安全", "Love & Family"),
    ("Health", "Good Health", "健康", "Health"),
    ("Longevity", "Longevity", "長寿", "Health"),
    ("Recovery", "Recovery from Illness", "病気平癒", "Health"),
    ("Business", "Business Prosperity", "商売繁盛", "Prosperity"),
    ("Wealth", "Wealth", "金運", "Prosperity"),
    ("Harvest", "Bountiful Harvest", "五穀豊穣", "Prosperity"),
    ("WardingEvil", "Warding off Evil", "厄除け", "Protection & Safety"),
    ("Purification", "Purification", "厄祓い", "Protection & Safety"),
    ("DisasterPrevent", "Disaster Prevention", "災難除け", "Protection & Safety"),
    ("TrafficSafety", "Traffic Safety", "交通安全", "Protection & Safety"),
    ("MaritimeSafety", "Maritime Safety", "海上安全", "Protection & Safety"),
    ("Academics", "Academic Success", "学業成就", "Scholarship"),
    ("ExamSuccess", "Exam Success", "合格祈願", "Scholarship"),
    ("NationalPeace", "National Peace", "国家安泰", "Nation"),
    ("NationalProtect", "National Protection", "護国", "Nation"),
]

# The 10 non-catalog tables (created empty so all 14 files exist).
DATA_TABLES = [
    "deities",
    "shrines",
    "shrine_details",
    "shrine_deities",
    "shrine_ranks",
    "shrine_prayer_categories",
    "events",
    "event_deities",
    "event_occurrences",
    "sources",
]


def write_json(path: Path, rows: list) -> None:
    path.write_text(
        json.dumps(rows, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )


def main() -> int:
    ap = argparse.ArgumentParser(description="Seed the local JSON catalog tables.")
    ap.add_argument("--db", default="db", help="Output directory (default: ./db)")
    args = ap.parse_args()

    db = Path(args.db)
    db.mkdir(parents=True, exist_ok=True)

    regions = [
        {"id": i, "name_en": en, "name_ja": ja}
        for i, (en, ja) in enumerate(REGIONS, start=1)
    ]
    region_id = {r["name_en"]: r["id"] for r in regions}

    prefectures = [
        {"id": i, "name_en": en, "name_ja": ja, "region_id": region_id[rn]}
        for i, (en, ja, rn) in enumerate(PREFECTURES, start=1)
    ]
    ranks = [
        {"id": i, "code": c, "name_en": en, "name_ja": ja, "rank_order": ro, "description": d}
        for i, (c, en, ja, ro, d) in enumerate(RANKS, start=1)
    ]
    prayer_categories = [
        {"id": i, "code": c, "name_en": en, "name_ja": ja, "group_label": g}
        for i, (c, en, ja, g) in enumerate(PRAYER_CATEGORIES, start=1)
    ]

    write_json(db / "regions.json", regions)
    write_json(db / "prefectures.json", prefectures)
    write_json(db / "ranks.json", ranks)
    write_json(db / "prayer_categories.json", prayer_categories)

    for t in DATA_TABLES:
        fp = db / f"{t}.json"
        if not fp.exists():
            write_json(fp, [])

    print(
        f"Seeded catalogs into {db}/: "
        f"regions={len(regions)} prefectures={len(prefectures)} "
        f"ranks={len(ranks)} prayer_categories={len(prayer_categories)}"
    )
    print(f"Ensured {len(DATA_TABLES)} empty data-table files exist. (14 tables total)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
