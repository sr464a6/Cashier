const API = "/api";

let token =
    localStorage.getItem("cashier_token");

let currentAdmin =
    JSON.parse(
        localStorage.getItem("cashier_admin") || "null"
    );

let customers = [];
let products = [];


// ======================================================
// ELEMENT
// ======================================================

const loginPage =
    document.getElementById("loginPage");

const appPage =
    document.getElementById("appPage");

const loginForm =
    document.getElementById("loginForm");

const loginMessage =
    document.getElementById("loginMessage");

const toast =
    document.getElementById("toast");


// ======================================================
// API
// ======================================================

async function api(
    endpoint,
    options = {}
) {

    const headers = {
        "Content-Type": "application/json",
        ...(options.headers || {})
    };

    if (token) {
        headers.Authorization =
            `Bearer ${token}`;
    }

    const response = await fetch(
        API + endpoint,
        {
            ...options,
            headers
        }
    );

    const data =
        await response.json()
            .catch(() => ({
                success: false,
                message: "Response server tidak valid."
            }));

    if (response.status === 401) {
        logout();
        throw new Error(
            "Sesi telah berakhir."
        );
    }

    if (!response.ok || data.success === false) {
        throw new Error(
            data.message ||
            "Terjadi kesalahan."
        );
    }

    return data;
}


// ======================================================
// LOGIN
// ======================================================

loginForm.addEventListener(
    "submit",
    async event => {

        event.preventDefault();

        loginMessage.textContent =
            "Memproses login...";

        loginMessage.className =
            "message";

        const username =
            document.getElementById(
                "username"
            ).value.trim();

        const password =
            document.getElementById(
                "password"
            ).value;

        try {

            const result =
                await api(
                    "/login",
                    {
                        method: "POST",
                        body: JSON.stringify({
                            username,
                            password
                        })
                    }
                );

            token = result.token;

            currentAdmin =
                result.admin;

            localStorage.setItem(
                "cashier_token",
                token
            );

            localStorage.setItem(
                "cashier_admin",
                JSON.stringify(
                    currentAdmin
                )
            );

            showApp();

        } catch (error) {

            loginMessage.textContent =
                error.message;

            loginMessage.className =
                "message error";
        }
    }
);


// ======================================================
// APP
// ======================================================

function showApp() {

    loginPage.classList.add(
        "hidden"
    );

    appPage.classList.remove(
        "hidden"
    );

    document.getElementById(
        "adminName"
    ).textContent =
        currentAdmin?.username ||
        "admin";

    loadDashboard();
}


// ======================================================
// LOGOUT
// ======================================================

function logout() {

    token = null;
    currentAdmin = null;

    localStorage.removeItem(
        "cashier_token"
    );

    localStorage.removeItem(
        "cashier_admin"
    );

    appPage.classList.add(
        "hidden"
    );

    loginPage.classList.remove(
        "hidden"
    );

    loginForm.reset();
}

document.getElementById(
    "logoutBtn"
).addEventListener(
    "click",
    logout
);


// ======================================================
// NAVIGATION
// ======================================================

document.querySelectorAll(
    ".nav-btn, [data-page]"
).forEach(button => {

    button.addEventListener(
        "click",
        () => {

            const page =
                button.dataset.page;

            if (!page) {
                return;
            }

            openPage(page);
        }
    );
});


function openPage(page) {

    document.querySelectorAll(
        ".content-page"
    ).forEach(section => {

        section.classList.add(
            "hidden"
        );
    });

    const target =
        document.getElementById(
            `page-${page}`
        );

    if (target) {
        target.classList.remove(
            "hidden"
        );
    }

    document.querySelectorAll(
        ".nav-btn"
    ).forEach(button => {

        button.classList.toggle(
            "active",
            button.dataset.page === page
        );
    });


    if (page === "dashboard") {
        loadDashboard();
    }

    if (page === "pelanggan") {
        loadCustomers();
    }

    if (page === "barang") {
        loadProducts();
    }

    if (page === "transaksi") {
        loadTransactionData();
    }

    if (page === "histori") {
        loadHistory();
    }
}


