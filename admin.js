// ======================================================
// ADMIN.JS
// ADMIN DASHBOARD - INTERVIEW 1 + INTERVIEW 2
// ======================================================

import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";

import {
    getFirestore,
    collection,
    query,
    where,
    onSnapshot,
    getDoc,
    doc,
    deleteDoc,
    writeBatch
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
// GLOBAL DATA
// ======================================================

let allCandidates =
    [];

let filteredCandidates =
    [];

// ======================================================
// ======================================================
// TAB REKAP ADMIN
// ======================================================

let activeInterviewTab = "all";

window.gantiTabInterview = gantiTabInterview;

function getAdminCategory(candidate) {
    const jabatan = String(candidate.rekomendasiJabatan || "").trim();

    if (jabatan === "FL Organik" || jabatan === "Sales Organik") return "organik";
    if (jabatan === "FL Bibit") return "bibit";
    if (jabatan === "Sales TAD") return "tad";
    return "other";
}

function gantiTabInterview(tab) {
    const allowed = ["all", "organik", "bibit", "tad"];
    activeInterviewTab = allowed.includes(String(tab)) ? String(tab) : "all";

    const buttons = {
        all: document.getElementById("tabAdminAll"),
        organik: document.getElementById("tabAdminOrganik"),
        bibit: document.getElementById("tabAdminBibit"),
        tad: document.getElementById("tabAdminTad")
    };

    Object.entries(buttons).forEach(([key, el]) => {
        if (!el) return;
        const active = key === activeInterviewTab;
        el.classList.toggle("active", active);
    });

    const description = document.getElementById("tabDescription");
    if (description) {
        description.innerText = {
            all: "Rekap keseluruhan seluruh peserta interview.",
            organik: "Rekap kandidat dengan rekomendasi FL Organik dan Sales Organik.",
            bibit: "Rekap kandidat dengan rekomendasi FL Bibit.",
            tad: "Rekap kandidat dengan rekomendasi Sales TAD."
        }[activeInterviewTab];
    }

    // Sinkronkan dropdown kategori dengan tab aktif.
    const filterKategori = document.getElementById("filterKategori");
    if (filterKategori) {
        filterKategori.value = activeInterviewTab === "all" ? "" : activeInterviewTab;
    }

    // Semua statistik tetap tampil; nilainya mengikuti tab aktif.
    document.querySelectorAll(".stat[data-tab]").forEach(card => {
        card.style.display = "";
    });

    terapkanFilter();
}

function isInterview1Candidate(candidate) {
    return Boolean(
        candidate.interview1Final === true ||
        candidate.interviewerTahap1 ||
        candidate.waktuMulai ||
        candidate.waktuSubmitTahap1 ||
        candidate.hasil ||
        candidate.scorePenampilan != null ||
        candidate.scoreMotivasi != null ||
        candidate.scoreKomunikasi != null ||
        candidate.scorePengalaman != null ||
        candidate.scoreCulture != null ||
        (candidate.status === "Menunggu" && Number(candidate.tahapInterview || 1) === 1) ||
        (candidate.status === "Sedang Interview" && Number(candidate.tahapInterview || 1) === 1)
    );
}

function isInterview2Candidate(candidate) {
    return Boolean(
        candidate.interview2Status ||
        candidate.interviewerTahap2 ||
        candidate.hasilInterview2 ||
        candidate.waktuMulaiTahap2 ||
        candidate.waktuSubmitTahap2 ||
        candidate.interview2Final === true ||
        Number(candidate.tahapInterview || 0) === 2 ||
        candidate.status === "Menunggu Interview 2"
    );
}



let unsubscribe =
    null;


// ======================================================
// DEFAULT DATE RANGE
// ======================================================

function getTodayKey() {

    const d = new Date();

    return (
        d.getFullYear() +
        "-" +
        String(d.getMonth() + 1).padStart(2, "0") +
        "-" +
        String(d.getDate()).padStart(2, "0")
    );

}


const today = getTodayKey();

// ======================================================
// DEFAULT TANGGAL MENGIKUTI TANGGAL AKTIF DI INDEX/ADMIN
// ======================================================
// Sumber utama = Firestore systemConfig/interviewSettings.activeDate
// yang diubah melalui menu "Ubah Tanggal" pada index.html.
// LocalStorage hanya menjadi fallback jika Firestore gagal.
// ======================================================

const activeDateConfigRef = doc(
    db,
    "systemConfig",
    "interviewSettings"
);

async function initDefaultTanggalFilter() {
    const tanggalMulaiEl = document.getElementById("filterTanggalMulai");
    const tanggalSelesaiEl = document.getElementById("filterTanggalSelesai");

    if (!tanggalMulaiEl || !tanggalSelesaiEl) return;

    let activeDate = "";

    try {
        const snapshot = await getDoc(activeDateConfigRef);

        if (
            snapshot.exists() &&
            snapshot.data() &&
            snapshot.data().activeDate
        ) {
            activeDate = String(snapshot.data().activeDate).trim();
        }
    } catch (error) {
        console.error("Gagal membaca tanggal aktif global:", error);
    }

    // Firestore menjadi prioritas. LocalStorage hanya fallback.
    activeDate =
        activeDate ||
        localStorage.getItem("activeInterviewDate") ||
        localStorage.getItem("activeInterviewDateStart") ||
        today;

    // Default admin selalu satu tanggal: tanggal aktif interview.
    tanggalMulaiEl.value = activeDate;
    tanggalSelesaiEl.value = activeDate;

    // Sinkronkan cache lokal agar halaman lain tetap kompatibel.
    localStorage.setItem("activeInterviewDate", activeDate);
    localStorage.setItem("activeInterviewDateStart", activeDate);
    localStorage.setItem("activeInterviewDateEnd", activeDate);

    updateTanggalHeader();

    // Baru ambil data setelah tanggal global sudah terpasang.
    loadData();
}


// ======================================================
// TAMPILKAN PERIODE AKTIF
// ======================================================

function formatTanggalID(value) {

    if (!value) return "-";

    const date = new Date(value + "T00:00:00");

    return date.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric"
    });

}


function updateTanggalHeader() {

    const mulai =
        document.getElementById("filterTanggalMulai").value;

    const selesai =
        document.getElementById("filterTanggalSelesai").value;

    const header = document.getElementById("tanggalAktif");

    if (!header) return;

    if (!mulai && !selesai) {
        header.innerText = "-";
        return;
    }

    if (mulai === selesai || !selesai) {
        header.innerText = formatTanggalID(mulai);
        return;
    }

    if (!mulai) {
        header.innerText = formatTanggalID(selesai);
        return;
    }

    header.innerText =
        `${formatTanggalID(mulai)} s/d ${formatTanggalID(selesai)}`;

}


