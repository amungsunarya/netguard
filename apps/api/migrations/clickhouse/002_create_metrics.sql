CREATE TABLE IF NOT EXISTS netguard.metrics (
    metric_name LowCardinality(String),
    timestamp DateTime64(3) DEFAULT now64(3),
    value Float64
)
ENGINE = MergeTree()
ORDER BY (metric_name, timestamp)
PARTITION BY toYYYYMM(timestamp)
TTL toDateTime(timestamp) + INTERVAL 90 DAY;