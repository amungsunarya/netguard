CREATE TABLE IF NOT EXISTS netguard.logs (
    id UUID DEFAULT generateUUIDv4(),
    timestamp DateTime64(3) DEFAULT now64(3),
    level LowCardinality(String),
    type LowCardinality(String),
    source String,
    message String,
    metadata String DEFAULT ''
)
ENGINE = MergeTree()
ORDER BY (timestamp, level, source)
PARTITION BY toYYYYMM(timestamp)
TTL toDateTime(timestamp) + INTERVAL 30 DAY;