// ======================================================
// DASHBOARD
// ======================================================

async function loadDashboard() {

    try {

        const result =
            await api(
                "/dashboard"
            );

        const stats =
            result.stats;

        document.getElementById(
            "statPelanggan"
        ).textContent =
            stats.pelanggan;

        document.getElementById(
            "statBarang"
        ).textContent =
            stats.barang;

        document.getElementById(
            "statStok"
        ).textContent =
            stats.stokMenipis;

        document.getElementById(
            "statTransaksi"
        ).textContent =
            stats.transaksi;

        document.getElementById(
            "statPenjualan"
        ).textContent =
            rupiah(stats.penjualan);

        renderRecent(
            result.terbaru
        );

    } catch (error) {

        showToast(
            error.message,
            "error"
        );
    }
}


function renderRecent(rows) {

    const tbody =
        document.getElementById(
            "recentTable"
        );

    if (!rows.length) {

        tbody.innerHTML = `
            <tr>
                <td
                    colspan="6"
                    class="empty"
                >
                    Belum ada transaksi.
                </td>
            </tr>
        `;

        return;
    }

    tbody.innerHTML =
        rows.map(row => `

            <tr>

                <td>
                    ${escapeHtml(
                        row.id_penjualan
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        row.nama_pelanggan
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        row.nama_barang
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        row.jumlah
                    )}
                </td>

                <td>
                    ${rupiah(
                        row.total_harga
                    )}
                </td>

                <td>
                    ${formatDate(
                        row.waktu
                    )}
                </td>

            </tr>

        `).join("");
}


// ======================================================
// PELANGGAN
// ======================================================

const customerFormCard =
    document.getElementById(
        "customerFormCard"
    );

document.getElementById(
    "addCustomerBtn"
).addEventListener(
    "click",
    () => {

        resetCustomerForm();

        customerFormCard.classList.remove(
            "hidden"
        );
    }
);

document.getElementById(
    "cancelCustomer"
).addEventListener(
    "click",
    () => {

        customerFormCard.classList.add(
            "hidden"
        );
    }
);


async function loadCustomers() {

    try {

        const result =
            await api(
                "/pelanggan"
            );

        customers =
            result.data;

        renderCustomers();

    } catch (error) {

        showToast(
            error.message,
            "error"
        );
    }
}


function renderCustomers() {

    const tbody =
        document.getElementById(
            "customerTable"
        );

    if (!customers.length) {

        tbody.innerHTML = `
            <tr>
                <td
                    colspan="5"
                    class="empty"
                >
                    Belum ada pelanggan.
                </td>
            </tr>
        `;

        return;
    }

    tbody.innerHTML =
        customers.map(customer => `

            <tr>

                <td>
                    ${escapeHtml(
                        customer.id_pelanggan
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        customer.nama_pelanggan
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        customer.alamat
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        customer.no_hp
                    )}
                </td>

                <td class="actions">

                    <button
                        class="btn small outline"
                        onclick="editCustomer(
                            ${customer.id_pelanggan}
                        )"
                    >
                        Edit
                    </button>

                    <button
                        class="btn small danger"
                        onclick="deleteCustomer(
                            ${customer.id_pelanggan}
                        )"
                    >
                        Hapus
                    </button>

                </td>

            </tr>

        `).join("");
}


document.getElementById(
    "customerForm"
).addEventListener(
    "submit",
    async event => {

        event.preventDefault();

        const id =
            document.getElementById(
                "customerId"
            ).value;

        const data = {

            id_pelanggan:
                id || null,

            nama_pelanggan:
                document.getElementById(
                    "customerName"
                ).value.trim(),

            alamat:
                document.getElementById(
                    "customerAddress"
                ).value.trim(),

            no_hp:
                document.getElementById(
                    "customerPhone"
                ).value.trim()
        };

        try {

            const result =
                await api(
                    "/pelanggan",
                    {
                        method: "POST",
                        body: JSON.stringify(
                            data
                        )
                    }
                );

            showToast(
                result.message,
                "success"
            );

            resetCustomerForm();

            customerFormCard.classList.add(
                "hidden"
            );

            loadCustomers();

        } catch (error) {

            showToast(
                error.message,
                "error"
            );
        }
    }
);


