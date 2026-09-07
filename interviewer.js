// ======================================================
// FIREBASE
// ======================================================

import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";

import {
    getFirestore,
    collection,
    query,
    where,
    doc,
    onSnapshot,
    runTransaction
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";


// ======================================================
// FIREBASE CONFIG
// ======================================================

const firebaseConfig = {

    apiKey:
        "AIzaSyC4f3hTR-2MJ9c3S0ryAQNjukMWQZTgAtk",

    authDomain:
        "interview-system-bsi.firebaseapp.com",

    projectId:
        "interview-system-bsi",

    storageBucket:
        "interview-system-bsi.firebasestorage.app",

    messagingSenderId:
        "207931780105",

    appId:
        "1:207931780105:web:8f9f83bc74a77a91fedcd8"
};


// ======================================================
// FIREBASE INIT
// ======================================================

const app =
    initializeApp(
        firebaseConfig
    );


const db =
    getFirestore(app);


// ======================================================
// TANGGAL
// ======================================================

function getTodayKey() {

    const d =
        new Date();

    return (

        d.getFullYear() +
        "-" +

        String(
            d.getMonth() + 1
        ).padStart(
            2,
            "0"
        ) +

        "-" +

        String(
            d.getDate()
        ).padStart(
            2,
            "0"
        )

    );
}


let activeDate =
    localStorage.getItem(
        "activeInterviewDate"
    ) ||
    getTodayKey();


// ======================================================
// ELEMENT - SESUAIKAN DENGAN HTML YANG ADA
// ======================================================

function findQueueElement() {
    const direct =
        document.getElementById("queue") ||
        document.querySelector("[data-queue]") ||
        document.querySelector(".queue");

    if (direct) return direct;

    // Fallback: cari container tepat di bawah judul "Daftar Antrean".
    const headings = Array.from(
        document.querySelectorAll("h1,h2,h3")
    );

    const heading = headings.find(
        el =>
            el.textContent.trim().toLowerCase() ===
            "daftar antrean"
    );

    if (heading && heading.nextElementSibling) {
        return heading.nextElementSibling;
    }

    return null;
}

function findInterviewerInput() {
    return (
        document.getElementById("interviewerName") ||
        document.getElementById("interviewer") ||
        document.querySelector(
            'input[placeholder*="nama interviewer" i]'
        ) ||
        document.querySelector(
            'input[name="interviewer"]'
        )
    );
}

const tanggalElement =
    document.getElementById("tanggal") ||
    document.getElementById("tanggalAktif");

const queueElement =
    findQueueElement();

const interviewerInput =
    findInterviewerInput();

if (!queueElement) {
    console.error(
        "INTERVIEWER: container antrean tidak ditemukan. Pastikan elemen antrean ada di interviewer.html."
    );
}

if (!interviewerInput) {
    console.error(
        "INTERVIEWER: input nama interviewer tidak ditemukan."
    );
}

if (tanggalElement) {
    tanggalElement.innerText =
        new Date(
            activeDate +
            "T00:00:00"
        ).toLocaleDateString(
            "id-ID",
            {
                weekday:
                    "long",
                day:
                    "numeric",
                month:
                    "long",
                year:
                    "numeric"
            }
        );
}


// ======================================================
// INTERVIEWER + NOMOR MEJA
// ======================================================
const interviewerDeskInput = document.getElementById("interviewerDesk");
function getInterviewerIdentity() {
    return { name: interviewerInput ? interviewerInput.value.trim() : "", desk: interviewerDeskInput ? interviewerDeskInput.value.trim() : "" };
}
function requireInterviewerIdentity(focus = true) {
    const identity = getInterviewerIdentity();
    if (!identity.name) { alert("Nama interviewer wajib diisi."); if (focus && interviewerInput) interviewerInput.focus(); return null; }
    if (!identity.desk) { alert("Nomor meja wajib diisi."); if (focus && interviewerDeskInput) interviewerDeskInput.focus(); return null; }
    return identity;
}
if (interviewerInput) {
    interviewerInput.value = localStorage.getItem("interviewerName") || interviewerInput.value || "";
    interviewerInput.addEventListener("input", function() { localStorage.setItem("interviewerName", interviewerInput.value); renderQueue(latestQueueData); });
}
if (interviewerDeskInput) {
    interviewerDeskInput.value = localStorage.getItem("interviewerDesk") || "";
    interviewerDeskInput.addEventListener("input", function() { localStorage.setItem("interviewerDesk", interviewerDeskInput.value); renderQueue(latestQueueData); });
}

// ======================================================
// BACKUP FORM INTERVIEW 1 STATE
// ======================================================
let interview1FormHTML = null;

// ======================================================
// CURRENT CANDIDATE
// ======================================================

let currentCandidate =
    null;


// Diisi "FL Bibit" / "Sales TAD" saat membuka interview kandidat
// jalur langsung. null berarti interviewer bebas memilih jabatan.
let jabatanTerkunci =
    null;

// ======================================================
// TAB INTERVIEW 1 / INTERVIEW 2
// ======================================================

let activeInterviewTab = "organik";
let latestQueueData = [];


// ======================================================
// JALUR KANDIDAT
// ======================================================
// organik -> Frontliner / Sales. Alur lama: Interview 1,
//            bisa dilempar ke Interview 2 kalau hasilnya
//            direkomendasikan Bibit / TAD.
//
// bibit    -> check-in langsung sebagai Bibit
// tad      -> check-in langsung sebagai TAD
//            Hanya SATU interview, langsung final.
//
// Data lama tidak punya field "jalur", jadi dibaca ulang
// dari posisi supaya tetap terbaca sebagai organik.
// ======================================================

const TONE_JALUR = {
    organik: { main: "#006b3f", dark: "#005331", soft: "#e8f3ee" },
    bibit:   { main: "#00A39D", dark: "#00807b", soft: "#e6f6f5" },
    tad:     { main: "#F7941E", dark: "#d97b0c", soft: "#fef3e6" }
};

const LABEL_TAB = {
    organik: "ORGANIK",
    bibit: "BIBIT",
    tad: "TAD"
};

const JABATAN_JALUR = {
    bibit: "FL Bibit",
    tad: "Sales TAD"
};

function getJalur(item) {
    const jalur = String(item && item.jalur || "").toLowerCase();
    if (jalur === "bibit" || jalur === "tad" || jalur === "organik") return jalur;

    const posisi = String(item && item.posisi || "").trim();
    if (posisi === "Bibit") return "bibit";
    if (posisi === "TAD") return "tad";
    return "organik";
}

// true = kandidat yang check-in langsung sebagai Bibit/TAD,
// jadi TIDAK memakai alur Interview 2.
function isJalurLangsung(item) {
    const jalur = getJalur(item);
    return jalur === "bibit" || jalur === "tad";
}

function getTone(jalur) {
    return TONE_JALUR[jalur] || TONE_JALUR.organik;
}

function getToneKandidat(item) {
    if (isJalurLangsung(item)) return getTone(getJalur(item));
    if (item.rekomendasiJabatan === "FL Bibit") return getTone("bibit");
    if (item.rekomendasiJabatan === "Sales TAD") return getTone("tad");
    return getTone("organik");
}

// Tab BIBIT berisi kandidat jalur Bibit langsung DAN limpahan
// Interview 2 dari organik yang direkomendasikan FL Bibit.
function isBibitCandidate(item) {
    return getJalur(item) === "bibit" || item.rekomendasiJabatan === "FL Bibit";
}

function isTadSalesCandidate(item) {
    return getJalur(item) === "tad" || item.rekomendasiJabatan === "Sales TAD";
}

function getVisibleCandidates(data) {
    if (activeInterviewTab === "bibit") return data.filter(isBibitCandidate);
    if (activeInterviewTab === "tad") return data.filter(isTadSalesCandidate);
    return data.filter(item =>
        getJalur(item) === "organik" &&
        !isBibitCandidate(item) &&
        !isTadSalesCandidate(item)
    );
}


// ======================================================
// TAB MENGIKUTI POSISI YANG DIBUKA ADMIN
// ======================================================
// Kalau admin membuka Frontliner/Sales, seluruh tab tampil
// karena kandidat organik bisa dilempar ke Bibit/TAD.
// Kalau admin HANYA membuka Bibit (atau TAD), yang tampil
// hanya tab itu saja.
// ======================================================

let posisiAktif = ["Frontliner", "Sales"];
let tabTersedia = ["organik", "bibit", "tad"];

function hitungTabTersedia() {
    const organikDibuka =
        posisiAktif.includes("Frontliner") ||
        posisiAktif.includes("Sales");

    if (organikDibuka) return ["organik", "bibit", "tad"];

    const hasil = [];
    if (posisiAktif.includes("Bibit")) hasil.push("bibit");
    if (posisiAktif.includes("TAD")) hasil.push("tad");

    return hasil.length ? hasil : ["organik", "bibit", "tad"];
}

function setupInterviewTabs() {
    if (!queueElement) return;

    tabTersedia = hitungTabTersedia();

    if (!tabTersedia.includes(activeInterviewTab)) {
        activeInterviewTab = tabTersedia[0];
    }

    let wrapper = document.getElementById("interviewStageTabs");

    if (!wrapper) {
        wrapper = document.createElement("div");
        wrapper.id = "interviewStageTabs";
        queueElement.parentNode.insertBefore(wrapper, queueElement);
    }

    wrapper.style.cssText =
        "display:grid;grid-template-columns:repeat(" +
        tabTersedia.length +
        ",1fr);gap:10px;margin:20px 0 18px;";

    wrapper.innerHTML = tabTersedia.map(key =>
        `<button data-tab="${key}" type="button" style="border:1px solid #ddd;padding:14px 18px;border-radius:10px;font-size:16px;font-weight:800;cursor:pointer;background:#f4f4f4;color:#555;">${LABEL_TAB[key]}</button>`
    ).join("");

    wrapper.querySelectorAll("button[data-tab]").forEach(button => {
        button.addEventListener("click", () => {
            activeInterviewTab = button.dataset.tab;
            renderQueue(latestQueueData);
        });
    });

    updateInterviewTabs();
}

function updateInterviewTabs() {
    const wrapper = document.getElementById("interviewStageTabs");
    if (!wrapper) return;

    wrapper.querySelectorAll("button[data-tab]").forEach(button => {
        const active = button.dataset.tab === activeInterviewTab;
        const tone = getTone(button.dataset.tab);

        button.style.background = active ? tone.main : "#f4f4f4";
        button.style.color = active ? "#fff" : "#555";
        button.style.border = active ? "0" : "1px solid #ddd";
    });

    // Warnai header halaman sesuai tab aktif.
    const header = document.querySelector(".header");
    if (header) header.style.background = getTone(activeInterviewTab).main;
}

setupInterviewTabs();

// ======================================================
// LOAD QUEUE REALTIME - DATE GLOBAL
// ======================================================

let unsubscribeQueue = null;

function listenQueueByDate(tanggal) {
    activeDate = String(tanggal || getTodayKey()).slice(0,10);
    localStorage.setItem("activeInterviewDate", activeDate);
    if (typeof unsubscribeQueue === "function") unsubscribeQueue();

const queueQuery =
    query(
        collection(
            db,
            "interviewQueue"
        ),

        where(
            "tanggal",
            "==",
            activeDate
        )
    );


unsubscribeQueue = onSnapshot(
    queueQuery,

    function(snapshot) {

        const data = [];


        snapshot.forEach(
            function(docSnapshot) {

                data.push({

                    id:
                        docSnapshot.id,

                    ...docSnapshot.data()

                });

            }
        );


        data.sort(
            function(a, b) {

                return (
                    a.nomorAntrian ||
                    ""
                ).localeCompare(
                    b.nomorAntrian ||
                    "",
                    undefined,
                    {
                        numeric:
                            true
                    }
                );

            }
        );


        latestQueueData = data;
        renderQueue(data);

    },

    function(error) {

        console.error(
            "Queue error:",
            error
        );


        queueElement.innerHTML = `

            <div class="empty">

                Gagal mengambil data antrean.

                <br><br>

                ${escapeHtml(
                    error.message
                )}

            </div>

        `;
    }
);



}

listenQueueByDate(activeDate);

const globalDateRef = doc(db, "systemConfig", "interviewSettings");
onSnapshot(globalDateRef, function(snapshot) {
    const data = snapshot.exists() ? (snapshot.data() || {}) : {};

    // Posisi yang dibuka admin menentukan tab mana yang tampil.
    if (Array.isArray(data.posisiAktif) && data.posisiAktif.length) {
        posisiAktif = data.posisiAktif;
    } else {
        posisiAktif = ["Frontliner", "Sales"];
    }

    const tabBaru = hitungTabTersedia();
    if (tabBaru.join("|") !== tabTersedia.join("|")) {
        setupInterviewTabs();
        renderQueue(latestQueueData);
    }

    const tanggalGlobal = data.activeDate || data.tanggalInterview || data.tanggal || data.date || "";
    if (tanggalGlobal && String(tanggalGlobal).slice(0,10) !== activeDate) listenQueueByDate(tanggalGlobal);
}, function(error) {
    console.warn("INTERVIEWER global date listener:", error.message);
});

// ======================================================
// RENDER QUEUE
// ======================================================

function renderQueue(data) {
    updateInterviewTabs();
    const visibleData = getVisibleCandidates(data);
    const tahap2Tab = activeInterviewTab === "bibit" || activeInterviewTab === "tad";
    let menunggu = 0, interview = 0, selesai = 0;
    visibleData.forEach(item => {
        // Kandidat jalur langsung (Bibit/TAD dari check-in) selalu
        // dihitung dengan alur Interview 1, walaupun sedang berada
        // di tab BIBIT/TAD.
        const pakaiAlurTahap2 = tahap2Tab && !isJalurLangsung(item);
        const tahap = Number(item.tahapInterview || 1);

        if (pakaiAlurTahap2) {
            if (item.status === "Menunggu Interview 2") menunggu++;
            else if (item.status === "Sedang Interview" && tahap === 2) interview++;
            else if (item.status === "Selesai" && item.interview2Final === true) selesai++;
        } else {
            if (item.status === "Menunggu" && tahap === 1) menunggu++;
            else if (item.status === "Sedang Interview" && tahap === 1) interview++;
            else if (item.interview1Final === true) selesai++;
        }
    });
    document.getElementById("jumlahMenunggu").innerText = menunggu; document.getElementById("jumlahInterview").innerText = interview; document.getElementById("jumlahSelesai").innerText = selesai;
    if (!visibleData.length) { queueElement.innerHTML = `<div class="empty">${activeInterviewTab === "organik" ? "Belum ada kandidat tahap pertama." : activeInterviewTab === "bibit" ? "Belum ada kandidat Bibit." : "Belum ada kandidat TAD."}</div>`; return; }
    queueElement.innerHTML = visibleData.map(item => createCandidateCard(item, activeInterviewTab)).join("");
}

function createCandidateCard(item, tab = activeInterviewTab) {
    let statusClass = "status-menunggu"; if (item.status === "Sedang Interview") statusClass = "status-interview"; else if (item.status === "Selesai") statusClass = "status-selesai";
    const currentInterviewer = getInterviewerIdentity().name;
    // Hanya limpahan dari organik yang memakai alur Interview 2.
    // Kandidat Bibit/TAD hasil check-in langsung tetap alur tahap 1.
    const tahap2Tab = (tab === "bibit" || tab === "tad") && !isJalurLangsung(item);
    const tone = getToneKandidat(item);
    let action = "";
    if (!tahap2Tab) {
        if (item.status === "Menunggu" && Number(item.tahapInterview || 1) === 1) action = `<button class="btn-ambil" onclick="ambilKandidat('${item.id}')">AMBIL KANDIDAT</button>`;
        else if (item.status === "Sedang Interview" && Number(item.tahapInterview || 1) === 1) {
            const owner = item.interviewer || item.interviewerTahap1 || "";
            if (owner === currentInterviewer) { action = `<button class="btn-interview" onclick="bukaInterview('${item.id}')">BUKA INTERVIEW 1</button><button class="btn-panggil" onclick="panggilUlang('${item.id}')">🔊 PANGGIL ULANG</button>`; if (item.waktuPanggilUlang) { const w = new Date(item.waktuPanggilUlang); action += `<div class="call-info">Panggilan terakhir: ${w.toLocaleTimeString("id-ID", {hour:"2-digit",minute:"2-digit",second:"2-digit"})}</div>`; } }
            else action = `<div style="margin-top:15px;font-size:14px;color:#555;">Interviewer: <strong>${escapeHtml(owner)}</strong>${item.nomorMejaTahap1 ? ` · Meja <strong>${escapeHtml(item.nomorMejaTahap1)}</strong>` : ""}</div>`;
        } else if (item.status === "Selesai" && item.interview1Final === true) action = `<button class="btn-hasil" onclick="bukaHasilFinal('${item.id}')">LIHAT HASIL FINAL</button>`;
    } else {
        if (item.status === "Menunggu Interview 2") action = `<div style="margin-top:15px;padding:10px;background:#fff3cd;color:#856404;border-radius:8px;font-size:13px;text-align:center;">MENUNGGU INTERVIEW TAHAP 2<br><br>Rekomendasi: <strong>${escapeHtml(item.rekomendasiJabatan || "-")}</strong></div><button class="btn-interview" style="margin-top:10px;" onclick="ambilInterview2('${item.id}')">AMBIL INTERVIEW 2</button>`;
        else if (item.status === "Sedang Interview" && Number(item.tahapInterview || 1) === 2) {
            const owner = item.interviewerTahap2 || "";
            if (owner === currentInterviewer) { action = `<button class="btn-interview" onclick="bukaInterview2('${item.id}')">BUKA INTERVIEW 2</button><button class="btn-panggil" onclick="panggilUlang2('${item.id}')">🔊 PANGGIL ULANG</button>`; if (item.waktuPanggilUlangTahap2) { const w = new Date(item.waktuPanggilUlangTahap2); action += `<div class="call-info">Panggilan terakhir: ${w.toLocaleTimeString("id-ID", {hour:"2-digit",minute:"2-digit",second:"2-digit"})}</div>`; } }
            else action = `<div style="margin-top:15px;font-size:14px;color:#555;">Interviewer 2: <strong>${escapeHtml(owner)}</strong>${item.nomorMejaTahap2 ? ` · Meja <strong>${escapeHtml(item.nomorMejaTahap2)}</strong>` : ""}</div>`;
        } else if (item.status === "Selesai" && item.interview2Final === true) action = `<button class="btn-hasil" onclick="bukaHasilFinal('${item.id}')">LIHAT HASIL FINAL</button>`;
    }
    const statusLabel = tahap2Tab ? (item.status === "Selesai" ? "Selesai Interview 2" : item.status || "-") : (item.status || "-");
    return `<div class="candidate" style="border-top:4px solid ${tone.main};"><div class="queue-number" style="color:${tone.main};">${escapeHtml(item.nomorAntrian)}</div><div class="candidate-name">${escapeHtml(item.nama)}</div><div class="position">Posisi: ${escapeHtml(item.posisi)}</div><span class="status ${statusClass}">${escapeHtml(statusLabel)}</span>${item.rekomendasiJabatan ? `<div style="margin-top:8px;font-size:13px;color:#555;">Rekomendasi: <strong>${escapeHtml(item.rekomendasiJabatan)}</strong></div>` : ""}${action}</div>`;
}

// ======================================================
// AMBIL KANDIDAT
// ======================================================

async function ambilKandidat(
    queueId
) {
    const identity = requireInterviewerIdentity();
    if (!identity) return;
    const interviewer = identity.name;
    const nomorMeja = identity.desk;

    try {

        const queueRef =
            doc(
                db,
                "interviewQueue",
                queueId
            );

        await runTransaction(
            db,
            async (transaction) => {

                const snapshot =
                    await transaction.get(
                        queueRef
                    );

                if (!snapshot.exists()) {
                    throw new Error(
                        "Data kandidat tidak ditemukan."
                    );
                }

                const data =
                    snapshot.data();

                if (data.status !== "Menunggu") {
                    throw new Error(
                        "Kandidat ini sudah diambil interviewer lain."
                    );
                }

                transaction.update(
                    queueRef,
                    {
                        status: "Sedang Interview",
                        tahapInterview: 1,
                        interviewer: interviewer,
                        interviewerTahap1: interviewer,
                        nomorMejaTahap1: nomorMeja,
                        nomorMeja: nomorMeja,
                        waktuMulai: new Date().toISOString(),
                        waktuPanggilUlang: null
                    }
                );

            }
        );

        alert(
            "Kandidat berhasil diambil."
        );

    }
    catch (error) {

        console.error(error);
        alert(error.message);

    }
}


// ======================================================
// PANGGIL ULANG
// ======================================================

async function panggilUlang(
    queueId
) {
    const identity = requireInterviewerIdentity();
    if (!identity) return;
    const interviewer = identity.name;
    const nomorMeja = identity.desk;

    try {

        const queueRef =
            doc(
                db,
                "interviewQueue",
                queueId
            );


        await runTransaction(
            db,

            async (
                transaction
            ) => {

                const snapshot =
                    await transaction.get(
                        queueRef
                    );


                if (
                    !snapshot.exists()
                ) {

                    throw new Error(
                        "Data kandidat tidak ditemukan."
                    );
                }


                const data =
                    snapshot.data();


                if (
                    data.status !==
                    "Sedang Interview"
                ) {

                    throw new Error(
                        "Kandidat sudah tidak dalam status interview."
                    );
                }


                if (
                    data.interviewer !==
                    interviewer
                ) {

                    throw new Error(
                        "Kandidat ini bukan tanggung jawab Anda."
                    );
                }


                transaction.update(
                    queueRef,
                    {
                        waktuPanggilUlang:
                            new Date().toISOString(),
                        nomorMejaTahap1:
                            nomorMeja,
                        nomorMeja:
                            nomorMeja
                    }
                );

            }
        );


    }

    catch (
        error
    ) {

        console.error(
            error
        );


        alert(
            "Gagal memanggil ulang.\n\n" +
            error.message
        );

    }

}


// ======================================================
// AMBIL INTERVIEW 2
// ======================================================

async function ambilInterview2(
    queueId
) {
    const identity = requireInterviewerIdentity();
    if (!identity) return;
    const interviewer = identity.name;
    const nomorMeja = identity.desk;

    try {

        const queueRef =
            doc(
                db,
                "interviewQueue",
                queueId
            );

        await runTransaction(
            db,
            async (transaction) => {

                const snapshot =
                    await transaction.get(
                        queueRef
                    );

                if (!snapshot.exists()) {
                    throw new Error(
                        "Data kandidat tidak ditemukan."
                    );
                }

                const data =
                    snapshot.data();

                if (
                    data.status !==
                    "Menunggu Interview 2"
                ) {
                    throw new Error(
                        "Kandidat belum masuk antrean Interview 2 atau sudah diambil interviewer lain."
                    );
                }

                if (
                    data.rekomendasiJabatan !== "FL Bibit" &&
                    data.rekomendasiJabatan !== "Sales TAD"
                ) {
                    throw new Error(
                        "Kandidat ini tidak memerlukan Interview 2."
                    );
                }

                transaction.update(
                    queueRef,
                    {
                        status: "Sedang Interview",
                        tahapInterview: 2,
                        interviewerTahap2: interviewer,
                        nomorMejaTahap2: nomorMeja,
                        nomorMeja: nomorMeja,
                        interview2Status: "Sedang Interview",
                        waktuMulaiTahap2: new Date().toISOString(),
                        waktuPanggilUlangTahap2: null
                    }
                );

            }
        );

        alert(
            "Kandidat berhasil diambil untuk Interview 2."
        );

    }
    catch (error) {

        console.error(error);
        alert(error.message);

    }
}


// ======================================================
// PANGGIL ULANG INTERVIEW 2
// ======================================================

async function panggilUlang2(
    queueId
) {
    const identity = requireInterviewerIdentity();
    if (!identity) return;
    const interviewer = identity.name;
    const nomorMeja = identity.desk;

    try {

        const queueRef =
            doc(
                db,
                "interviewQueue",
                queueId
            );

        await runTransaction(
            db,
            async (transaction) => {

                const snapshot =
                    await transaction.get(
                        queueRef
                    );

                if (!snapshot.exists()) {
                    throw new Error(
                        "Data kandidat tidak ditemukan."
                    );
                }

                const data =
                    snapshot.data();

                if (
                    data.status !== "Sedang Interview" ||
                    Number(data.tahapInterview || 1) !== 2
                ) {
                    throw new Error(
                        "Kandidat sudah tidak dalam Interview 2."
                    );
                }

                if (
                    data.interviewerTahap2 !== interviewer
                ) {
                    throw new Error(
                        "Kandidat ini bukan tanggung jawab Anda pada Interview 2."
                    );
                }

                transaction.update(
                    queueRef,
                    {
                        waktuPanggilUlangTahap2: new Date().toISOString(),
                        nomorMejaTahap2: nomorMeja,
                        nomorMeja: nomorMeja
                    }
                );

            }
        );

    }
    catch (error) {

        console.error(error);
        alert(
            "Gagal memanggil ulang Interview 2.\n\n" +
            error.message
        );

    }
}


// ======================================================
// BUKA POPUP INTERVIEW
// ======================================================

async function bukaInterview(
    queueId
) {
    const identity = requireInterviewerIdentity();
    if (!identity) return;

    try {

        const queueRef =
            doc(
                db,
                "interviewQueue",
                queueId
            );


        const candidate =
            await runTransaction(
                db,

                async (
                    transaction
                ) => {

                    const snapshot =
                        await transaction.get(
                            queueRef
                        );


                    if (
                        !snapshot.exists()
                    ) {

                        throw new Error(
                            "Kandidat tidak ditemukan."
                        );
                    }


                    return {

                        id:
                            snapshot.id,

                        ...snapshot.data()

                    };

                }
            );


        const interviewer = identity.name;


        if (
            candidate.interviewer !==
            interviewer
        ) {

            alert(
                "Kandidat ini ditangani interviewer lain."
            );

            return;
        }


        if (
            candidate.status !==
            "Sedang Interview"
        ) {

            alert(
                "Interview kandidat ini sudah selesai atau menunggu tahap berikutnya."
            );

            return;
        }


        currentCandidate =
            candidate;


        bukaModalEdit(
            candidate
        );


    }

    catch (
        error
    ) {

        console.error(
            error
        );


        alert(
            error.message
        );

    }

}


// ======================================================
// BACKUP FORM INTERVIEW 1
// ======================================================

function ensureInterview1FormBackup() {

    const form =
        document.getElementById(
            "formInterview"
        );

    if (form && interview1FormHTML === null) {
        interview1FormHTML = form.innerHTML;
    }

}

ensureInterview1FormBackup();

function restoreInterview1Form() {

    const form =
        document.getElementById(
            "formInterview"
        );

    if (!form) {
        return;
    }

    if (interview1FormHTML !== null) {
        form.innerHTML = interview1FormHTML;
        bindInterview1Listeners();
    }

}


// ======================================================
// BUKA MODAL EDIT
// ======================================================

function bukaModalEdit(
    candidate
) {

    restoreInterview1Form();


    // ==================================================
    // KUNCI JABATAN UNTUK JALUR LANGSUNG
    // ==================================================
    // Kandidat yang check-in sebagai Bibit / TAD sudah pasti
    // jabatannya, jadi interviewer tidak perlu (dan tidak bisa)
    // memilih ulang. Interviewer cukup mengisi nilai + area.

    jabatanTerkunci =
        isJalurLangsung(candidate)
            ? JABATAN_JALUR[getJalur(candidate)]
            : null;


    const tone =
        getToneKandidat(candidate);


    document.getElementById(
        "candidateInfo"
    ).style.borderLeft =
        "5px solid " + tone.main;


    document.getElementById(
        "candidateInfo"
    ).innerHTML = `

        <strong style="color:${tone.main};">

            ${escapeHtml(
                candidate.nomorAntrian
            )}

        </strong>

        <br>

        ${escapeHtml(
            candidate.nama
        )}

        <br>

        <span style="color:#666;">

            ${escapeHtml(
                candidate.posisi
            )}

        </span>

        ${jabatanTerkunci
            ? `<br><span style="display:inline-block;margin-top:8px;padding:4px 12px;border-radius:14px;background:${tone.soft};color:${tone.dark};font-size:12px;font-weight:bold;">JALUR ${getJalur(candidate).toUpperCase()} &middot; SEKALI INTERVIEW</span>`
            : ""}

    `;


    document.getElementById(
        "formInterview"
    ).style.display =
        "block";


    document.getElementById(
        "finalResult"
    ).style.display =
        "none";


    resetForm();


    document.getElementById(
        "interviewModal"
    ).style.display =
        "flex";


    updateScore();

}


// ======================================================
// RESET FORM
// ======================================================

function resetForm() {

    document.getElementById(
        "scorePenampilan"
    ).value =
        "0";


    document.getElementById(
        "scoreMotivasi"
    ).value =
        "0";


    document.getElementById(
        "scoreKomunikasi"
    ).value =
        "0";


    document.getElementById(
        "scorePengalaman"
    ).value =
        "0";


    document.getElementById(
        "scoreCulture"
    ).value =
        "0";


    document.getElementById(
        "rekomendasiJabatan"
    ).value =
        "";


    document.getElementById(
        "rekomendasiArea"
    ).value =
        "";


    document.getElementById(
        "catatan"
    ).value =
        "";


    document.getElementById(
        "recommendationSection"
    ).style.display =
        "none";


    document.getElementById(
        "previewJabatanRow"
    ).style.display =
        "none";


    document.getElementById(
        "previewAreaRow"
    ).style.display =
        "none";

}


// ======================================================
// GET SCORES
// ======================================================

function getScores() {

    return {

        penampilan:
            Number(
                document.getElementById(
                    "scorePenampilan"
                ).value
            ),

        motivasi:
            Number(
                document.getElementById(
                    "scoreMotivasi"
                ).value
            ),

        komunikasi:
            Number(
                document.getElementById(
                    "scoreKomunikasi"
                ).value
            ),

        pengalaman:
            Number(
                document.getElementById(
                    "scorePengalaman"
                ).value
            ),

        culture:
            Number(
                document.getElementById(
                    "scoreCulture"
                ).value
            )

    };

}


// ======================================================
// UPDATE SCORE
// ======================================================

function updateScore() {

    const scores = getScores();

    const total =
        scores.penampilan +
        scores.motivasi +
        scores.komunikasi +
        scores.pengalaman +
        scores.culture;

    document.getElementById("totalScore").innerText = total + " / 25";
    document.getElementById("previewTotal").innerText = total;

    const hasilElement = document.getElementById("hasilScore");
    const previewHasil = document.getElementById("previewHasil");
    const recommendationSection = document.getElementById("recommendationSection");
    const previewJabatanRow = document.getElementById("previewJabatanRow");
    const previewAreaRow = document.getElementById("previewAreaRow");

    const semuaTerisi = Object.values(scores).every(score => score >= 1 && score <= 5);

    if (!semuaTerisi) {
        hasilElement.innerText = "BELUM DINILAI";
        hasilElement.className = "result result-not";
        previewHasil.innerText = "-";
        recommendationSection.style.display = "none";
        previewJabatanRow.style.display = "none";
        previewAreaRow.style.display = "none";
        updateJabatanOptions(0);
        return;
    }

    let hasil;
    if (total < 15) hasil = "TIDAK DISARANKAN";
    else if (total <= 18) hasil = "Dipertimbangkan";
    else hasil = "Disarankan";

    hasilElement.innerText = hasil.toUpperCase();
    previewHasil.innerText = hasil.toUpperCase();

    if (hasil === "TIDAK DISARANKAN") {
        hasilElement.className = "result result-not";
        recommendationSection.style.display = "none";
        previewJabatanRow.style.display = "none";
        previewAreaRow.style.display = "none";
    } else {
        hasilElement.className = "result result-recommended";
        recommendationSection.style.display = "block";
        previewJabatanRow.style.display = "flex";
        previewAreaRow.style.display = "flex";
    }

    updateJabatanOptions(total);
}

function updateJabatanOptions(total) {
    const select = document.getElementById("rekomendasiJabatan");
    if (!select) return;

    // Jalur Bibit/TAD: jabatan sudah ditentukan sejak check-in.
    if (jabatanTerkunci) {
        select.innerHTML =
            `<option value="${jabatanTerkunci}">${jabatanTerkunci}</option>`;
        select.value = jabatanTerkunci;
        select.style.pointerEvents = "none";
        select.style.background = "#f1f5f9";
        select.style.fontWeight = "bold";

        const preview = document.getElementById("previewJabatan");
        if (preview) preview.innerText = jabatanTerkunci;
        return;
    }

    select.style.pointerEvents = "";
    select.style.background = "";
    select.style.fontWeight = "";

    const current = select.value;
    let allowed = [];

    if (total >= 15 && total <= 18) {
        allowed = ["FL Bibit", "Sales TAD"];
    } else if (total > 18) {
        allowed = ["FL Organik", "Sales Organik"];
    }

    select.innerHTML = `<option value="">-- Pilih Jabatan --</option>` +
        allowed.map(value => `<option value="${value}">${value}</option>`).join("");

    if (allowed.includes(current)) {
        select.value = current;
    } else {
        select.value = "";
        const preview = document.getElementById("previewJabatan");
        if (preview) preview.innerText = "-";
    }
}

// ======================================================
// BIND FORM INTERVIEW 1 LISTENER
// ======================================================

function bindInterview1Listeners() {

    [
        "scorePenampilan",
        "scoreMotivasi",
        "scoreKomunikasi",
        "scorePengalaman",
        "scoreCulture"

    ].forEach(
        function(id) {

            const element =
                document.getElementById(id);

            if (element) {
                element.addEventListener(
                    "change",
                    updateScore
                );
            }

        }
    );


    const jabatan =
        document.getElementById(
            "rekomendasiJabatan"
        );

    if (jabatan) {

        jabatan.addEventListener(
            "change",
            function() {

                const preview =
                    document.getElementById(
                        "previewJabatan"
                    );

                if (preview) {
                    preview.innerText =
                        this.value || "-";
                }

            }
        );

    }


    const area =
        document.getElementById(
            "rekomendasiArea"
        );

    if (area) {

        area.addEventListener(
            "change",
            function() {

                const preview =
                    document.getElementById(
                        "previewArea"
                    );

                if (preview) {
                    preview.innerText =
                        this.value || "-";
                }

            }
        );

    }

}


bindInterview1Listeners();


// ======================================================
// SUBMIT INTERVIEW 1
// ======================================================

async function submitInterview() {
    const identity = requireInterviewerIdentity();
    if (!identity) return;
    const interviewer = identity.name;
    const nomorMeja = identity.desk;


    if (
        !currentCandidate
    ) {

        alert(
            "Kandidat tidak ditemukan."
        );

        return;
    }


    const scores =
        getScores();


    // ==================================================
    // VALIDASI NILAI
    // ==================================================

    if (
        Object.values(
            scores
        ).some(
            score =>
                score < 1 ||
                score > 5
        )
    ) {

        alert(
            "Semua aspek penilaian wajib diisi."
        );

        return;

    }


    // ==================================================
    // TOTAL
    // ==================================================

    const total =
        scores.penampilan +
        scores.motivasi +
        scores.komunikasi +
        scores.pengalaman +
        scores.culture;


    // ==================================================
    // HASIL INTERVIEW 1
    // ==================================================

    let hasil;

    if (total < 15) {
        hasil = "TIDAK DISARANKAN";
    } else if (total <= 18) {
        hasil = "Dipertimbangkan";
    } else {
        hasil = "Disarankan";
    }


    let jabatan =
        null;


    let area =
        null;


    // ==================================================
    // KALAU DIREKOMENDASIKAN
    // ==================================================

    // Kandidat jalur Bibit / TAD: jabatan sudah terkunci sejak
    // check-in dan prosesnya berhenti di interview ini.
    const jalurLangsung =
        isJalurLangsung(currentCandidate);


    if (
        hasil === "Dipertimbangkan" ||
        hasil === "Disarankan"
    ) {

        jabatan =
            jalurLangsung
                ? JABATAN_JALUR[getJalur(currentCandidate)]
                : document.getElementById(
                      "rekomendasiJabatan"
                  ).value;


        area =
            document.getElementById(
                "rekomendasiArea"
            ).value;


        if (
            !jabatan
        ) {

            alert(
                "Silakan pilih rekomendasi jabatan."
            );

            return;

        }


        if (
            !area
        ) {

            alert(
                "Silakan pilih rekomendasi area."
            );

            return;

        }

        // Pembatasan jabatan hanya berlaku untuk jalur organik.
        if (!jalurLangsung) {

            if (hasil === "Dipertimbangkan" && !["FL Bibit", "Sales TAD"].includes(jabatan)) {
                alert("Total 15–18 hanya dapat memilih FL Bibit atau Sales TAD.");
                return;
            }

            if (hasil === "Disarankan" && !["FL Organik", "Sales Organik"].includes(jabatan)) {
                alert("Total di atas 18 hanya dapat memilih FL Organik atau Sales Organik.");
                return;
            }

        }

    }


    // ==================================================
    // CATATAN
    // ==================================================

    const catatan =
        document.getElementById(
            "catatan"
        ).value.trim();


    // ==================================================
    // TENTUKAN APAKAH BUTUH INTERVIEW 2
    // ==================================================

    // Jalur langsung TIDAK PERNAH masuk Interview 2.
    const perluInterview2 =
        !jalurLangsung &&
        (
            (
                jabatan ===
                "FL Bibit"
            ) ||
            (
                jabatan ===
                "Sales TAD"
            )
        );


    // ==================================================
    // STATUS BERDASARKAN JABATAN
    // ==================================================
    //
    // FL Organik
    // Sales Organik
    //     ↓
    // Selesai
    //
    // FL Bibit
    // Sales TAD
    //     ↓
    // Menunggu Interview 2
    //
    // ==================================================

    const statusAkhir =
        perluInterview2
            ? "Menunggu Interview 2"
            : "Selesai";


    const tahapInterview =
        perluInterview2
            ? 2
            : 1;


    // ==================================================
    // KONFIRMASI
    // ==================================================

    let pesanKonfirmasi =

        (jalurLangsung
            ? "Hasil Interview " +
              getJalur(currentCandidate).toUpperCase() +
              "\n\n"
            : "Hasil Interview 1\n\n") +

        "Total: " +
        total +
        " / 25\n\n" +

        "Hasil: " +
        hasil +
        "\n\n";


    if (
        hasil === "Dipertimbangkan" ||
        hasil === "Disarankan"
    ) {

        pesanKonfirmasi +=

            "Jabatan: " +
            jabatan +
            "\n" +

            "Area: " +
            area +
            "\n\n";

    }


    if (
        perluInterview2
    ) {

        pesanKonfirmasi +=

            "Kandidat akan masuk " +
            "MENUNGGU INTERVIEW 2.\n\n" +

            "Nomor kandidat tetap " +
            currentCandidate.nomorAntrian +
            ".\n\n";

    }

    else {

        pesanKonfirmasi +=

            "Kandidat akan dinyatakan SELESAI " +
            "setelah Interview 1.\n\n";

    }


    pesanKonfirmasi +=

        "Hasil yang sudah disubmit " +
        "tidak dapat diubah lagi.\n\n" +

        "Lanjutkan?";


    const konfirmasi =
        confirm(
            pesanKonfirmasi
        );


    if (
        !konfirmasi
    ) {

        return;

    }



    // ==================================================
    // SIMPAN KE FIRESTORE
    // ==================================================

    try {

        const queueRef =
            doc(
                db,
                "interviewQueue",
                currentCandidate.id
            );


        await runTransaction(
            db,

            async (
                transaction
            ) => {

                const snapshot =
                    await transaction.get(
                        queueRef
                    );


                if (
                    !snapshot.exists()
                ) {

                    throw new Error(
                        "Data kandidat tidak ditemukan."
                    );

                }


                const data =
                    snapshot.data();


                // ==========================================
                // VALIDASI INTERVIEWER
                // ==========================================

                if (
                    data.interviewer !==
                    interviewer
                ) {

                    throw new Error(
                        "Kandidat ini bukan tanggung jawab Anda."
                    );

                }


                // ==========================================
                // JANGAN BOLEH SUBMIT DUA KALI
                // ==========================================

                if (
                    data.status !==
                    "Sedang Interview"
                ) {

                    throw new Error(
                        "Interview kandidat ini sudah tidak dapat disubmit."
                    );

                }


                // ==========================================
                // UPDATE INTERVIEW 1
                // ==========================================

                const updateData = {

                    // --------------------------------------
                    // STATUS
                    // --------------------------------------

                    status:
                        statusAkhir,


                    // --------------------------------------
                    // TAHAP
                    // --------------------------------------

                    tahapInterview:
                        tahapInterview,


                    // --------------------------------------
                    // IDENTITAS INTERVIEWER 1
                    // --------------------------------------

                    interviewer:
                        interviewer,


                    interviewerTahap1:
                        interviewer,

                    nomorMejaTahap1:
                        nomorMeja,


                    // --------------------------------------
                    // NILAI
                    // --------------------------------------

                    scorePenampilan:
                        scores.penampilan,


                    scoreMotivasi:
                        scores.motivasi,


                    scoreKomunikasi:
                        scores.komunikasi,


                    scorePengalaman:
                        scores.pengalaman,


                    scoreCulture:
                        scores.culture,


                    totalScore:
                        total,


                    // --------------------------------------
                    // HASIL
                    // --------------------------------------

                    hasil:
                        hasil,


                    // --------------------------------------
                    // REKOMENDASI
                    // --------------------------------------

                    rekomendasiJabatan:
                        jabatan,


                    rekomendasiArea:
                        area,


                    // --------------------------------------
                    // CATATAN
                    // --------------------------------------

                    catatan:
                        catatan,


                    // --------------------------------------
                    // WAKTU
                    // --------------------------------------

                    waktuSubmit:
                        new Date()
                            .toISOString(),


                    waktuSubmitTahap1:
                        new Date()
                            .toISOString(),


                    // --------------------------------------
                    // FINAL INTERVIEW 1
                    // --------------------------------------

                    interview1Final:
                        true

                };


                // ==========================================
                // KALAU MASUK INTERVIEW 2
                // ==========================================

                if (
                    perluInterview2
                ) {

                    updateData.interview2Status =
                        "Menunggu";


                    updateData.interviewerTahap2 =
                        null;


                    updateData.hasilInterview2 =
                        null;


                    updateData.waktuMulaiTahap2 =
                        null;


                    updateData.waktuSubmitTahap2 =
                        null;


                    updateData.interview2Final =
                        false;

                }


                // ==========================================
                // KALAU LANGSUNG SELESAI
                // ==========================================

                else {

                    updateData.interview2Status =
                        null;


                    updateData.interview2Final =
                        false;


                    updateData.final =
                        true;

                }


                // ==========================================
                // KHUSUS INTERVIEW 2:
                //
                // Hapus status panggilan Interview 1
                // supaya display tidak lagi menganggap
                // kandidat sedang dipanggil.
                // ==========================================

                updateData.waktuPanggilUlang =
                    null;


                transaction.update(
                    queueRef,
                    updateData
                );

            }
        );


        // ==================================================
        // SIMPAN NOMOR SEBELUM CURRENT CANDIDATE DIBERSIHKAN
        // ==================================================

        const nomorSelesai =
            currentCandidate.nomorAntrian;


        // ==================================================
        // TUTUP POPUP
        // ==================================================

        tutupInterview(false);


        // ==================================================
        // PESAN SUKSES
        // ==================================================

        if (
            perluInterview2
        ) {

            alert(

                "Interview 1 berhasil disimpan.\n\n" +

                nomorSelesai +
                " masuk ke antrean Interview 2.\n\n" +

                "Rekomendasi: " +
                jabatan

            );

        }

        else {

            alert(

                "Hasil Interview 1 berhasil disimpan.\n\n" +

                nomorSelesai +
                " dinyatakan SELESAI."

            );

        }


        currentCandidate =
            null;


        jabatanTerkunci =
            null;


    }

    catch (
        error
    ) {

        console.error(
            error
        );


        alert(

            "Gagal menyimpan hasil.\n\n" +
            error.message

        );

    }

}


// ======================================================
// TUTUP INTERVIEW
// ======================================================

function tutupInterview(
    clearCandidate = true
) {

    document.getElementById(
        "interviewModal"
    ).style.display =
        "none";


    if (clearCandidate) {
        currentCandidate = null;
    }

}


// ======================================================
// BUKA HASIL FINAL
// ======================================================

async function bukaHasilFinal(
    queueId
) {

    try {

        const queueRef =
            doc(
                db,
                "interviewQueue",
                queueId
            );


        const candidate =
            await runTransaction(
                db,

                async (
                    transaction
                ) => {

                    const snapshot =
                        await transaction.get(
                            queueRef
                        );


                    if (
                        !snapshot.exists()
                    ) {

                        throw new Error(
                            "Data tidak ditemukan."
                        );

                    }


                    return {

                        id:
                            snapshot.id,

                        ...snapshot.data()

                    };

                }
            );


        if (
            candidate.status !==
            "Selesai"
        ) {

            alert(
                "Kandidat belum selesai seluruh proses interview."
            );

            return;

        }


        currentCandidate =
            candidate;


        tampilkanHasilFinal(
            candidate
        );


    }

    catch (
        error
    ) {

        console.error(
            error
        );


        alert(
            error.message
        );

    }

}


// ======================================================
// TAMPILKAN HASIL FINAL
// ======================================================

function tampilkanHasilFinal(
    candidate
) {

    document.getElementById(
        "candidateInfo"
    ).innerHTML = `

        <strong>

            ${escapeHtml(
                candidate.nomorAntrian
            )}

        </strong>

        <br>

        ${escapeHtml(
            candidate.nama
        )}

        <br>

        <span style="color:#666;">

            ${escapeHtml(
                candidate.posisi
            )}

        </span>

    `;


    document.getElementById(
        "formInterview"
    ).style.display =
        "none";


    document.getElementById(
        "finalResult"
    ).style.display =
        "block";


    const hasilClass =
        candidate.hasil === "Disarankan" ||
        candidate.hasil === "Dipertimbangkan"

            ? "result result-recommended"

            : "result result-not";


    let recommendationHTML =
        "";


    if (
        candidate.hasil === "Disarankan" ||
        candidate.hasil === "Dipertimbangkan"
    ) {

        recommendationHTML = `

            <div class="preview-row">

                <span>
                    Rekomendasi Jabatan
                </span>

                <strong>

                    ${escapeHtml(
                        candidate.rekomendasiJabatan ||
                        "-"
                    )}

                </strong>

            </div>


            <div class="preview-row">

                <span>
                    Rekomendasi Area
                </span>

                <strong>

                    ${escapeHtml(
                        candidate.rekomendasiArea ||
                        "-"
                    )}

                </strong>

            </div>

        `;

    }


    let interview2HTML =
        "";


    if (
        !isJalurLangsung(candidate) &&
        (
            candidate.rekomendasiJabatan ===
            "FL Bibit" ||

            candidate.rekomendasiJabatan ===
            "Sales TAD"
        )
    ) {

        interview2HTML = `

            <hr>

            <h4>
                INTERVIEW TAHAP 2
            </h4>


            <div class="preview-row">

                <span>
                    Interviewer Tahap 2
                </span>

                <strong>

                    ${escapeHtml(
                        candidate.interviewerTahap2 ||
                        "-"
                    )}

                </strong>

            </div>


            <div class="preview-row">

                <span>
                    Note Interview 2
                </span>

                <strong style="max-width:60%;text-align:right;white-space:pre-wrap;">

                    ${escapeHtml(
                        candidate.catatanInterview2 ||
                        "-"
                    )}

                </strong>

            </div>


            <div class="preview-row">

                <span>
                    Hasil Interview 2
                </span>

                <strong>

                    ${escapeHtml(
                        candidate.hasilInterview2 ||
                        "Menunggu"
                    )}

                </strong>

            </div>

        `;

    }


    document.getElementById(
        "finalContent"
    ).innerHTML = `

        <h3>
            HASIL FINAL INTERVIEW
        </h3>


        <div class="preview-row">

            <span>
                Total Nilai Interview 1
            </span>

            <strong>

                ${candidate.totalScore}
                / 25

            </strong>

        </div>


        <div
            class="${hasilClass}"
            style="margin:15px 0;"
        >

            ${escapeHtml(
                candidate.hasil
            )}

        </div>


        <hr>


        <div class="preview-row">

            <span>
                Penampilan
            </span>

            <strong>

                ${candidate.scorePenampilan}

            </strong>

        </div>


        <div class="preview-row">

            <span>
                Motivasi
            </span>

            <strong>

                ${candidate.scoreMotivasi}

            </strong>

        </div>


        <div class="preview-row">

            <span>
                Komunikasi
            </span>

            <strong>

                ${candidate.scoreKomunikasi}

            </strong>

        </div>


        <div class="preview-row">

            <span>
                Pengalaman Relevan
            </span>

            <strong>

                ${candidate.scorePengalaman}

            </strong>

        </div>


        <div class="preview-row">

            <span>
                Culture Fit -
                Kontribusi Maksimal
            </span>

            <strong>

                ${candidate.scoreCulture}

            </strong>

        </div>


        <hr>


        ${recommendationHTML}


        ${interview2HTML}


        <div
            style="
                margin-top:20px;
            "
        >

            <strong>
                Catatan Interviewer
            </strong>


            <div
                style="
                    margin-top:8px;
                    background:#f5f5f5;
                    padding:12px;
                    border-radius:8px;
                    white-space:pre-wrap;
                "
            >

                ${escapeHtml(
                    candidate.catatan ||
                    "-"
                )}

            </div>

        </div>


        <div
            style="
                margin-top:20px;
                color:#666;
                font-size:13px;
            "
        >

            Interviewer Tahap 1:

            ${escapeHtml(
                candidate.interviewerTahap1 ||
                candidate.interviewer ||
                "-"
            )}

        </div>

    `;


    document.getElementById(
        "interviewModal"
    ).style.display =
        "flex";

}


// ======================================================
// INTERVIEW 2 MODAL DINAMIS
// ======================================================

function getInterview2Panel() {
    let panel = document.getElementById("interview2Panel");
    if (panel) return panel;

    panel = document.createElement("div");
    panel.id = "interview2Panel";
    panel.style.cssText = `
        background:#fff; border-radius:12px; padding:22px;
        margin-top:12px; width:min(560px, calc(100vw - 50px));
        box-sizing:border-box;
    `;
    document.body.appendChild(panel);
    return panel;
}

async function bukaInterview2(queueId) {
    const identity = requireInterviewerIdentity();
    if (!identity) return;
    try {
        const queueRef = doc(db, "interviewQueue", queueId);
        const snapshot = await runTransaction(db, async transaction => transaction.get(queueRef));
        if (!snapshot.exists()) throw new Error("Kandidat tidak ditemukan.");

        const candidate = { id:snapshot.id, ...snapshot.data() };
        const interviewer = identity.name;

        if (candidate.status !== "Sedang Interview" || Number(candidate.tahapInterview || 1) !== 2) {
            throw new Error("Kandidat sudah tidak dalam Interview 2.");
        }
        if (candidate.interviewerTahap2 !== interviewer) {
            throw new Error("Kandidat ini bukan tanggung jawab Anda pada Interview 2.");
        }

        currentCandidate = candidate;

        const panel = getInterview2Panel();
        panel.style.display = "block";
        panel.innerHTML = `
            <div style="font-size:13px;color:#777;margin-bottom:6px;">INTERVIEW TAHAP 2</div>
            <div style="font-size:30px;font-weight:800;color:#d97706;">${escapeHtml(candidate.nomorAntrian)}</div>
            <div style="font-size:20px;font-weight:800;margin-top:4px;">${escapeHtml(candidate.nama)}</div>
            <div style="margin-top:4px;color:#666;">Posisi: ${escapeHtml(candidate.posisi || "-")}</div>
            <div style="margin-top:10px;color:#666;">Rekomendasi: <strong>${escapeHtml(candidate.rekomendasiJabatan || "-")}</strong></div>
            <hr style="margin:18px 0;">
            <div style="font-weight:800;margin-bottom:8px;">NOTE</div>
            <textarea id="catatanInterview2" placeholder="Tulis note Interview 2..." style="width:100%;min-height:90px;box-sizing:border-box;border:1px solid #ddd;border-radius:10px;padding:12px;resize:vertical;margin-bottom:14px;"></textarea>
            <div style="font-weight:800;margin-bottom:12px;">HASIL INTERVIEW 2</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                <button type="button" onclick="submitInterview2('Setuju')" style="border:0;border-radius:10px;padding:15px;background:#006b3f;color:#fff;font-weight:800;cursor:pointer;">SETUJU</button>
                <button type="button" onclick="submitInterview2('Tidak Setuju')" style="border:0;border-radius:10px;padding:15px;background:#b91c1c;color:#fff;font-weight:800;cursor:pointer;">TIDAK SETUJU</button>
            </div>
            <button type="button" onclick="tutupInterview2()" style="margin-top:10px;width:100%;border:1px solid #ddd;border-radius:10px;padding:11px;background:#f5f5f5;cursor:pointer;">BATAL</button>
        `;

        panel.style.position = "fixed";
        panel.style.left = "50%";
        panel.style.top = "50%";
        panel.style.transform = "translate(-50%,-50%)";
        panel.style.zIndex = "99999";
        panel.style.boxShadow = "0 20px 60px rgba(0,0,0,.25)";

    } catch (error) {
        console.error(error);
        alert(error.message);
    }
}

async function submitInterview2(hasil2) {
    const identity = requireInterviewerIdentity();
    if (!identity) return;

    if (!currentCandidate) {
        alert("Kandidat tidak ditemukan.");
        return;
    }

    if (!["Setuju", "Tidak Setuju"].includes(hasil2)) {
        alert("Hasil Interview 2 tidak valid.");
        return;
    }

    const nomor = currentCandidate.nomorAntrian || "Kandidat";
    const interviewer = identity.name;
    const nomorMeja = identity.desk;
    const noteInterview2 = (document.getElementById("catatanInterview2")?.value || "").trim();

    if (!confirm(
        "Hasil Interview 2\n\n" +
        nomor + "\n" +
        currentCandidate.nama + "\n\n" +
        "Hasil: " + hasil2 + "\n\n" +
        "Hasil yang sudah disubmit tidak dapat diubah lagi.\n\nLanjutkan?"
    )) return;

    try {
        const queueRef = doc(db, "interviewQueue", currentCandidate.id);

        await runTransaction(db, async transaction => {
            const snapshot = await transaction.get(queueRef);
            if (!snapshot.exists()) throw new Error("Data kandidat tidak ditemukan.");

            const data = snapshot.data();

            if (data.status !== "Sedang Interview" || Number(data.tahapInterview || 1) !== 2) {
                throw new Error("Interview 2 kandidat ini sudah tidak dapat disubmit.");
            }

            if (data.interviewerTahap2 !== interviewer) {
                throw new Error("Kandidat ini bukan tanggung jawab Anda pada Interview 2.");
            }

            transaction.update(queueRef, {
                status: "Selesai",
                tahapInterview: 2,
                interview2Status: "Selesai",
                hasilInterview2: hasil2,
                catatanInterview2: noteInterview2,
                nomorMejaTahap2: nomorMeja,
                nomorMeja: nomorMeja,
                interview2Final: true,
                final: true,
                waktuSubmitTahap2: new Date().toISOString(),
                waktuPanggilUlangTahap2: null
            });
        });

        tutupInterview2();
        alert(
            "Interview 2 berhasil disimpan.\n\n" +
            nomor + " dinyatakan SELESAI.\n\n" +
            "Hasil: " + hasil2
        );
    } catch (error) {
        console.error(error);
        alert("Gagal menyimpan Interview 2.\n\n" + error.message);
    }
}

function tutupInterview2() {
    const panel = document.getElementById("interview2Panel");
    if (panel) panel.style.display = "none";
    currentCandidate = null;
}

// ======================================================
// ESCAPE HTML
// ======================================================

function escapeHtml(
    text
) {

    const div =
        document.createElement(
            "div"
        );


    div.textContent =
        text || "";


    return div.innerHTML;

}


// ======================================================
// EXPOSE FUNCTIONS
// ======================================================

window.ambilKandidat =
    ambilKandidat;


window.panggilUlang =
    panggilUlang;


window.bukaInterview =
    bukaInterview;


window.bukaHasilFinal =
    bukaHasilFinal;


window.submitInterview =
    submitInterview;


window.ambilInterview2 =
    ambilInterview2;


window.bukaInterview2 =
    bukaInterview2;


window.panggilUlang2 =
    panggilUlang2;


window.submitInterview2 =
    submitInterview2;


// Alias tambahan untuk tombol HTML lama.
window.setujuInterview2 =
    function() {
        submitInterview2("Setuju");
    };


window.tidakSetujuInterview2 =
    function() {
        submitInterview2("Tidak Setuju");
    };


window.tutupInterview =
    tutupInterview;

window.tutupInterview2 =
    tutupInterview2;