updateTanggalHeader();


// ======================================================
// LOAD DATA
// ======================================================

function loadData() {

    const tanggalMulai =
        document.getElementById("filterTanggalMulai").value;

    const tanggalSelesai =
        document.getElementById("filterTanggalSelesai").value;


    if (!tanggalMulai || !tanggalSelesai) {

        alert("Pilih tanggal mulai dan tanggal sampai terlebih dahulu.");
        return;

    }


    if (tanggalMulai > tanggalSelesai) {

        alert("Tanggal mulai tidak boleh lebih besar dari tanggal sampai.");
        return;

    }


    updateTanggalHeader();


    localStorage.setItem("activeInterviewDateStart", tanggalMulai);
    localStorage.setItem("activeInterviewDateEnd", tanggalSelesai);
    // Tetap simpan key lama agar kompatibel dengan bagian sistem lain.
    localStorage.setItem("activeInterviewDate", tanggalMulai);


    // ==================================================
    // UNSUBSCRIBE LISTENER LAMA
    // ==================================================

    if (
        typeof unsubscribe ===
        "function"
    ) {

        unsubscribe();

    }


    // ==================================================
    // FIRESTORE QUERY
    // ==================================================

    const q =
        query(

            collection(
                db,
                "interviewQueue"
            ),

            where(
                "tanggal",
                ">=",
                tanggalMulai
            ),

            where(
                "tanggal",
                "<=",
                tanggalSelesai
            )

        );


    unsubscribe =
        onSnapshot(

            q,

            snapshot => {

                allCandidates =
                    [];


                snapshot.forEach(
                    docSnapshot => {

                        allCandidates.push({

                            id:
                                docSnapshot.id,

                            ...docSnapshot.data()

                        });

                    }
                );


                // ======================================
                // SORT NOMOR ANTREAN
                // ======================================

                allCandidates.sort(

                    (
                        a,
                        b
                    ) => {

                        return (

                            String(
                                a.nomorAntrian ||
                                ""
                            ).localeCompare(

                                String(
                                    b.nomorAntrian ||
                                    ""
                                ),

                                undefined,

                                {
                                    numeric:
                                        true
                                }

                            )

                        );

                    }

                );


                buildInterviewerFilter();


                terapkanFilter();

            },


            error => {

                console.error(
                    "Firebase error:",
                    error
                );


                document.getElementById(
                    "tableBody"
                ).innerHTML = `

                    <tr>

                        <td
                            colspan="15"
                            class="empty"
                        >

                            Gagal mengambil data.

                            <br><br>

                            ${escapeHtml(
                                error.message
                            )}

                        </td>

                    </tr>

                `;

            }

        );

}


initDefaultTanggalFilter();


// ======================================================
// FILTER DATE CHANGE
// ======================================================

document.getElementById("filterTanggalMulai").addEventListener(
    "change",
    function() {
        updateTanggalHeader();
        loadData();
    }
);


document.getElementById("filterTanggalSelesai").addEventListener(
    "change",
    function() {
        updateTanggalHeader();
        loadData();
    }
);


// ======================================================
// SEARCH ENTER
// ======================================================

document.getElementById(
    "filterSearch"
).addEventListener(

    "keyup",

    function(event) {

        if (
            event.key ===
            "Enter"
        ) {

            terapkanFilter();

        }

    }

);


// ======================================================
// BUILD INTERVIEWER FILTER
// ======================================================

function buildInterviewerFilter() {

    const select =
        document.getElementById(
            "filterInterviewer"
        );


    const currentValue =
        select.value;


    const names =
        new Set();


    allCandidates.forEach(
        candidate => {

            if (
                candidate.interviewer
            ) {

                names.add(
                    candidate.interviewer
                );

            }


            if (
                candidate.interviewerTahap1
            ) {

                names.add(
                    candidate.interviewerTahap1
                );

            }


            if (
                candidate.interviewerTahap2
            ) {

                names.add(
                    candidate.interviewerTahap2
                );

            }

        }
    );


    select.innerHTML = `

        <option value="">

            Semua Interviewer

        </option>

    `;


    Array.from(
        names
    )
    .sort(
        (a, b) =>
            a.localeCompare(b)
    )
    .forEach(
        name => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                name;


            option.textContent =
                name;


            select.appendChild(
                option
            );

        }
    );


    if (
        names.has(
            currentValue
        )
    ) {

        select.value =
            currentValue;

    }

}


// ======================================================
// TERAPKAN FILTER
// ======================================================

window.terapkanFilter =
    terapkanFilter;


function terapkanFilter() {

    const search =
        document.getElementById(
            "filterSearch"
        ).value
            .trim()
            .toLowerCase();


    const status =
        document.getElementById(
            "filterStatus"
        ).value;


    const kategori =
        document.getElementById(
            "filterKategori"
        ).value;


    const hasil =
        document.getElementById(
            "filterHasil"
        ).value;


    const hasil2 =
        document.getElementById(
            "filterHasil2"
        ).value;


    const interviewer =
        document.getElementById(
            "filterInterviewer"
        ).value;


    const jabatan =
        document.getElementById(
            "filterJabatan"
        ).value;


    const area =
        document.getElementById(
            "filterArea"
        ).value;


    filteredCandidates =
        allCandidates.filter(

            candidate => {

                // ======================================
                // TAB REKAP
                // ======================================

                if (activeInterviewTab !== "all") {
                    const category = getAdminCategory(candidate);
                    if (category !== activeInterviewTab) return false;
                }


                // ======================================
                // SEARCH
                // ======================================

                if (
                    search
                ) {

                    const searchable = (

                        String(
                            candidate.nama ||
                            ""
                        ) +

                        " " +

                        String(
                            candidate.nomorAntrian ||
                            ""
                        ) +

                        " " +

                        String(
                            candidate.nik ||
                            candidate.nomorKTP ||
                            ""
                        ) +

                        " " +

                        String(
                            candidate.email ||
                            ""
                        ) +

                        " " +

                        String(
                            candidate.noHp ||
                            candidate.nomorHP ||
                            ""
                        )

                    ).toLowerCase();


                    if (
                        !searchable.includes(
                            search
                        )
                    ) {

                        return false;

                    }

                }


                // ======================================
                // STATUS
                // ======================================

                if (status) {
                    const statusMatch =
                        status === "Menunggu"
                            ? (candidate.status === "Menunggu" || candidate.status === "Menunggu Interview 2")
                            : candidate.status === status;
                    if (!statusMatch) return false;
                }

                // ======================================
                // KATEGORI
                // ======================================
                if (kategori) {
                    if (getAdminCategory(candidate) !== kategori) return false;
                }


                // ======================================
                // HASIL INTERVIEW 1
                // ======================================

                if (
                    hasil &&
                    getNormalizedHasil1(candidate) !== hasil
                ) {

                    return false;

                }


                // ======================================
                // HASIL INTERVIEW 2
                // ======================================

                if (
                    hasil2
                ) {

                    let actualHasil2 =
                        candidate.hasilInterview2;


                    if (
                        !actualHasil2 &&
                        candidate.interview2Status ===
                            "Menunggu"
                    ) {

                        actualHasil2 =
                            "Menunggu";

                    }


                    if (
                        actualHasil2 !==
                        hasil2
                    ) {

                        return false;

                    }

                }


                // ======================================
                // INTERVIEWER
                // ======================================

                if (
                    interviewer
                ) {

                    const match =

                        candidate.interviewer ===
                            interviewer

                        ||

                        candidate.interviewerTahap1 ===
                            interviewer

                        ||

                        candidate.interviewerTahap2 ===
                            interviewer;


                    if (
                        !match
                    ) {

                        return false;

                    }

                }


                // ======================================
                // JABATAN
                // ======================================

                if (
                    jabatan &&
                    candidate.rekomendasiJabatan !==
                        jabatan
                ) {

                    return false;

                }


                // ======================================
                // AREA
                // ======================================

                if (
                    area &&
                    candidate.rekomendasiArea !==
                        area
                ) {

                    return false;

                }


                return true;

            }

        );


    renderTable(
        filteredCandidates
    );


    updateStatistics(
        filteredCandidates
    );


    updateSummary(
        filteredCandidates
    );

}


