CREATE TABLE IF NOT EXISTS devices (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    ip VARCHAR(45) NOT NULL UNIQUE,
    type VARCHAR(50) NOT NULL,
    site VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'up',
    cpu FLOAT NOT NULL DEFAULT 0,
    memory FLOAT NOT NULL DEFAULT 0,
    uptime VARCHAR(50) DEFAULT '-',
    last_seen VARCHAR(50) DEFAULT '-',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_devices_status ON devices(status);
CREATE INDEX IF NOT EXISTS idx_devices_site ON devices(site);