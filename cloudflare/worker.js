const json = (data, status = 200) => {
    return new Response(
        JSON.stringify(data),
        {
            status,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Content-Type, Authorization",
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS"
            }
        }
    );
};

function corsResponse(response) {
    const headers = new Headers(response.headers);

    headers.set("Access-Control-Allow-Origin", "*");
    headers.set(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization"
    );
    headers.set(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS"
    );

    return new Response(
        response.body,
        {
            status: response.status,
            headers
        }
    );
}

async function hashPassword(password) {
    const data = new TextEncoder().encode(password);

    const hashBuffer = await crypto.subtle.digest(
        "SHA-256",
        data
    );

    return Array.from(
        new Uint8Array(hashBuffer)
    )
        .map(byte => byte.toString(16).padStart(2, "0"))
        .join("");
}

function getToken(request) {
    const auth = request.headers.get("Authorization") || "";

    if (!auth.startsWith("Bearer ")) {
        return null;
    }

    return auth.substring(7);
}

function requireAuth(request) {
    const token = getToken(request);

    if (!token) {
        throw new Error("UNAUTHORIZED");
    }

    return token;
}

async function body(request) {
    try {
        return await request.json();
    } catch {
        return {};
    }
}

async function login(env, data) {
    const username = String(data.username || "").trim();
    const password = String(data.password || "");

    if (!username || !password) {
        return json({
            success: false,
            message: "Username dan password wajib diisi."
        }, 400);
    }

    const admin = await env.DB
        .prepare(`
            SELECT id_admin, username, password
            FROM admin
            WHERE username = ?
            LIMIT 1
        `)
        .bind(username)
        .first();

    if (!admin) {
        return json({
            success: false,
            message: "Username atau password salah."
        }, 401);
    }

    /*
     * Untuk admin bawaan:
     * password = admin123
     *
     * Kita mendukung password plaintext bawaan
     * dan SHA-256 untuk password yang sudah di-hash.
     */

    const hashed = await hashPassword(password);

    const passwordValid =
        admin.password === password ||
        admin.password === hashed;

    if (!passwordValid) {
        return json({
            success: false,
            message: "Username atau password salah."
        }, 401);
    }

    return json({
        success: true,
        token: btoa(
            `${admin.id_admin}:${admin.username}`
        ),
        admin: {
            id: admin.id_admin,
            username: admin.username
        }
    });
}


// ======================================================
// DASHBOARD
// ======================================================

async function dashboard(env) {
    const pelanggan = await env.DB
        .prepare(`
            SELECT COUNT(*) AS total
            FROM pelanggan
        `)
        .first();

    const barang = await env.DB
        .prepare(`
            SELECT COUNT(*) AS total
            FROM barang
        `)
        .first();

    const stokMenipis = await env.DB
        .prepare(`
            SELECT COUNT(*) AS total
            FROM barang
            WHERE stok <= 5
        `)
        .first();

    const transaksi = await env.DB
        .prepare(`
            SELECT COUNT(*) AS total
            FROM penjualan
        `)
        .first();

    const penjualan = await env.DB
        .prepare(`
            SELECT COALESCE(SUM(total_harga), 0) AS total
            FROM penjualan
        `)
        .first();

    const terbaru = await env.DB
        .prepare(`
            SELECT
                p.id_penjualan,
                p.jumlah,
                p.total_harga,
                p.waktu,
                pl.nama_pelanggan,
                b.nama_barang
            FROM penjualan p

            INNER JOIN pelanggan pl
                ON p.id_pelanggan = pl.id_pelanggan

            INNER JOIN barang b
                ON p.id_barang = b.id_barang

            ORDER BY
                p.waktu DESC,
                p.id_penjualan DESC

            LIMIT 5
        `)
        .all();

    return json({
        success: true,

        stats: {
            pelanggan: Number(pelanggan.total),
            barang: Number(barang.total),
            stokMenipis: Number(stokMenipis.total),
            transaksi: Number(transaksi.total),
            penjualan: Number(penjualan.total)
        },

        terbaru: terbaru.results
    });
}


