-- ============================================================
-- CATALOG SEED DATA
-- regions (8) · prefectures (47) · ranks (17) · prayer_categories (25)
-- Run AFTER schema.sql, BEFORE any shrine ingest (the ingest resolves codes -> ids).
-- IDs are GENERATED ALWAYS AS IDENTITY, so FKs are resolved by name/code lookups.
-- ============================================================
-- ------------------------------------------------------------
-- REGIONS (8 traditional regions)
-- ------------------------------------------------------------
INSERT INTO regions (name_en, name_ja) VALUES
  ('Hokkaido', '北海道'),
  ('Tohoku',   '東北'),
  ('Kanto',    '関東'),
  ('Chubu',    '中部'),
  ('Kinki',    '近畿'),
  ('Chugoku',  '中国'),
  ('Shikoku',  '四国'),
  ('Kyushu',   '九州');
-- ------------------------------------------------------------
-- PREFECTURES (47, each mapped to its region by name lookup)
-- Note: Mie is placed in Kinki per the standard 8-region scheme (suits Ise being in-set).
-- ------------------------------------------------------------
INSERT INTO prefectures (name_en, name_ja, region_id)
SELECT p.name_en, p.name_ja, r.id
FROM (VALUES
  ('Hokkaido',  '北海道',   'Hokkaido'),
  ('Aomori',    '青森県',   'Tohoku'),
  ('Iwate',     '岩手県',   'Tohoku'),
  ('Miyagi',    '宮城県',   'Tohoku'),
  ('Akita',     '秋田県',   'Tohoku'),
  ('Yamagata',  '山形県',   'Tohoku'),
  ('Fukushima', '福島県',   'Tohoku'),
  ('Ibaraki',   '茨城県',   'Kanto'),
  ('Tochigi',   '栃木県',   'Kanto'),
  ('Gunma',     '群馬県',   'Kanto'),
  ('Saitama',   '埼玉県',   'Kanto'),
  ('Chiba',     '千葉県',   'Kanto'),
  ('Tokyo',     '東京都',   'Kanto'),
  ('Kanagawa',  '神奈川県', 'Kanto'),
  ('Niigata',   '新潟県',   'Chubu'),
  ('Toyama',    '富山県',   'Chubu'),
  ('Ishikawa',  '石川県',   'Chubu'),
  ('Fukui',     '福井県',   'Chubu'),
  ('Yamanashi', '山梨県',   'Chubu'),
  ('Nagano',    '長野県',   'Chubu'),
  ('Gifu',      '岐阜県',   'Chubu'),
  ('Shizuoka',  '静岡県',   'Chubu'),
  ('Aichi',     '愛知県',   'Chubu'),
  ('Mie',       '三重県',   'Kinki'),
  ('Shiga',     '滋賀県',   'Kinki'),
  ('Kyoto',     '京都府',   'Kinki'),
  ('Osaka',     '大阪府',   'Kinki'),
  ('Hyogo',     '兵庫県',   'Kinki'),
  ('Nara',      '奈良県',   'Kinki'),
  ('Wakayama',  '和歌山県', 'Kinki'),
  ('Tottori',   '鳥取県',   'Chugoku'),
  ('Shimane',   '島根県',   'Chugoku'),
  ('Okayama',   '岡山県',   'Chugoku'),
  ('Hiroshima', '広島県',   'Chugoku'),
  ('Yamaguchi', '山口県',   'Chugoku'),
  ('Tokushima', '徳島県',   'Shikoku'),
  ('Kagawa',    '香川県',   'Shikoku'),
  ('Ehime',     '愛媛県',   'Shikoku'),
  ('Kochi',     '高知県',   'Shikoku'),
  ('Fukuoka',   '福岡県',   'Kyushu'),
  ('Saga',      '佐賀県',   'Kyushu'),
  ('Nagasaki',  '長崎県',   'Kyushu'),
  ('Kumamoto',  '熊本県',   'Kyushu'),
  ('Oita',      '大分県',   'Kyushu'),
  ('Miyazaki',  '宮崎県',   'Kyushu'),
  ('Kagoshima', '鹿児島県', 'Kyushu'),
  ('Okinawa',   '沖縄県',   'Kyushu')
) AS p(name_en, name_ja, region_name)
JOIN regions r ON r.name_en = p.region_name;
-- ------------------------------------------------------------
-- RANKS (consolidated cross-system list; rank_order 1 = highest prestige)
-- "Highest rank" of a shrine = MIN(rank_order) joined at query time.
-- order 0 is Ise-only; 1-15 are prestige tiers; 20 is a modern administrative tag
-- (gap keeps MIN() meaningful so a Beppyo-sha isn't mistaken for top-tier).
-- ------------------------------------------------------------
INSERT INTO ranks (name_en, description, name_ja, rank_order) VALUES
  ('Honso',             'Supreme Head Shrine of All Shinto', '本宗',       0),
  ('Sohonsha',          'Head Shrine of a Network',          '総本社',     1),
  ('Chokusaisha',       'Imperial Envoy Shrine',             '勅祭社',     2),
  ('Ichinomiya',        'Highest Provincial Shrine',         '一宮',       3),
  ('Myojin-Taisha',     'Eminent Engishiki Shrine',          '名神大社',   4),
  ('Shikinai-sha',      'Engishiki-listed Shrine',           '式内社',     5),
  ('Kanpei-Taisha',     'Major Imperial Shrine',             '官幣大社',   6),
  ('Kokuhei-Taisha',    'Major National Shrine',             '国幣大社',   7),
  ('Kanpei-Chusha',     'Mid Imperial Shrine',               '官幣中社',   8),
  ('Kokuhei-Chusha',    'Mid National Shrine',               '国幣中社',   9),
  ('Kanpei-Shosha',     'Minor Imperial Shrine',             '官幣小社',  10),
  ('Kokuhei-Shosha',    'Minor National Shrine',             '国幣小社',  11),
  ('Bekkaku-Kanpeisha', 'Special Imperial Shrine',           '別格官幣社', 12),
  ('Fu-Ken-sha',        'Prefectural Shrine',                '府県社',    13),
  ('Gosha',             'District Shrine',                   '郷社',      14),
  ('Sonsha',            'Village Shrine',                    '村社',      15),
  ('Beppyo-sha',        'Special-List Shrine (modern)',      '別表神社',   20);
-- ------------------------------------------------------------
-- PRAYER CATEGORIES (the "strong for" facet; 25 goriyaku, grouped for the UI)
-- ------------------------------------------------------------
INSERT INTO prayer_categories (name_en, name_ja, group_label) VALUES
  -- Fortune & Success
  ('Victory',              '勝運',       'Fortune & Success'),
  ('Good Fortune',         '開運',       'Fortune & Success'),
  ('Wish Fulfillment',     '心願成就',   'Fortune & Success'),
  ('Career Advancement',   '出世',       'Fortune & Success'),
  ('Competition Win',      '必勝',       'Fortune & Success'),
  -- Love & Family
  ('Matchmaking',          '縁結び',     'Love & Family'),
  ('Good Marriage',        '良縁',       'Love & Family'),
  ('Fertility',            '子宝',       'Love & Family'),
  ('Safe Childbirth',      '安産',       'Love & Family'),
  ('Family Safety',        '家内安全',   'Love & Family'),
  -- Health
  ('Good Health',          '健康',       'Health'),
  ('Longevity',            '長寿',       'Health'),
  ('Recovery from Illness','病気平癒',   'Health'),
  -- Prosperity
  ('Business Prosperity',  '商売繁盛',   'Prosperity'),
  ('Wealth',               '金運',       'Prosperity'),
  ('Bountiful Harvest',    '五穀豊穣',   'Prosperity'),
  -- Protection & Safety
  ('Warding off Evil',     '厄除け',     'Protection & Safety'),
  ('Purification',         '厄祓い',     'Protection & Safety'),
  ('Disaster Prevention',  '災難除け',   'Protection & Safety'),
  ('Traffic Safety',       '交通安全',   'Protection & Safety'),
  ('Maritime Safety',      '海上安全',   'Protection & Safety'),
  -- Scholarship
  ('Academic Success',     '学業成就',   'Scholarship'),
  ('Exam Success',         '合格祈願',   'Scholarship'),
  -- Nation
  ('National Peace',       '国家安泰',   'Nation'),
  ('National Protection',  '護国',       'Nation');