window.editCustomer =
    function(id) {

        const customer =
            customers.find(
                item =>
                    Number(
                        item.id_pelanggan
                    ) === Number(id)
            );

        if (!customer) {
            return;
        }

        document.getElementById(
            "customerId"
        ).value =
            customer.id_pelanggan;

        document.getElementById(
            "customerName"
        ).value =
            customer.nama_pelanggan;

        document.getElementById(
            "customerAddress"
        ).value =
            customer.alamat || "";

        document.getElementById(
            "customerPhone"
        ).value =
            customer.no_hp || "";

        document.getElementById(
            "customerFormTitle"
        ).textContent =
            "Edit Pelanggan";

        customerFormCard.classList.remove(
            "hidden"
        );
    };


window.deleteCustomer =
    async function(id) {

        if (
            !confirm(
                "Hapus pelanggan ini?"
            )
        ) {
            return;
        }

        try {

            const result =
                await api(
                    `/pelanggan/${id}`,
                    {
                        method: "DELETE"
                    }
                );

            showToast(
                result.message,
                "success"
            );

            loadCustomers();

        } catch (error) {

            showToast(
                error.message,
                "error"
            );
        }
    };


function resetCustomerForm() {

    document.getElementById(
        "customerForm"
    ).reset();

    document.getElementById(
        "customerId"
    ).value = "";

    document.getElementById(
        "customerFormTitle"
    ).textContent =
        "Tambah Pelanggan";
}


// ======================================================
// BARANG
// ======================================================

const productFormCard =
    document.getElementById(
        "productFormCard"
    );

document.getElementById(
    "addProductBtn"
).addEventListener(
    "click",
    () => {

        resetProductForm();

        productFormCard.classList.remove(
            "hidden"
        );
    }
);

document.getElementById(
    "cancelProduct"
).addEventListener(
    "click",
    () => {

        productFormCard.classList.add(
            "hidden"
        );
    }
);


async function loadProducts() {

    try {

        const result =
            await api(
                "/barang"
            );

        products =
            result.data;

        renderProducts();

    } catch (error) {

        showToast(
            error.message,
            "error"
        );
    }
}


function renderProducts() {

    const tbody =
        document.getElementById(
            "productTable"
        );

    if (!products.length) {

        tbody.innerHTML = `
            <tr>
                <td
                    colspan="5"
                    class="empty"
                >
                    Belum ada barang.
                </td>
            </tr>
        `;

        return;
    }

    tbody.innerHTML =
        products.map(product => `

            <tr>

                <td>
                    ${escapeHtml(
                        product.id_barang
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        product.nama_barang
                    )}
                </td>

                <td>
                    ${rupiah(
                        product.harga
                    )}
                </td>

                <td>

                    <span class="
                        stock
                        ${
                            Number(
                                product.stok
                            ) <= 5
                                ? "low"
                                : ""
                        }
                    ">
                        ${escapeHtml(
                            product.stok
                        )}
                    </span>

                </td>

                <td class="actions">

                    <button
                        class="btn small outline"
                        onclick="editProduct(
                            ${product.id_barang}
                        )"
                    >
                        Edit
                    </button>

                    <button
                        class="btn small danger"
                        onclick="deleteProduct(
                            ${product.id_barang}
                        )"
                    >
                        Hapus
                    </button>

                </td>

            </tr>

        `).join("");
}


document.getElementById(
    "productForm"
).addEventListener(
    "submit",
    async event => {

        event.preventDefault();

        const id =
            document.getElementById(
                "productId"
            ).value;

        const data = {

            id_barang:
                id || null,

            nama_barang:
                document.getElementById(
                    "productName"
                ).value.trim(),

            harga:
                Number(
                    document.getElementById(
                        "productPrice"
                    ).value
                ),

            stok:
                Number(
                    document.getElementById(
                        "productStock"
                    ).value
                )
        };

        try {

            const result =
                await api(
                    "/barang",
                    {
                        method: "POST",
                        body: JSON.stringify(
                            data
                        )
                    }
                );

            showToast(
                result.message,
                "success"
            );

            resetProductForm();

            productFormCard.classList.add(
                "hidden"
            );

            loadProducts();

        } catch (error) {

            showToast(
                error.message,
                "error"
            );
        }
    }
);