// ======================================================
// PELANGGAN
// ======================================================

async function getPelanggan(env) {
    const result = await env.DB
        .prepare(`
            SELECT
                id_pelanggan,
                nama_pelanggan,
                alamat,
                no_hp
            FROM pelanggan
            ORDER BY id_pelanggan DESC
        `)
        .all();

    return json({
        success: true,
        data: result.results
    });
}

async function savePelanggan(env, data) {
    const id = data.id_pelanggan
        ? Number(data.id_pelanggan)
        : null;

    const nama = String(
        data.nama_pelanggan || ""
    ).trim();

    const alamat = String(
        data.alamat || ""
    ).trim();

    const no_hp = String(
        data.no_hp || ""
    ).trim();

    if (!nama) {
        return json({
            success: false,
            message: "Nama pelanggan wajib diisi."
        }, 400);
    }

    if (!alamat) {
        return json({
            success: false,
            message: "Alamat pelanggan wajib diisi."
        }, 400);
    }

    if (!no_hp) {
        return json({
            success: false,
            message: "Nomor HP wajib diisi."
        }, 400);
    }

    if (id) {
        await env.DB
            .prepare(`
                UPDATE pelanggan
                SET
                    nama_pelanggan = ?,
                    alamat = ?,
                    no_hp = ?
                WHERE id_pelanggan = ?
            `)
            .bind(
                nama,
                alamat,
                no_hp,
                id
            )
            .run();

        return json({
            success: true,
            message: "Pelanggan berhasil diperbarui."
        });
    }

    await env.DB
        .prepare(`
            INSERT INTO pelanggan
            (
                nama_pelanggan,
                alamat,
                no_hp
            )
            VALUES (?, ?, ?)
        `)
        .bind(
            nama,
            alamat,
            no_hp
        )
        .run();

    return json({
        success: true,
        message: "Pelanggan berhasil ditambahkan."
    });
}

async function deletePelanggan(env, id) {
    const used = await env.DB
        .prepare(`
            SELECT COUNT(*) AS total
            FROM penjualan
            WHERE id_pelanggan = ?
        `)
        .bind(id)
        .first();

    if (Number(used.total) > 0) {
        return json({
            success: false,
            message:
                "Pelanggan tidak dapat dihapus karena sudah memiliki transaksi."
        }, 400);
    }

    await env.DB
        .prepare(`
            DELETE FROM pelanggan
            WHERE id_pelanggan = ?
        `)
        .bind(id)
        .run();

    return json({
        success: true,
        message: "Pelanggan berhasil dihapus."
    });
}


// ======================================================
// BARANG
// ======================================================

async function getBarang(env) {
    const result = await env.DB
        .prepare(`
            SELECT
                id_barang,
                nama_barang,
                harga,
                stok
            FROM barang
            ORDER BY id_barang DESC
        `)
        .all();

    return json({
        success: true,
        data: result.results
    });
}

async function saveBarang(env, data) {
    const id = data.id_barang
        ? Number(data.id_barang)
        : null;

    const nama = String(
        data.nama_barang || ""
    ).trim();

    const harga = Number(data.harga);
    const stok = Number(data.stok);

    if (!nama) {
        return json({
            success: false,
            message: "Nama barang wajib diisi."
        }, 400);
    }

    if (!Number.isFinite(harga) || harga < 0) {
        return json({
            success: false,
            message: "Harga barang tidak valid."
        }, 400);
    }

    if (!Number.isInteger(stok) || stok < 0) {
        return json({
            success: false,
            message: "Stok tidak valid."
        }, 400);
    }

    if (id) {
        await env.DB
            .prepare(`
                UPDATE barang
                SET
                    nama_barang = ?,
                    harga = ?,
                    stok = ?
                WHERE id_barang = ?
            `)
            .bind(
                nama,
                harga,
                stok,
                id
            )
            .run();

        return json({
            success: true,
            message: "Barang berhasil diperbarui."
        });
    }

    await env.DB
        .prepare(`
            INSERT INTO barang
            (
                nama_barang,
                harga,
                stok
            )
            VALUES (?, ?, ?)
        `)
        .bind(
            nama,
            harga,
            stok
        )
        .run();

    return json({
        success: true,
        message: "Barang berhasil ditambahkan."
    });
}

