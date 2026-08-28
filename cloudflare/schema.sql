PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS admin (
    id_admin INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pelanggan (
    id_pelanggan INTEGER PRIMARY KEY AUTOINCREMENT,
    nama_pelanggan TEXT NOT NULL,
    alamat TEXT,
    no_hp TEXT
);

CREATE TABLE IF NOT EXISTS barang (
    id_barang INTEGER PRIMARY KEY AUTOINCREMENT,
    nama_barang TEXT NOT NULL,
    harga REAL NOT NULL DEFAULT 0,
    stok INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS penjualan (
    id_penjualan INTEGER PRIMARY KEY AUTOINCREMENT,
    id_pelanggan INTEGER NOT NULL,
    id_barang INTEGER NOT NULL,
    jumlah INTEGER NOT NULL DEFAULT 1,
    harga REAL NOT NULL DEFAULT 0,
    subtotal REAL NOT NULL DEFAULT 0,
    total_harga REAL NOT NULL DEFAULT 0,
    waktu TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (id_pelanggan)
        REFERENCES pelanggan(id_pelanggan)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    FOREIGN KEY (id_barang)
        REFERENCES barang(id_barang)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

INSERT OR IGNORE INTO admin (
    id_admin,
    username,
    password
) VALUES (
    1,
    'admin',
    'admin123'
);

INSERT OR IGNORE INTO pelanggan (
    id_pelanggan,
    nama_pelanggan,
    alamat,
    no_hp
) VALUES (
    1,
    'Budi Santoso',
    'Surabaya',
    '081234567890'
);

INSERT OR IGNORE INTO barang (
    id_barang,
    nama_barang,
    harga,
    stok
) VALUES
(
    1,
    'Air Mineral',
    5000,
    50
),
(
    2,
    'Mie Instan',
    3500,
    100
),
(
    3,
    'Teh Botol',
    5000,
    50
);

CREATE INDEX IF NOT EXISTS idx_penjualan_pelanggan
ON penjualan(id_pelanggan);

CREATE INDEX IF NOT EXISTS idx_penjualan_barang
ON penjualan(id_barang);

CREATE INDEX IF NOT EXISTS idx_penjualan_waktu
ON penjualan(waktu);