window.editProduct =
    function(id) {

        const product =
            products.find(
                item =>
                    Number(
                        item.id_barang
                    ) === Number(id)
            );

        if (!product) {
            return;
        }

        document.getElementById(
            "productId"
        ).value =
            product.id_barang;

        document.getElementById(
            "productName"
        ).value =
            product.nama_barang;

        document.getElementById(
            "productPrice"
        ).value =
            product.harga;

        document.getElementById(
            "productStock"
        ).value =
            product.stok;

        document.getElementById(
            "productFormTitle"
        ).textContent =
            "Edit Barang";

        productFormCard.classList.remove(
            "hidden"
        );
    };


window.deleteProduct =
    async function(id) {

        if (
            !confirm(
                "Hapus barang ini?"
            )
        ) {
            return;
        }

        try {

            const result =
                await api(
                    `/barang/${id}`,
                    {
                        method: "DELETE"
                    }
                );

            showToast(
                result.message,
                "success"
            );

            loadProducts();

        } catch (error) {

            showToast(
                error.message,
                "error"
            );
        }
    };


function resetProductForm() {

    document.getElementById(
        "productForm"
    ).reset();

    document.getElementById(
        "productId"
    ).value = "";

    document.getElementById(
        "productFormTitle"
    ).textContent =
        "Tambah Barang";
}


// ======================================================
// TRANSAKSI
// ======================================================

async function loadTransactionData() {

    try {

        const [
            customerResult,
            productResult
        ] = await Promise.all([

            api("/pelanggan"),

            api("/barang")

        ]);

        customers =
            customerResult.data;

        products =
            productResult.data;

        fillCustomerSelect();

        fillProductSelect();

    } catch (error) {

        showToast(
            error.message,
            "error"
        );
    }
}


function fillCustomerSelect() {

    const select =
        document.getElementById(
            "transactionCustomer"
        );

    select.innerHTML = `
        <option value="">
            Pilih pelanggan
        </option>
    `;

    customers.forEach(customer => {

        const option =
            document.createElement(
                "option"
            );

        option.value =
            customer.id_pelanggan;

        option.textContent =
            customer.nama_pelanggan;

        select.appendChild(
            option
        );
    });
}


function fillProductSelect() {

    const select =
        document.getElementById(
            "transactionProduct"
        );

    select.innerHTML = `
        <option value="">
            Pilih barang
        </option>
    `;

    products.forEach(product => {

        const option =
            document.createElement(
                "option"
            );

        option.value =
            product.id_barang;

        option.textContent =
            `${product.nama_barang} — ${rupiah(
                product.harga
            )} — Stok ${product.stok}`;

        select.appendChild(
            option
        );
    });
}


document.getElementById(
    "transactionProduct"
).addEventListener(
    "change",
    updateTransactionInfo
);


document.getElementById(
    "transactionQuantity"
).addEventListener(
    "input",
    updateTransactionInfo
);


function updateTransactionInfo() {

    const id =
        Number(
            document.getElementById(
                "transactionProduct"
            ).value
        );

    const product =
        products.find(
            item =>
                Number(
                    item.id_barang
                ) === id
        );

    const info =
        document.getElementById(
            "productInfo"
        );

    if (!product) {

        info.classList.add(
            "hidden"
        );

        document.getElementById(
            "transactionTotal"
        ).textContent =
            "Rp 0";

        return;
    }

    info.classList.remove(
        "hidden"
    );

    document.getElementById(
        "selectedPrice"
    ).textContent =
        rupiah(product.harga);

    document.getElementById(
        "selectedStock"
    ).textContent =
        product.stok;

    const quantity =
        Number(
            document.getElementById(
                "transactionQuantity"
            ).value
        ) || 0;

    document.getElementById(
        "transactionTotal"
    ).textContent =
        rupiah(
            Number(product.harga) *
            quantity
        );
}