async function deleteBarang(env, id) {
    const used = await env.DB
        .prepare(`
            SELECT COUNT(*) AS total
            FROM penjualan
            WHERE id_barang = ?
        `)
        .bind(id)
        .first();

    if (Number(used.total) > 0) {
        return json({
            success: false,
            message:
                "Barang tidak dapat dihapus karena sudah memiliki transaksi."
        }, 400);
    }

    await env.DB
        .prepare(`
            DELETE FROM barang
            WHERE id_barang = ?
        `)
        .bind(id)
        .run();

    return json({
        success: true,
        message: "Barang berhasil dihapus."
    });
}


// ======================================================
// TRANSAKSI
// ======================================================

async function createTransaction(env, data) {
    const idPelanggan = Number(
        data.id_pelanggan
    );

    const idBarang = Number(
        data.id_barang
    );

    const jumlah = Number(
        data.jumlah
    );

    if (
        !Number.isInteger(idPelanggan) ||
        !Number.isInteger(idBarang) ||
        !Number.isInteger(jumlah) ||
        jumlah <= 0
    ) {
        return json({
            success: false,
            message: "Data transaksi tidak valid."
        }, 400);
    }

    const barang = await env.DB
        .prepare(`
            SELECT
                id_barang,
                nama_barang,
                harga,
                stok
            FROM barang
            WHERE id_barang = ?
            LIMIT 1
        `)
        .bind(idBarang)
        .first();

    if (!barang) {
        return json({
            success: false,
            message: "Barang tidak ditemukan."
        }, 404);
    }

    if (Number(barang.stok) < jumlah) {
        return json({
            success: false,
            message:
                `Stok tidak cukup. Stok tersedia: ${barang.stok}`
        }, 400);
    }

    const pelanggan = await env.DB
        .prepare(`
            SELECT id_pelanggan
            FROM pelanggan
            WHERE id_pelanggan = ?
            LIMIT 1
        `)
        .bind(idPelanggan)
        .first();

    if (!pelanggan) {
        return json({
            success: false,
            message: "Pelanggan tidak ditemukan."
        }, 404);
    }

    const harga = Number(barang.harga);
    const subtotal = harga * jumlah;
    const total = subtotal;

    await env.DB.batch([
        env.DB
            .prepare(`
                INSERT INTO penjualan
                (
                    id_pelanggan,
                    id_barang,
                    jumlah,
                    harga,
                    subtotal,
                    total_harga
                )
                VALUES (?, ?, ?, ?, ?, ?)
            `)
            .bind(
                idPelanggan,
                idBarang,
                jumlah,
                harga,
                subtotal,
                total
            ),

        env.DB
            .prepare(`
                UPDATE barang
                SET stok = stok - ?
                WHERE id_barang = ?
            `)
            .bind(
                jumlah,
                idBarang
            )
    ]);

    return json({
        success: true,
        message: "Transaksi berhasil disimpan.",
        total
    });
}


// ======================================================
// HISTORI
// ======================================================

async function getHistory(env) {
    const result = await env.DB
        .prepare(`
            SELECT
                p.id_penjualan,
                p.jumlah,
                p.harga,
                p.subtotal,
                p.total_harga,
                p.waktu,

                pl.id_pelanggan,
                pl.nama_pelanggan,

                b.id_barang,
                b.nama_barang

            FROM penjualan p

            INNER JOIN pelanggan pl
                ON p.id_pelanggan = pl.id_pelanggan

            INNER JOIN barang b
                ON p.id_barang = b.id_barang

            ORDER BY
                p.waktu DESC,
                p.id_penjualan DESC
        `)
        .all();

    return json({
        success: true,
        data: result.results
    });
}