// ======================================================
// RESET FILTER
// ======================================================

window.resetFilter =
    resetFilter;


function resetFilter() {

    document.getElementById(
        "filterSearch"
    ).value =
        "";


    document.getElementById(
        "filterStatus"
    ).value =
        "";


    document.getElementById(
        "filterKategori"
    ).value =
        "";


    document.getElementById(
        "filterHasil"
    ).value =
        "";


    document.getElementById(
        "filterHasil2"
    ).value =
        "";


    document.getElementById(
        "filterInterviewer"
    ).value =
        "";


    document.getElementById(
        "filterJabatan"
    ).value =
        "";


    document.getElementById(
        "filterArea"
    ).value =
        "";


    terapkanFilter();

}


// ======================================================
// RENDER TABLE
// ======================================================

function renderTable(
    data
) {

    const tbody =
        document.getElementById(
            "tableBody"
        );


    document.getElementById(
        "jumlahData"
    ).innerText =

        data.length +
        " data";


    if (
        data.length ===
        0
    ) {

        tbody.innerHTML = `

            <tr>

                <td
                    colspan="15"
                    class="empty"
                >

                    Tidak ada data
                    sesuai filter.

                </td>

            </tr>

        `;

        return;

    }


    tbody.innerHTML =
        data
            .map(
                (
                    candidate,
                    index
                ) =>

                    createTableRow(
                        candidate,
                        index
                    )

            )
            .join("");

}


// ======================================================
// CREATE TABLE ROW
// ======================================================

function createTableRow(
    candidate,
    index
) {

    const tahap =
        Number(
            candidate.tahapInterview ||
            1
        );


    // ==================================================
    // STATUS BADGE
    // ==================================================

    const statusHTML =
        getStatusHTML(
            candidate
        );


    // ==================================================
    // HASIL I1
    // ==================================================

    const hasil1HTML =
        getHasil1HTML(
            candidate
        );


    // ==================================================
    // HASIL I2
    // ==================================================

    const hasil2HTML =
        getHasil2HTML(
            candidate
        );


    // ==================================================
    // INTERVIEWER
    // ==================================================

    const interviewer1 =

        candidate.interviewerTahap1 ||

        candidate.interviewer ||

        "-";


    const interviewer2 =

        candidate.interviewerTahap2 ||

        "-";


    return `

        <tr>

            <td>
                ${index + 1}
            </td>


            <td>

                <span
                    class="queue-number"
                >

                    ${escapeHtml(
                        candidate.nomorAntrian ||
                        "-"
                    )}

                </span>

            </td>


            <td>

                <strong>

                    ${escapeHtml(
                        candidate.nama ||
                        "-"
                    )}

                </strong>

            </td>


            <td>

                ${escapeHtml(
                    candidate.noRegistrasi ||
                    candidate.id ||
                    "-"
                )}

            </td>


            <td>

                ${escapeHtml(
                    formatTanggalID(
                        candidate.tanggal
                    )
                )}

            </td>


            <td>

                <span
                    class="
                        stage-badge
                        ${tahap === 2
                            ? "stage2"
                            : "stage1"}
                    "
                >

                    Interview
                    ${tahap}

                </span>

            </td>


            <td>

                ${candidate.totalScore != null
                    ? escapeHtml(
                        candidate.totalScore
                    ) + " / 25"
                    : "-"}

            </td>


            <td>

                ${hasil1HTML}

            </td>


            <td>

                ${escapeHtml(
                    candidate.rekomendasiJabatan ||
                    "-"
                )}

            </td>


            <td>

                ${escapeHtml(
                    candidate.rekomendasiArea ||
                    "-"
                )}

            </td>


            <td>

                ${escapeHtml(
                    interviewer1
                )}

            </td>


            <td>

                ${escapeHtml(
                    interviewer2
                )}

            </td>


            <td>

                ${hasil2HTML}

            </td>


            <td>

                <button

                    class="detail-button"

                    onclick="
                        bukaDetail(
                            '${candidate.id}'
                        )
                    "

                >

                    DETAIL

                </button>

            </td>


            <td>

                <button

                    class="delete-button"

                    onclick="
                        hapusKandidat(
                            '${candidate.id}',
                            '${escapeAttr(
                                candidate.nama || ""
                            )}'
                        )
                    "

                >

                    HAPUS

                </button>

            </td>

        </tr>

    `;

}


// ======================================================
// ESCAPE UNTUK ATRIBUT onclick
// ======================================================
// escapeHtml tidak cukup di dalam onclick='...' karena
// nama seperti MA'RUF punya apostrof yang bisa memutus
// string JavaScript-nya.