document.getElementById(
    "transactionForm"
).addEventListener(
    "submit",
    async event => {

        event.preventDefault();

        const idPelanggan =
            Number(
                document.getElementById(
                    "transactionCustomer"
                ).value
            );

        const idBarang =
            Number(
                document.getElementById(
                    "transactionProduct"
                ).value
            );

        const jumlah =
            Number(
                document.getElementById(
                    "transactionQuantity"
                ).value
            );

        try {

            const result =
                await api(
                    "/transaksi",
                    {
                        method: "POST",
                        body: JSON.stringify({
                            id_pelanggan:
                                idPelanggan,

                            id_barang:
                                idBarang,

                            jumlah
                        })
                    }
                );

            showToast(
                result.message,
                "success"
            );

            document.getElementById(
                "transactionForm"
            ).reset();

            document.getElementById(
                "productInfo"
            ).classList.add(
                "hidden"
            );

            document.getElementById(
                "transactionTotal"
            ).textContent =
                "Rp 0";

            loadTransactionData();

        } catch (error) {

            showToast(
                error.message,
                "error"
            );
        }
    }
);


// ======================================================
// HISTORY
// ======================================================

async function loadHistory() {

    try {

        const result =
            await api(
                "/histori"
            );

        renderHistory(
            result.data
        );

    } catch (error) {

        showToast(
            error.message,
            "error"
        );
    }
}


function renderHistory(rows) {

    const tbody =
        document.getElementById(
            "historyTable"
        );

    if (!rows.length) {

        tbody.innerHTML = `
            <tr>
                <td
                    colspan="8"
                    class="empty"
                >
                    Belum ada transaksi.
                </td>
            </tr>
        `;

        return;
    }

    tbody.innerHTML =
        rows.map(row => `

            <tr>

                <td>
                    ${escapeHtml(
                        row.id_penjualan
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        row.nama_pelanggan
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        row.nama_barang
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        row.jumlah
                    )}
                </td>

                <td>
                    ${rupiah(
                        row.harga
                    )}
                </td>

                <td>
                    ${rupiah(
                        row.total_harga
                    )}
                </td>

                <td>
                    ${formatDate(
                        row.waktu
                    )}
                </td>

                <td>

                    <button
                        class="btn small danger"
                        onclick="deleteHistory(
                            ${row.id_penjualan}
                        )"
                    >
                        Hapus
                    </button>

                </td>

            </tr>

        `).join("");
}


window.deleteHistory =
    async function(id) {

        if (
            !confirm(
                "Hapus transaksi ini? Stok akan dikembalikan."
            )
        ) {
            return;
        }

        try {

            const result =
                await api(
                    `/histori/${id}`,
                    {
                        method: "DELETE"
                    }
                );

            showToast(
                result.message,
                "success"
            );

            loadHistory();

        } catch (error) {

            showToast(
                error.message,
                "error"
            );
        }
    };


// ======================================================
// HELPERS
// ======================================================

function rupiah(value) {

    return new Intl.NumberFormat(
        "id-ID",
        {
            style: "currency",
            currency: "IDR",
            maximumFractionDigits: 0
        }
    ).format(
        Number(value) || 0
    );
}


function formatDate(value) {

    if (!value) {
        return "-";
    }

    const date =
        new Date(
            value.replace(" ", "T") + "Z"
        );

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleString(
        "id-ID",
        {
            dateStyle: "short",
            timeStyle: "short"
        }
    );
}


function escapeHtml(value) {

    return String(
        value ?? ""
    )
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


function showToast(
    message,
    type = "success"
) {

    toast.textContent =
        message;

    toast.className =
        `toast ${type} show`;

    setTimeout(
        () => {
            toast.classList.remove(
                "show"
            );
        },
        3000
    );
}


// ======================================================
// AUTO LOGIN
// ======================================================

if (token && currentAdmin) {
    showApp();
}