async function deleteTransaction(env, id) {
    const transaction = await env.DB
        .prepare(`
            SELECT
                id_penjualan,
                id_barang,
                jumlah
            FROM penjualan
            WHERE id_penjualan = ?
            LIMIT 1
        `)
        .bind(id)
        .first();

    if (!transaction) {
        return json({
            success: false,
            message: "Transaksi tidak ditemukan."
        }, 404);
    }

    await env.DB.batch([
        env.DB
            .prepare(`
                UPDATE barang
                SET stok = stok + ?
                WHERE id_barang = ?
            `)
            .bind(
                Number(transaction.jumlah),
                Number(transaction.id_barang)
            ),

        env.DB
            .prepare(`
                DELETE FROM penjualan
                WHERE id_penjualan = ?
            `)
            .bind(id)
    ]);

    return json({
        success: true,
        message:
            "Transaksi dihapus dan stok dikembalikan."
    });
}


// ======================================================
// REQUEST HANDLER
// ======================================================

export default {
    async fetch(request, env) {

        if (request.method === "OPTIONS") {
            return corsResponse(
                new Response(null, {
                    status: 204
                })
            );
        }

        const url = new URL(request.url);
        const path = url.pathname;

        try {

            // LOGIN
            if (
                path === "/api/login" &&
                request.method === "POST"
            ) {
                return corsResponse(
                    await login(
                        env,
                        await body(request)
                    )
                );
            }


            // Semua endpoint selain login
            // membutuhkan token.
            if (path.startsWith("/api/")) {
                requireAuth(request);
            }


            // DASHBOARD
            if (
                path === "/api/dashboard" &&
                request.method === "GET"
            ) {
                return corsResponse(
                    await dashboard(env)
                );
            }


            // PELANGGAN
            if (
                path === "/api/pelanggan" &&
                request.method === "GET"
            ) {
                return corsResponse(
                    await getPelanggan(env)
                );
            }

            if (
                path === "/api/pelanggan" &&
                request.method === "POST"
            ) {
                return corsResponse(
                    await savePelanggan(
                        env,
                        await body(request)
                    )
                );
            }

            if (
                path.startsWith("/api/pelanggan/") &&
                request.method === "DELETE"
            ) {
                const id =
                    Number(
                        path.split("/").pop()
                    );

                return corsResponse(
                    await deletePelanggan(
                        env,
                        id
                    )
                );
            }


            // BARANG
            if (
                path === "/api/barang" &&
                request.method === "GET"
            ) {
                return corsResponse(
                    await getBarang(env)
                );
            }

            if (
                path === "/api/barang" &&
                request.method === "POST"
            ) {
                return corsResponse(
                    await saveBarang(
                        env,
                        await body(request)
                    )
                );
            }

            if (
                path.startsWith("/api/barang/") &&
                request.method === "DELETE"
            ) {
                const id =
                    Number(
                        path.split("/").pop()
                    );

                return corsResponse(
                    await deleteBarang(
                        env,
                        id
                    )
                );
            }


            // TRANSAKSI
            if (
                path === "/api/transaksi" &&
                request.method === "POST"
            ) {
                return corsResponse(
                    await createTransaction(
                        env,
                        await body(request)
                    )
                );
            }


            // HISTORI
            if (
                path === "/api/histori" &&
                request.method === "GET"
            ) {
                return corsResponse(
                    await getHistory(env)
                );
            }

            if (
                path.startsWith("/api/histori/") &&
                request.method === "DELETE"
            ) {
                const id =
                    Number(
                        path.split("/").pop()
                    );

                return corsResponse(
                    await deleteTransaction(
                        env,
                        id
                    )
                );
            }


            return json({
                success: false,
                message: "Endpoint tidak ditemukan."
            }, 404);

        } catch (error) {

            if (error.message === "UNAUTHORIZED") {
                return json({
                    success: false,
                    message: "Sesi tidak valid."
                }, 401);
            }

            console.error(error);

            return json({
                success: false,
                message: "Terjadi kesalahan server.",
                error: error.message
            }, 500);
        }
    }
};