function escapeAttr(
    value
) {

    return String(value || "")
        .replace(/\\/g, "\\\\")
        .replace(/'/g, "\\'")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\r?\n/g, " ");
}


// ======================================================
// HASH (SAMA PERSIS DENGAN script.js)
// ======================================================
// Dipakai untuk menemukan dokumen di koleksi "candidates"
// dan "uniqueKeys", yang ID-nya adalah hash SHA-256 dari
// NIK (bukan NIK mentah).

async function hashValue(
    value
) {

    const hashBuffer =
        await crypto.subtle.digest(
            "SHA-256",
            new TextEncoder().encode(value)
        );

    return Array.from(
            new Uint8Array(hashBuffer)
        )
        .map(byte => byte.toString(16).padStart(2, "0"))
        .join("");
}


// ======================================================
// HAPUS KANDIDAT
// ======================================================
// Menghapus SEMUA jejak check-in kandidat dari Firestore:
//
//   1. interviewQueue/{nik}         -> antrian + hasil interview
//   2. candidates/{hash(nik)}       -> arsip kandidat
//   3. uniqueKeys/{hash("REGISTRASI:"+nik)} -> kunci anti-dobel
//
// Data undangan di bspCandidates SENGAJA TIDAK dihapus,
// supaya kandidat masih bisa check-in ulang dengan NIK
// yang sama tanpa perlu import Excel lagi.
//
// queueCounters juga tidak diutak-atik: nomor antrian tidak
// mundur, jadi kandidat berikutnya tetap dapat nomor unik.

async function hapusKandidat(
    nik,
    nama
) {

    if (
        !confirm(
            "Hapus kandidat berikut?\n\n" +
            "Nama : " + (nama || "-") + "\n" +
            "NIK  : " + nik + "\n\n" +
            "Semua data check-in dan hasil interviewnya akan " +
            "dihapus permanen dan TIDAK bisa dikembalikan.\n\n" +
            "Kandidat ini masih terdaftar sebagai undangan, " +
            "jadi dia bisa check-in lagi dengan NIK yang sama."
        )
    ) {
        return;
    }


    try {

        const candidateId =
            await hashValue(nik);

        const registrasiKey =
            await hashValue("REGISTRASI:" + nik);


        await Promise.all([

            deleteDoc(
                doc(db, "interviewQueue", nik)
            ),

            deleteDoc(
                doc(db, "candidates", candidateId)
            ),

            deleteDoc(
                doc(db, "uniqueKeys", registrasiKey)
            )

        ]);


        // Tabel memakai onSnapshot, jadi barisnya hilang
        // sendiri tanpa perlu reload halaman.

        alert(
            "Kandidat berhasil dihapus.\n\n" +
            (nama || "-") + " sekarang bisa check-in lagi " +
            "dengan NIK " + nik + "."
        );

    } catch (error) {

        console.error("ERROR HAPUS KANDIDAT:", error);

        alert(
            "Gagal menghapus kandidat.\n\n" +
            error.message
        );
    }
}


window.hapusKandidat = hapusKandidat;


// ======================================================
// STATUS HTML
// ======================================================

function getStatusHTML(
    candidate
) {

    if (
        candidate.status ===
        "Menunggu"
    ) {

        return `

            <span class="
                status
                status-menunggu
            ">

                MENUNGGU I1

            </span>

        `;

    }


    if (
        candidate.status ===
        "Menunggu Interview 2"
    ) {

        return `

            <span class="
                status
                status-interview2
            ">

                MENUNGGU I2

            </span>

        `;

    }


    if (
        candidate.status ===
        "Sedang Interview"
    ) {

        const tahap =
            Number(
                candidate.tahapInterview ||
                1
            );


        if (
            tahap === 2
        ) {

            return `

                <span class="
                    status
                    status-interview2
                ">

                    SEDANG I2

                </span>

            `;

        }


        return `

            <span class="
                status
                status-interview
            ">

                SEDANG I1

            </span>

        `;

    }


    if (
        candidate.status ===
        "Selesai"
    ) {

        return `

            <span class="
                status
                status-selesai
            ">

                SELESAI

            </span>

        `;

    }


    return escapeHtml(
        candidate.status ||
        "-"
    );

}


// ======================================================
// HASIL I1
// ======================================================

function getNormalizedHasil1(candidate) {
    const raw = String(
        candidate?.hasil ??
        candidate?.hasilInterview1 ??
        candidate?.hasilI1 ??
        ""
    )
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");

    if (
        raw === "tidak direkomendasikan" ||
        raw === "tidak disarankan" ||
        raw === "tidak direkomendasikan." ||
        raw === "tidak disarankan." ||
        raw === "not recommended" ||
        raw === "notrecommended"
    ) {
        return "Tidak Direkomendasikan";
    }

    if (
        raw === "dipertimbangkan" ||
        raw === "considered" ||
        raw === "pertimbangkan"
    ) {
        return "Dipertimbangkan";
    }

    if (
        raw === "disarankan" ||
        raw === "direkomendasikan" ||
        raw === "recommended" ||
        raw === "recommend" ||
        raw === "recommended / disarankan"
    ) {
        return "Disarankan";
    }

    // Jika hasil tidak tersimpan, gunakan total I1 sebagai fallback
    // agar kandidat 14/25 tetap tampil sebagai TIDAK DISARANKAN.
    const totalCandidates = [
        candidate?.totalScore,
        candidate?.totalI1,
        candidate?.totalInterview1,
        candidate?.scoreTotal,
        candidate?.total
    ];

    for (const value of totalCandidates) {
        const total = Number(value);
        if (!Number.isFinite(total)) continue;

        if (total >= 19) return "Disarankan";
        if (total >= 15) return "Dipertimbangkan";
        return "Tidak Direkomendasikan";
    }

    return "";
}


// ======================================================
// HASIL I1
// ======================================================

function getHasil1HTML(
    candidate
) {

    const hasil = getNormalizedHasil1(candidate);

    if (hasil === "Disarankan") {
        return `<span class="result-recommended">DISARANKAN</span>`;
    }

    if (hasil === "Dipertimbangkan") {
        return `<span class="result-considered">DIPERTIMBANGKAN</span>`;
    }

    if (hasil === "Tidak Direkomendasikan") {
        return `<span class="result-not">TIDAK DISARANKAN</span>`;
    }

    return "-";
}


// ======================================================
// HASIL I2
// ======================================================

function getHasil2HTML(
    candidate
) {

    if (
        candidate.hasilInterview2 ===
        "Setuju"
    ) {

        return `

            <span
                class="result-recommended"
            >

                SETUJU

            </span>

        `;

    }


    if (
        candidate.hasilInterview2 ===
        "Tidak Setuju"
    ) {

        return `

            <span
                class="result-not"
            >

                TIDAK SETUJU

            </span>

        `;

    }


    if (

        candidate.rekomendasiJabatan ===
            "FL Bibit"

        ||

        candidate.rekomendasiJabatan ===
            "Sales TAD"

    ) {

        if (
            candidate.interview2Status ===
                "Menunggu"
        ) {

            return `

                <span
                    class="result-waiting"
                >

                    MENUNGGU

                </span>

            `;

        }


        if (
            candidate.interview2Status ===
                "Sedang Interview"
        ) {

            return `

                <span
                    class="result-waiting"
                >

                    SEDANG I2

                </span>

            `;

        }

    }


    return "-";

}


// ======================================================
// STATISTICS
// ======================================================

function updateStatistics(
    data
) {
    const total = data.length;

    const recommended = data.filter(
        candidate => getNormalizedHasil1(candidate) === "Disarankan"
    ).length;

    const considered = data.filter(
        candidate => getNormalizedHasil1(candidate) === "Dipertimbangkan"
    ).length;

    const notRecommended = data.filter(
        candidate => getNormalizedHasil1(candidate) === "Tidak Direkomendasikan"
    ).length;

    // Kandidat yang masuk cabang persetujuan I2:
    // hanya kandidat Dipertimbangkan yang kemudian disetujui
    // berdasarkan rekomendasi jabatan Bibit / TAD.
    const setujuBibit = data.filter(
        candidate =>
            getNormalizedHasil1(candidate) === "Dipertimbangkan" &&
            String(candidate.hasilInterview2 || "").trim().toLowerCase() === "setuju" &&
            candidate.rekomendasiJabatan === "FL Bibit"
    ).length;

    const setujuTad = data.filter(
        candidate =>
            getNormalizedHasil1(candidate) === "Dipertimbangkan" &&
            String(candidate.hasilInterview2 || "").trim().toLowerCase() === "setuju" &&
            candidate.rekomendasiJabatan === "Sales TAD"
    ).length;

    // Untuk tab BIBIT / TAD, statistik ditampilkan sebagai alur persetujuan:
    // Total Kandidat -> Disetujui -> Tidak Disetujui.
    // Kandidat yang belum mendapat persetujuan dihitung sebagai belum disetujui,
    // sehingga Total = Disetujui + Tidak Disetujui.
    const isSpecialApprovalTab =
        activeInterviewTab === "bibit" || activeInterviewTab === "tad";

    document.body.classList.toggle("approval-tab-active", isSpecialApprovalTab);

    if (isSpecialApprovalTab) {
        const approved = data.filter(candidate =>
            String(candidate.hasilInterview2 || "").trim().toLowerCase() === "setuju"
        ).length;

        const notApproved = Math.max(0, total - approved);

        setText("statTotal", total);
        setText("statApproved", approved);
        setText("statNotApproved", notApproved);

        const approvedCard = document.getElementById("statApprovalApprovedCard");
        const notApprovedCard = document.getElementById("statApprovalNotCard");
        const recommendedCard = document.querySelector(".stat-recommended");
        const consideredTree = document.querySelector(".stat-considered-tree");
        const notRecommendedCard = document.querySelector(".stat-not");

        if (approvedCard) approvedCard.style.display = "flex";
        if (notApprovedCard) notApprovedCard.style.display = "flex";
        if (recommendedCard) recommendedCard.style.display = "none";
        if (consideredTree) consideredTree.style.display = "none";
        if (notRecommendedCard) notRecommendedCard.style.display = "none";
    } else {
        const approvedCard = document.getElementById("statApprovalApprovedCard");
        const notApprovedCard = document.getElementById("statApprovalNotCard");
        const recommendedCard = document.querySelector(".stat-recommended");
        const consideredTree = document.querySelector(".stat-considered-tree");
        const notRecommendedCard = document.querySelector(".stat-not");

        if (approvedCard) approvedCard.style.display = "none";
        if (notApprovedCard) notApprovedCard.style.display = "none";
        if (recommendedCard) recommendedCard.style.display = "flex";
        if (consideredTree) consideredTree.style.display = "grid";
        if (notRecommendedCard) notRecommendedCard.style.display = "flex";

        setText("statTotal", total);
        setText("statRecommended", recommended);
        setText("statConsidered", considered);
        setText("statNotRecommended", notRecommended);
        setText("statSetujuBibit", setujuBibit);
        setText("statSetujuTad", setujuTad);
    }
}

// ======================================================
// SUMMARY / KESIMPULAN REKOMENDASI PER AREA
// ======================================================

function updateSummary(data) {
    updateAreaConclusion(data);
}

function updateAreaConclusion(data) {
    const areaList = [
        "Area Jakarta Barat",
        "Area Banten",
        "Area Jakarta Thamrin",
        "Area Tangerang Selatan",
        "RO IV Jakarta 1"
    ];

    const element = document.getElementById("summaryConclusion");
    if (!element) return;

    const rows = areaList.map(area => {
        const areaCandidates = data.filter(candidate =>
            String(candidate.rekomendasiArea || "").trim() === area
        );

        // Organik: hanya kandidat dengan hasil Interview 1 = DISARANKAN.
        const flOrganik = areaCandidates.filter(candidate =>
            candidate.rekomendasiJabatan === "FL Organik" &&
            getNormalizedHasil1(candidate) === "Disarankan"
        ).length;

        const salesOrganik = areaCandidates.filter(candidate =>
            candidate.rekomendasiJabatan === "Sales Organik" &&
            getNormalizedHasil1(candidate) === "Disarankan"
        ).length;

        // Bibit/TAD: hanya kandidat dengan hasil Interview 2 = SETUJU.
        const isSetuju = candidate =>
            String(candidate.hasilInterview2 || "").trim().toLowerCase() === "setuju";

        const bibit = areaCandidates.filter(candidate =>
            candidate.rekomendasiJabatan === "FL Bibit" && isSetuju(candidate)
        ).length;

        const tad = areaCandidates.filter(candidate =>
            candidate.rekomendasiJabatan === "Sales TAD" && isSetuju(candidate)
        ).length;

        return `
            <tr>
                <td class="area-name">${escapeHtml(area)}</td>
                <td class="col-fl">${flOrganik}</td>
                <td class="col-sales">${salesOrganik}</td>
                <td class="col-tad">${tad}</td>
                <td class="col-bibit">${bibit}</td>
            </tr>
        `;
    }).join("");

    element.innerHTML = `
        <div class="area-summary-table-wrap">
            <table class="area-summary-table">
                <thead>
                    <tr>
                        <th class="th-area" rowspan="2">Area</th>
                        <th class="th-organik" colspan="2">Organik</th>
                        <th class="th-tad" rowspan="2">TAD Sales</th>
                        <th class="th-bibit" rowspan="2">Bibit</th>
                    </tr>
                    <tr class="subhead">
                        <th>FL</th>
                        <th>Sales</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
            </table>
        </div>
    `;
}


// ======================================================
// DETAIL
// ======================================================

window.bukaDetail =
    bukaDetail;


function bukaDetail(
    id
) {

    const candidate =
        allCandidates.find(

            item =>
                item.id ===
                id

        );


    if (
        !candidate
    ) {

        alert(
            "Data kandidat tidak ditemukan."
        );

        return;

    }


    const modal =
        document.getElementById(
            "detailModal"
        );


    const content =
        document.getElementById(
            "detailContent"
        );


    content.innerHTML =
        buildDetailHTML(
            candidate
        );


    modal.style.display =
        "flex";

}


// ======================================================
// BUILD DETAIL
// ======================================================

function buildDetailHTML(
    candidate
) {

    const tahap =
        Number(
            candidate.tahapInterview ||
            1
        );


    let finalClass =
        "final-waiting";


    let finalText =
        "PROSES BELUM FINAL";


    if (
        candidate.status ===
        "Selesai"
    ) {

        finalClass =
            "final-recommended";


        finalText =
            "SELESAI FINAL";

    }


    if (

        getNormalizedHasil1(candidate) ===
        "Tidak Direkomendasikan"

    ) {

        finalClass =
            "final-not";


        finalText =
            "TIDAK DISARANKAN";

    }


    if (

        candidate.hasilInterview2 ===
        "Tidak Setuju"

    ) {

        finalClass =
            "final-not";


        finalText =
            "INTERVIEW 2 - TIDAK SETUJU";

    }


    return `

        <div class="
            final-result
            ${finalClass}
        ">

            ${finalText}

        </div>


        <!-- ==========================================
             DATA KANDIDAT
             ========================================== -->

        <div class="detail-box">

            <h3>
                Data Kandidat
            </h3>


            ${detailRow(
                "Nomor Kandidat",
                candidate.nomorAntrian
            )}


            ${detailRow(
                "Nama Lengkap",
                candidate.nama
            )}


            ${detailRow(
                "NIK",
                candidate.nik ||
                candidate.nomorKTP
            )}


            ${detailRow(
                "Email",
                candidate.email
            )}


            ${detailRow(
                "Nomor HP",
                candidate.noHp ||
                candidate.nomorHP
            )}


            ${detailRow(
                "Posisi",
                candidate.posisi
            )}


            ${detailRow(
                "Status",
                candidate.status
            )}


            ${detailRow(
                "Tahap Aktif",
                `Interview ${tahap}`
            )}

        </div>


        <!-- ==========================================
             INTERVIEW 1
             ========================================== -->

        <div class="detail-box">

            <h3 class="stage-title">

                Interview 1

            </h3>


            ${detailRow(
                "Interviewer",
                candidate.interviewerTahap1 ||
                candidate.interviewer
            )}


            ${detailRow(
                "Waktu Mulai",
                formatDateTime(
                    candidate.waktuMulai
                )
            )}


            ${detailRow(
                "Waktu Submit",
                formatDateTime(
                    candidate.waktuSubmitTahap1 ||
                    candidate.waktuSubmit
                )
            )}


            ${detailRow(
                "Penampilan",
                candidate.scorePenampilan
            )}


            ${detailRow(
                "Motivasi",
                candidate.scoreMotivasi
            )}


            ${detailRow(
                "Komunikasi",
                candidate.scoreKomunikasi
            )}


            ${detailRow(
                "Pengalaman Relevan",
                candidate.scorePengalaman
            )}


            ${detailRow(
                "Culture Fit - Kontribusi Maksimal",
                candidate.scoreCulture
            )}


            ${detailRow(
                "Total",
                candidate.totalScore != null
                    ? candidate.totalScore +
                      " / 25"
                    : "-"
            )}


            ${detailRow(
                "Hasil",
                getNormalizedHasil1(candidate) === "Tidak Direkomendasikan"
                    ? "TIDAK DISARANKAN"
                    : getNormalizedHasil1(candidate) === "Dipertimbangkan"
                        ? "DIPERTIMBANGKAN"
                        : getNormalizedHasil1(candidate) === "Disarankan"
                            ? "DISARANKAN"
                            : candidate.hasil
            )}


            ${detailRow(
                "Rekomendasi Jabatan",
                candidate.rekomendasiJabatan
            )}


            ${detailRow(
                "Rekomendasi Area",
                candidate.rekomendasiArea
            )}


            <div
                style="
                    margin-top:12px;
                "
            >

                <div
                    class="detail-label"
                    style="
                        margin-bottom:7px;
                    "
                >

                    Catatan Interviewer

                </div>


                <div class="notes">

                    ${escapeHtml(
                        candidate.catatan ||
                        "-"
                    )}

                </div>

            </div>

        </div>


        <!-- ==========================================
             INTERVIEW 2
             ========================================== -->

        <div class="detail-box">

            <h3 class="stage-title">

                Interview 2

            </h3>


            ${
                isNeedInterview2(
                    candidate
                )

                    ? `

                        ${detailRow(
                            "Status Interview 2",
                            candidate.interview2Status ||
                            "Menunggu"
                        )}


                        ${detailRow(
                            "Interviewer",
                            candidate.interviewerTahap2
                        )}


                        ${detailRow(
                            "Waktu Mulai",
                            formatDateTime(
                                candidate.waktuMulaiTahap2
                            )
                        )}


                        ${detailRow(
                            "Waktu Submit",
                            formatDateTime(
                                candidate.waktuSubmitTahap2
                            )
                        )}


                        ${detailRow(
                            "Hasil",
                            candidate.hasilInterview2 ||
                            "Menunggu"
                        )}


                        ${detailRow(
                            "Final",
                            candidate.interview2Final === true
                                ? "YA"
                                : "BELUM"
                        )}

                    `

                    : `

                        <div
                            style="
                                color:#777;
                                padding:10px 0;
                            "
                        >

                            Kandidat ini tidak memerlukan
                            Interview 2.

                        </div>

                    `

            }

        </div>


        <!-- ==========================================
             TIMELINE
             ========================================== -->

        <div class="detail-box">

            <h3 class="stage-title">

                Timeline Proses

            </h3>


            ${timelineRow(
                "Check-in",
                candidate.createdAt ||
                candidate.waktuDaftar
            )}


            ${timelineRow(
                "Mulai Interview 1",
                candidate.waktuMulai
            )}


            ${timelineRow(
                "Submit Interview 1",
                candidate.waktuSubmitTahap1 ||
                candidate.waktuSubmit
            )}


            ${
                isNeedInterview2(
                    candidate
                )

                    ? `

                        ${timelineRow(
                            "Mulai Interview 2",
                            candidate.waktuMulaiTahap2
                        )}


                        ${timelineRow(
                            "Submit Interview 2",
                            candidate.waktuSubmitTahap2
                        )}

                    `

                    : ""

            }

        </div>

    `;

}


// ======================================================
// NEED INTERVIEW 2
// ======================================================

function isNeedInterview2(
    candidate
) {

    return (

        candidate.rekomendasiJabatan ===
            "FL Bibit"

        ||

        candidate.rekomendasiJabatan ===
            "Sales TAD"

    );

}


// ======================================================
// DETAIL ROW
// ======================================================

function detailRow(
    label,
    value
) {

    return `

        <div class="detail-row">

            <span class="detail-label">

                ${escapeHtml(
                    label
                )}

            </span>


            <span class="detail-value">

                ${escapeHtml(
                    value == null ||
                    value === ""
                        ? "-"
                        : value
                )}

            </span>

        </div>

    `;

}


// ======================================================
// TIMELINE ROW
// ======================================================

function timelineRow(
    label,
    value
) {

    return `

        <div class="detail-row">

            <span class="detail-label">

                ${escapeHtml(
                    label
                )}

            </span>


            <span class="detail-value">

                ${formatDateTime(
                    value
                )}

            </span>

        </div>

    `;

}


// ======================================================
// FORMAT DATETIME
// ======================================================

function formatDateTime(
    value
) {

    if (
        !value
    ) {

        return "-";

    }


    const date =
        new Date(
            value
        );


    if (
        isNaN(
            date.getTime()
        )
    ) {

        return String(
            value
        );

    }


    return date.toLocaleString(
        "id-ID",
        {
            day:
                "2-digit",

            month:
                "2-digit",

            year:
                "numeric",

            hour:
                "2-digit",

            minute:
                "2-digit",

            second:
                "2-digit"
        }
    );

}


// ======================================================
// CLOSE DETAIL
// ======================================================

window.tutupDetail =
    tutupDetail;


function tutupDetail() {

    document.getElementById(
        "detailModal"
    ).style.display =
        "none";

}


// ======================================================
// CLOSE MODAL CLICK OUTSIDE
// ======================================================

document.getElementById(
    "detailModal"
).addEventListener(

    "click",

    function(event) {

        if (
            event.target ===
            this
        ) {

            tutupDetail();

        }

    }

);


// ======================================================
// EXPORT EXCEL
// ======================================================

window.exportExcel =
    exportExcel;


function exportExcel() {

    if (
        filteredCandidates.length ===
        0
    ) {

        alert(
            "Tidak ada data untuk diekspor."
        );

        return;

    }


    const exportData =
        filteredCandidates.map(

            (candidate, index) => {

                return {

                    "No":
                        index + 1,

                    "Tanggal":
                        candidate.tanggal ||
                        "",

                    "Nomor Kandidat":
                        candidate.nomorAntrian ||
                        "",

                    "Nama Lengkap":
                        candidate.nama ||
                        "",

                    "NIK":
                        candidate.nik ||
                        candidate.nomorKTP ||
                        "",

                    "Email":
                        candidate.email ||
                        "",

                    "Nomor HP":
                        candidate.noHp ||
                        candidate.nomorHP ||
                        "",

                    "Posisi":
                        candidate.posisi ||
                        "",

                    "Status":
                        candidate.status ||
                        "",

                    "Tahap Interview":
                        candidate.tahapInterview ||
                        1,


                    // ==================================
                    // INTERVIEW 1
                    // ==================================

                    "Interviewer I1":
                        candidate.interviewerTahap1 ||
                        candidate.interviewer ||
                        "",

                    "Waktu Mulai I1":
                        formatDateTime(
                            candidate.waktuMulai
                        ),

                    "Waktu Submit I1":
                        formatDateTime(
                            candidate.waktuSubmitTahap1 ||
                            candidate.waktuSubmit
                        ),

                    "Penampilan":
                        candidate.scorePenampilan ??
                        "",

                    "Motivasi":
                        candidate.scoreMotivasi ??
                        "",

                    "Komunikasi":
                        candidate.scoreKomunikasi ??
                        "",

                    "Pengalaman Relevan":
                        candidate.scorePengalaman ??
                        "",

                    "Culture Fit - Kontribusi Maksimal":
                        candidate.scoreCulture ??
                        "",

                    "Total Nilai I1":
                        candidate.totalScore ??
                        "",

                    "Hasil I1":
                        getNormalizedHasil1(candidate) === "Tidak Direkomendasikan"
                            ? "TIDAK DISARANKAN"
                            : getNormalizedHasil1(candidate) === "Dipertimbangkan"
                                ? "DIPERTIMBANGKAN"
                                : getNormalizedHasil1(candidate) === "Disarankan"
                                    ? "DISARANKAN"
                                    : candidate.hasil ||
                                        "",

                    "Rekomendasi Jabatan":
                        candidate.rekomendasiJabatan ||
                        "",

                    "Rekomendasi Area":
                        candidate.rekomendasiArea ||
                        "",

                    "Catatan Interviewer":
                        candidate.catatan ||
                        "",


                    // ==================================
                    // INTERVIEW 2
                    // ==================================

                    "Status I2":
                        candidate.interview2Status ||
                        "",

                    "Interviewer I2":
                        candidate.interviewerTahap2 ||
                        "",

                    "Waktu Mulai I2":
                        formatDateTime(
                            candidate.waktuMulaiTahap2
                        ),

                    "Waktu Submit I2":
                        formatDateTime(
                            candidate.waktuSubmitTahap2
                        ),

                    "Hasil I2":
                        candidate.hasilInterview2 ||
                        "",

                    "I2 Final":
                        candidate.interview2Final === true
                            ? "YA"
                            : "TIDAK",


                    // ==================================
                    // FINAL
                    // ==================================

                    "Final":
                        candidate.final === true
                            ? "YA"
                            : "TIDAK"

                };

            }

        );


    const worksheet =
        XLSX.utils.json_to_sheet(
            exportData
        );


    const workbook =
        XLSX.utils.book_new();


    XLSX.utils.book_append_sheet(

        workbook,

        worksheet,

        "Data Interview"

    );


    // ==================================================
    // AUTO WIDTH
    // ==================================================

    const keys =
        Object.keys(
            exportData[0] ||
            {}
        );


    worksheet["!cols"] =
        keys.map(

            key => {

                let maxLength =
                    key.length;


                exportData.forEach(

                    row => {

                        const value =
                            row[key] == null
                                ? ""
                                : String(
                                    row[key]
                                );


                        maxLength =
                            Math.max(
                                maxLength,
                                value.length
                            );

                    }

                );


                return {

                    wch:
                        Math.min(
                            maxLength + 2,
                            40
                        )

                };

            }

        );


    const tanggalMulai =
        document.getElementById("filterTanggalMulai").value ||
        getTodayKey();

    const tanggalSelesai =
        document.getElementById("filterTanggalSelesai").value ||
        tanggalMulai;

    const periode =
        tanggalMulai === tanggalSelesai
            ? tanggalMulai
            : `${tanggalMulai}_sampai_${tanggalSelesai}`;


    XLSX.writeFile(

        workbook,

        `Dashboard_Interview_${periode}.xlsx`

    );

}


// ======================================================
// IMPORT / UPDATE DATA BSP EXCEL
// ======================================================

window.importBSPExcel = importBSPExcel;

async function importBSPExcel() {
    const fileInput = document.getElementById("fileBSP");
    const statusElement = document.getElementById("statusImportBSP");

    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
        alert("Silakan pilih file Excel BSP terlebih dahulu.");
        return;
    }

    const file = fileInput.files[0];
    const fileName = file.name.toLowerCase();

    if (!fileName.endsWith(".xlsx") && !fileName.endsWith(".xls")) {
        alert("File harus berupa Excel (.xlsx atau .xls).");
        return;
    }

    try {
        if (statusElement) statusElement.innerText = "Membaca file Excel...";

        if (typeof XLSX === "undefined") {
            throw new Error("Library Excel belum dimuat. Tambahkan SheetJS pada admin.html.");
        }

        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: "array" });

        if (!workbook.SheetNames.length) {
            throw new Error("File Excel tidak memiliki sheet.");
        }

        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

        if (!rows.length) {
            throw new Error("Data Excel kosong.");
        }

        const headers = Object.keys(rows[0]);
        let regColumn = null;
        let nameColumn = null;

        headers.forEach(header => {
            const normalized = String(header).trim().toLowerCase().replace(/\s+/g, " ");
            if (normalized === "no registrasi") regColumn = header;
            if (normalized === "nama") nameColumn = header;
        });

        if (!regColumn) throw new Error("Kolom 'No Registrasi' tidak ditemukan.");
        if (!nameColumn) throw new Error("Kolom 'Nama' tidak ditemukan.");

        const map = new Map();
        let invalid = 0;
        let scientific = 0;

        rows.forEach(row => {
            let noRegistrasi = String(row[regColumn] ?? "").trim();
            const nama = String(row[nameColumn] ?? "").trim();

            // Excel sering mengubah NIK 16 digit menjadi angka dan
            // menampilkannya sebagai notasi ilmiah (3,27301E+15).
            // Kalau itu terjadi digit aslinya sudah hilang, jadi baris
            // ini ditolak dan user diberi tahu cara memperbaikinya.
            if (/[eE]\+?\d+$/.test(noRegistrasi)) {
                scientific++;
                invalid++;
                return;
            }

            noRegistrasi = noRegistrasi.replace(/\.0$/, "").replace(/\s/g, "");

            // Terima angka berapa pun panjangnya: No Registrasi lama
            // (7 digit) maupun NIK (16 digit).
            if (!/^\d+$/.test(noRegistrasi) || !nama) {
                invalid++;
                return;
            }

            map.set(noRegistrasi, {
                noRegistrasi,
                nama
            });
        });

        const data = Array.from(map.values());

        if (!data.length) {
            throw new Error(
                scientific
                    ? "Tidak ada data BSP valid. Kolom NIK terbaca sebagai angka (contoh: 3,27301E+15). Di Excel: blok kolom NIK, ubah Format Cells menjadi Text, ketik/paste ulang NIK-nya, simpan, lalu import lagi."
                    : "Tidak ada data BSP valid. Pastikan No Registrasi / NIK berupa angka dan Nama terisi."
            );
        }

        let saved = 0;
        const BATCH_SIZE = 450;

        for (let i = 0; i < data.length; i += BATCH_SIZE) {
            const batch = writeBatch(db);
            const chunk = data.slice(i, i + BATCH_SIZE);

            chunk.forEach(item => {
                batch.set(
                    doc(db, "bspCandidates", item.noRegistrasi),
                    {
                        noRegistrasi: item.noRegistrasi,
                        nama: item.nama,
                        updatedAt: new Date().toISOString()
                    },
                    { merge: true }
                );
            });

            await batch.commit();
            saved += chunk.length;

            if (statusElement) {
                statusElement.innerText = `Menyimpan data BSP... ${saved} / ${data.length}`;
            }
        }

        if (statusElement) {
            statusElement.innerHTML = `<strong style="color:#007a45;">Import BSP berhasil.</strong><br>${saved} data ditambahkan/diperbarui.${invalid ? `<br>${invalid} baris invalid dilewati.` : ""}${scientific ? `<br><strong style="color:#b02a37;">${scientific} baris NIK-nya terbaca sebagai angka (3,27301E+15). Ubah format kolom NIK di Excel menjadi Text lalu import ulang.</strong>` : ""}`;
        }

        fileInput.value = "";
        alert(`Import BSP berhasil.\n\n${saved} data ditambahkan/diperbarui.${invalid ? `\n${invalid} baris invalid dilewati.` : ""}${scientific ? `\n\nPERHATIAN: ${scientific} baris NIK-nya terbaca sebagai angka (3,27301E+15). Ubah format kolom NIK di Excel menjadi Text, lalu import ulang.` : ""}`);

    } catch (error) {
        console.error("ERROR IMPORT BSP:", error);

        if (statusElement) {
            statusElement.innerHTML = `<strong style="color:#b02a37;">Import gagal.</strong><br>${escapeHtml(error.message)}`;
        }

        alert(`Import BSP gagal.\n\n${error.message}`);
    }
}

// ======================================================

// HELPER SET TEXT
// ======================================================

function setText(
    id,
    value
) {

    const element =
        document.getElementById(
            id
        );


    if (
        element
    ) {

        element.innerText =
            value;

    }

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
        text == null
            ? ""
            : String(
                text
            );


    return div.innerHTML;

}


// ======================================================
// INITIAL TAB
// ======================================================

gantiTabInterview("all");


// ======================================================
// AUTO REFRESH WHEN WINDOW BECOMES ACTIVE
// ======================================================

document.addEventListener(

    "visibilitychange",

    function() {

        if (
            !document.hidden
        ) {

            updateTanggalHeader();

        }

    }

);
