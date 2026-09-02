// ======================================================
// FIREBASE
// ======================================================

import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";


import {
    getFirestore,
    doc,
    getDoc,
    setDoc,
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
// FIREBASE
// ======================================================

const app =
    initializeApp(firebaseConfig);


const db =
    getFirestore(app);


console.log(
    "Firebase berhasil terhubung!"
);


// ======================================================
// ADMIN
// ======================================================

const ADMIN_PASSWORD =
    "hcbpro4";


// ======================================================
// TANGGAL
// ======================================================

function getTodayKey() {

    const today =
        new Date();


    const year =
        today.getFullYear();


    const month =
        String(
            today.getMonth() + 1
        ).padStart(
            2,
            "0"
        );


    const day =
        String(
            today.getDate()
        ).padStart(
            2,
            "0"
        );


    return (
        year +
        "-" +
        month +
        "-" +
        day
    );
}


// ======================================================
// ACTIVE DATE - GLOBAL / FIRESTORE
// ======================================================
// Tanggal interview sekarang disimpan di Firestore, bukan
// hanya localStorage. Jadi ketika admin mengubah tanggal
// di satu perangkat, semua perangkat akan mengikuti tanggal
// yang sama secara global.
// ======================================================

const activeDateRef =
    doc(
        db,
        "systemConfig",
        "interviewSettings"
    );


let activeDateCache =
    null;


let activeDateReadyResolve;


const activeDateReady =
    new Promise(
        resolve => {
            activeDateReadyResolve = resolve;
        }
    );


function setActiveDateCache(
    tanggal
) {

    if (!tanggal) {
        return;
    }


    activeDateCache =
        tanggal;


    // Cache lokal hanya sebagai cadangan/offline.
    localStorage.setItem(
        "activeInterviewDate",
        tanggal
    );


    if (
        activeDateReadyResolve
    ) {
        activeDateReadyResolve(
            tanggal
        );

        activeDateReadyResolve =
            null;
    }


    tampilkanTanggal();
}


// Dengarkan perubahan tanggal secara realtime.
// Semua komputer yang membuka sistem akan menerima perubahan
// admin tanpa perlu menyimpan tanggal masing-masing perangkat.
onSnapshot(
    activeDateRef,
    snapshot => {

        if (
            snapshot.exists() &&
            snapshot.data().activeDate
        ) {

            setActiveDateCache(
                snapshot.data().activeDate
            );

            return;
        }


        const tanggalAwal =
            getTodayKey();


        setActiveDateCache(
            tanggalAwal
        );


        setDoc(
            activeDateRef,
            {
                activeDate:
                    tanggalAwal,
                updatedAt:
                    new Date().toISOString()
            },
            { merge: true }
        ).catch(
            error => {
                console.error(
                    "Gagal membuat konfigurasi tanggal global:",
                    error
                );
            }
        );
    },
    error => {

        console.error(
            "Gagal membaca tanggal global:",
            error
        );

        // Fallback supaya sistem tetap bisa dibuka bila
        // koneksi Firestore sedang bermasalah.
        const fallbackDate =
            localStorage.getItem(
                "activeInterviewDate"
            ) ||
            getTodayKey();


        setActiveDateCache(
            fallbackDate
        );
    }
);


async function getActiveDate() {

    if (
        activeDateCache
    ) {
        return activeDateCache;
    }


    return await activeDateReady;
}


// ======================================================
// FORMAT TANGGAL
// ======================================================

function formatTanggal(
    tanggal
) {

    const date =
        new Date(
            tanggal +
            "T00:00:00"
        );


    return date.toLocaleDateString(
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
// TAMPILKAN TANGGAL
// ======================================================

async function tampilkanTanggal() {

    const element =
        document.getElementById(
            "tanggalAktif"
        );


    if (!element) {
        return;
    }


    element.innerText =
        formatTanggal(
            await getActiveDate()
        );
}


// ======================================================
// PREFIX HARI
// ======================================================

function numberToLetter(
    number
) {

    let result =
        "";


    while (
        number > 0
    ) {

        const remainder =
            (
                number - 1
            ) % 26;


        result =
            String.fromCharCode(
                65 +
                remainder
            ) +
            result;


        number =
            Math.floor(
                (
                    number - 1
                ) / 26
            );
    }


    return result;
}


// ======================================================
// QUEUE PREFIX
// ======================================================
//
// PREFIX BERDASARKAN URUTAN SESI INTERVIEW, BUKAN SELISIH
// TANGGAL KALENDER.
// Contoh:
// 26 Agustus = sesi pertama = A
// 28 Agustus = sesi kedua  = B
// 30 Agustus = sesi ketiga = C
// Jadi jika ada jeda 1, 2, atau 10 hari, huruf tetap mengikuti
// urutan hari/sesi interview.
//
// Mapping tanggal -> huruf disimpan terpusat di Firestore agar
// semua komputer/perangkat menggunakan prefix yang sama.
// ======================================================

function getLegacyStartDate() {

    let startDate =
        localStorage.getItem(
            "interviewStartDate"
        );


    if (!startDate) {

        startDate =
            getActiveDate();


        localStorage.setItem(
            "interviewStartDate",
            startDate
        );
    }


    return startDate;
}


function getPrefixFromMapping(
    mapping,
    activeDate
) {

    if (
        mapping &&
        mapping[activeDate]
    ) {

        return mapping[activeDate];
    }


    return null;
}


// ======================================================
// FORMAT NOMOR ANTRIAN
// ======================================================

function formatQueueNumber(
    prefix,
    number
) {

    return (
        prefix +
        "-" +
        String(
            number
        ).padStart(
            3,
            "0"
        )
    );
}


// ======================================================
// HASH
// ======================================================

async function hashValue(
    value
) {

    const encoder =
        new TextEncoder();


    const data =
        encoder.encode(
            value
        );


    const hashBuffer =
        await crypto.subtle.digest(
            "SHA-256",
            data
        );


    const hashArray =
        Array.from(
            new Uint8Array(
                hashBuffer
            )
        );


    return hashArray
        .map(
            byte =>
                byte
                    .toString(16)
                    .padStart(
                        2,
                        "0"
                    )
        )
        .join("");
}


// ======================================================
// UNIQUE KEY
// ======================================================

async function createUniqueKey(
    type,
    value
) {

    return await hashValue(
        type +
        ":" +
        value
    );
}


// ======================================================
// NORMALISASI NAMA
// ======================================================

function normalisasiNama(
    nama
) {

    return String(
            nama || ""
        )

        // Samakan semua varian apostrof (‘ ’ ʼ ` ´)
        // menjadi apostrof lurus ('), biar nama seperti
        // MA'RUF dan MA’RUF dianggap sama.
        .replace(
            /[\u2018\u2019\u02BC\u02B9\u0060\u00B4]/g,
            "'"
        )

        .trim()
        .replace(
            /\s+/g,
            " "
        )
        .toUpperCase();
}


// ======================================================
// VALIDASI BSP
// ======================================================

async function validasiBSP(
    noRegistrasi,
    namaInput
) {

    const bspRef =
        doc(
            db,
            "bspCandidates",
            noRegistrasi
        );


    const bspSnapshot =
        await getDoc(
            bspRef
        );


    // ================================================
    // NOMOR REGISTRASI TIDAK ADA
    // ================================================

    if (
        !bspSnapshot.exists()
    ) {

        return {

            valid:
                false,

            error:
                "REGISTRASI_TIDAK_DITEMUKAN"
        };
    }


    const bspData =
        bspSnapshot.data();


    const namaBSP =
        normalisasiNama(
            bspData.nama || ""
        );


    const namaPeserta =
        normalisasiNama(
            namaInput
        );


    // ================================================
    // NAMA TIDAK COCOK
    // ================================================

    if (
        namaBSP !==
        namaPeserta
    ) {

        return {

            valid:
                false,

            error:
                "NAMA_TIDAK_SESUAI",

            namaTerdaftar:
                bspData.nama || ""
        };
    }


    // ================================================
    // VALID
    // ================================================

    return {

        valid:
            true,

        data:
            bspData
    };
}


// ======================================================
// PROSES CHECK-IN
// ======================================================

async function prosesCheckIn(
    candidateData
) {

    const activeDate =
        await getActiveDate();


    // ==================================================
    // UNIQUE KEY REGISTRASI
    // ==================================================

    const registrasiKey =
        await createUniqueKey(
            "REGISTRASI",
            candidateData.noRegistrasi
        );


    // ==================================================
    // REFERENCES
    // ==================================================

    const registrasiRef =
        doc(
            db,
            "uniqueKeys",
            registrasiKey
        );


    const counterRef =
        doc(
            db,
            "queueCounters",
            activeDate
        );


    // ==================================================
    // MAPPING HARI / SESI INTERVIEW
    // ==================================================

    const queueDayRef =
        doc(
            db,
            "queueDayConfig",
            "main"
        );


    // ==================================================
    // ID CANDIDATE
    // ==================================================

    const candidateId =
        await hashValue(
            candidateData.noRegistrasi
        );


    const candidateRef =
        doc(
            db,
            "candidates",
            candidateId
        );


    // ==================================================
    // QUEUE
    // ==================================================

    const queueRef =
        doc(
            db,
            "interviewQueue",
            candidateData.noRegistrasi
        );


    // ==================================================
    // TRANSACTION
    // ==================================================

    const result =
        await runTransaction(
            db,
            async (
                transaction
            ) => {

                // ======================================
                // READ
                // ======================================

                const registrasiSnapshot =
                    await transaction.get(
                        registrasiRef
                    );


                const counterSnapshot =
                    await transaction.get(
                        counterRef
                    );


                const queueDaySnapshot =
                    await transaction.get(
                        queueDayRef
                    );


                // ======================================
                // DUPLICATE
                // ======================================

                if (
                    registrasiSnapshot.exists()
                ) {

                    const oldData =
                        registrasiSnapshot.data();


                    return {

                        sudahAda:
                            true,

                        nomorAntrian:
                            oldData.nomorAntrian,

                        nama:
                            oldData.nama,

                        noRegistrasi:
                            oldData.noRegistrasi,

                        posisi:
                            oldData.posisi
                    };
                }


                // ======================================
                // NOMOR BERIKUTNYA
                // ======================================

                let nextNumber;


                if (
                    !counterSnapshot.exists()
                ) {

                    nextNumber =
                        1;

                } else {

                    nextNumber =
                        (
                            counterSnapshot
                                .data()
                                .number ||
                            0
                        ) +
                        1;
                }


                // ======================================
                // PREFIX BERDASARKAN URUTAN HARI INTERVIEW
                // ======================================

                let queueDayData =
                    queueDaySnapshot.exists()
                        ? queueDaySnapshot.data()
                        : {};

                let dateToPrefix =
                    queueDayData.dateToPrefix || {};

                let prefix =
                    getPrefixFromMapping(
                        dateToPrefix,
                        activeDate
                    );


                // Migrasi dari versi lama: tanggal pertama
                // dianggap sebagai sesi A. Jika hari aktif
                // berbeda, sesi berikutnya menjadi B.
                if (!prefix) {

                    if (
                        Object.keys(dateToPrefix).length === 0
                    ) {

                        const legacyStartDate =
                            getLegacyStartDate();

                        dateToPrefix = {
                            [legacyStartDate]: "A"
                        };
                    }


                    prefix =
                        getPrefixFromMapping(
                            dateToPrefix,
                            activeDate
                        );


                    if (!prefix) {

                        const usedPrefixes =
                            Object.values(
                                dateToPrefix
                            );

                        prefix =
                            numberToLetter(
                                usedPrefixes.length +
                                1
                            );

                        dateToPrefix = {
                            ...dateToPrefix,
                            [activeDate]: prefix
                        };
                    }


                    transaction.set(
                        queueDayRef,
                        {
                            dateToPrefix,
                            updatedAt: new Date().toISOString()
                        },
                        { merge: true }
                    );
                }


                // ======================================
                // NOMOR KANDIDAT
                // ======================================

                const nomorAntrian =
                    formatQueueNumber(
                        prefix,
                        nextNumber
                    );


                // ======================================
                // DATA CANDIDATE
                // ======================================

                const finalCandidateData = {

                    noRegistrasi:
                        candidateData.noRegistrasi,

                    nama:
                        candidateData.nama,

                    posisi:
                        candidateData.posisi,

                    nomorAntrian:
                        nomorAntrian,

                    tanggal:
                        activeDate,

                    status:
                        "Menunggu",

                    interviewer:
                        null,

                    interview1:
                        null,

                    interview2:
                        null,

                    rekomendasiJabatan:
                        null,

                    rekomendasiArea:
                        null,

                    waktuCheckIn:
                        new Date()
                            .toISOString()
                };


                // ======================================
                // DATA QUEUE
                // ======================================

                const queueData = {

                    noRegistrasi:
                        candidateData.noRegistrasi,

                    nama:
                        candidateData.nama,

                    nomorAntrian:
                        nomorAntrian,

                    posisi:
                        candidateData.posisi,

                    tanggal:
                        activeDate,

                    status:
                        "Menunggu",

                    interviewer:
                        null,

                    interview1:
                        null,

                    interview2:
                        null,

                    rekomendasiJabatan:
                        null,

                    rekomendasiArea:
                        null,

                    waktuCheckIn:
                        new Date()
                            .toISOString()
                };


                // ======================================
                // WRITE COUNTER
                // ======================================

                if (
                    !counterSnapshot.exists()
                ) {

                    transaction.set(
                        counterRef,
                        {

                            number:
                                1,

                            tanggal:
                                activeDate
                        }
                    );

                } else {

                    transaction.update(
                        counterRef,
                        {

                            number:
                                nextNumber
                        }
                    );
                }


                // ======================================
                // WRITE CANDIDATE
                // ======================================

                transaction.set(
                    candidateRef,
                    finalCandidateData
                );


                // ======================================
                // WRITE UNIQUE REGISTRATION
                // ======================================

                transaction.set(
                    registrasiRef,
                    {

                        tipe:
                            "REGISTRASI",

                        noRegistrasi:
                            candidateData.noRegistrasi,

                        nama:
                            candidateData.nama,

                        nomorAntrian:
                            nomorAntrian,

                        tanggal:
                            activeDate
                    }
                );


                // ======================================
                // WRITE QUEUE
                // ======================================

                transaction.set(
                    queueRef,
                    queueData
                );


                // ======================================
                // RETURN
                // ======================================

                return {

                    sudahAda:
                        false,

                    ...finalCandidateData
                };
            }
        );


    return result;
}


// ======================================================
// CHECK-IN
// ======================================================

async function checkIn() {

    const button =
        document.querySelector(
            ".checkin-button"
        );


    if (
        button &&
        button.disabled
    ) {

        return;
    }


    if (button) {

        button.disabled =
            true;

        button.innerText =
            "MEMPROSES...";
    }


    try {

        // ==============================================
        // AMBIL INPUT
        // ==============================================

        const noRegistrasi =
            document
                .getElementById(
                    "noRegistrasi"
                )
                .value
                .trim();


        let nama =
            document
                .getElementById(
                    "nama"
                )
                .value
                .trim();


        const posisi =
            document
                .getElementById(
                    "posisi"
                )
                .value;


        // ==============================================
        // VALIDASI NO REGISTRASI
        // ==============================================

        if (
            !/^\d+$/.test(
                noRegistrasi
            )
        ) {

            alert(
                "No Registrasi hanya boleh berupa angka."
            );

            return;
        }


        // ==============================================
        // VALIDASI NAMA
        // ==============================================

        if (
            !nama
        ) {

            alert(
                "Nama wajib diisi."
            );

            return;
        }


        // Normalisasi DULU (apostrof miring -> lurus, spasi dirapikan,
        // huruf jadi kapital) BARU divalidasi, supaya nama hasil
        // copy-paste dari Word/Excel tidak ikut ditolak.

        nama =
            normalisasiNama(
                nama
            );


        if (
            !/^[A-Za-zÀ-ÿ.\-'\s]+$/.test(
                nama
            )
        ) {

            alert(
                "Nama hanya boleh berisi huruf, spasi, titik, tanda hubung (-), atau apostrof (')."
            );

            return;
        }


        // ==============================================
        // VALIDASI POSISI
        // ==============================================

        if (
            posisi !==
                "Frontliner" &&
            posisi !==
                "Sales"
        ) {

            alert(
                "Silakan pilih posisi."
            );

            return;
        }


        // ==============================================
        // CEK MASTER BSP
        // ==============================================

        const hasilBSP =
            await validasiBSP(
                noRegistrasi,
                nama
            );


        // ==============================================
        // REGISTRASI TIDAK ADA
        // ==============================================

        if (
            !hasilBSP.valid &&
            hasilBSP.error ===
                "REGISTRASI_TIDAK_DITEMUKAN"
        ) {

            alert(
                "No Registrasi tidak ditemukan.\n\n" +
                "Pastikan No Registrasi yang dimasukkan sudah benar."
            );

            return;
        }


        // ==============================================
        // NAMA TIDAK SESUAI
        // ==============================================

        if (
            !hasilBSP.valid &&
            hasilBSP.error ===
                "NAMA_TIDAK_SESUAI"
        ) {

            alert(
                "Nama tidak sesuai dengan No Registrasi.\n\n" +
                "Silakan periksa kembali nama yang Anda masukkan."
            );

            return;
        }


        // ==============================================
        // CHECK-IN
        // ==============================================

        const result =
            await prosesCheckIn({

                noRegistrasi:
                    noRegistrasi,

                nama:
                    hasilBSP.data.nama ||
                    nama,

                posisi:
                    posisi
            });


        // ==============================================
        // SUDAH TERDAFTAR
        // ==============================================

        if (
            result.sudahAda
        ) {

            tampilkanHalamanAntrian({

                nama:
                    result.nama,

                noRegistrasi:
                    result.noRegistrasi,

                posisi:
                    result.posisi,

                nomorAntrian:
                    result.nomorAntrian
            });


            alert(
                "No Registrasi sudah terdaftar.\n\n" +
                "Nomor kandidat Anda: " +
                result.nomorAntrian
            );


            return;
        }


        // ==============================================
        // BARU
        // ==============================================

        tampilkanHalamanAntrian(
            result
        );


    } catch (error) {

        console.error(
            "ERROR CHECK-IN:",
            error
        );


        // ==============================================
        // PERMISSION
        // ==============================================

        if (
            error.code ===
            "permission-denied"
        ) {

            alert(
                "Akses database ditolak.\n\n" +
                "Pastikan Firestore Rules sudah di-publish."
            );

        } else {

            alert(
                "Check-in gagal.\n\n" +
                error.message
            );
        }


    } finally {

        if (button) {

            button.disabled =
                false;

            button.innerText =
                "CHECK-IN";
        }
    }
}


// ======================================================
// HASIL ANTRIAN
// ======================================================

function tampilkanHalamanAntrian(
    data
) {

    const halamanCheckIn =
        document.getElementById(
            "halamanCheckIn"
        );


    const halamanAntrian =
        document.getElementById(
            "halamanAntrian"
        );


    if (
        halamanCheckIn
    ) {

        halamanCheckIn.style.display =
            "none";
    }


    if (
        halamanAntrian
    ) {

        halamanAntrian.style.display =
            "block";
    }


    const nomor =
        document.getElementById(
            "nomorAntrian"
        );


    const registrasi =
        document.getElementById(
            "hasilRegistrasi"
        );


    const nama =
        document.getElementById(
            "hasilNama"
        );


    const posisi =
        document.getElementById(
            "hasilPosisi"
        );


    if (
        nomor
    ) {

        nomor.innerText =
            data.nomorAntrian ||
            "";
    }


    if (
        registrasi
    ) {

        registrasi.innerText =
            data.noRegistrasi ||
            "";
    }


    if (
        nama
    ) {

        nama.innerText =
            data.nama ||
            "";
    }


    if (
        posisi
    ) {

        posisi.innerText =
            data.posisi ||
            "";
    }
}


// ======================================================
// ADMIN
// ======================================================

function bukaAdmin() {

    const modal =
        document.getElementById(
            "adminModal"
        );


    if (
        modal
    ) {

        modal.style.display =
            "flex";
    }


    const password =
        document.getElementById(
            "adminPassword"
        );


    if (
        password
    ) {

        password.value =
            "";
    }
}


// ======================================================
// TUTUP ADMIN
// ======================================================

function tutupAdmin() {

    const modal =
        document.getElementById(
            "adminModal"
        );


    if (
        modal
    ) {

        modal.style.display =
            "none";
    }
}


// ======================================================
// LOGIN ADMIN
// ======================================================

async function loginAdmin() {

    const password =
        document
            .getElementById(
                "adminPassword"
            )
            .value;


    if (
        password !==
        ADMIN_PASSWORD
    ) {

        alert(
            "Password admin salah."
        );

        return;
    }


    tutupAdmin();


    const modal =
        document.getElementById(
            "tanggalModal"
        );


    if (
        modal
    ) {

        modal.style.display =
            "flex";
    }


    const input =
        document.getElementById(
            "tanggalInput"
        );


    if (
        input
    ) {

        input.value =
            await getActiveDate();
    }
}


// ======================================================
// SIMPAN TANGGAL
// ======================================================

async function simpanTanggal() {

    const input =
        document.getElementById(
            "tanggalInput"
        );


    if (
        !input
    ) {

        return;
    }


    const tanggal =
        input.value;


    if (
        !tanggal
    ) {

        alert(
            "Silakan pilih tanggal."
        );

        return;
    }


    try {

        // SIMPAN KE FIRESTORE AGAR GLOBAL
        // dan otomatis tersinkron ke semua perangkat.
        await setDoc(
            activeDateRef,
            {
                activeDate:
                    tanggal,
                updatedAt:
                    new Date().toISOString(),
                updatedBy:
                    "ADMIN"
            },
            { merge: true }
        );


        // Update tampilan perangkat admin sekarang juga.
        setActiveDateCache(
            tanggal
        );


        tutupTanggal();


        alert(
            "Tanggal interview berhasil diubah secara global.\n\nSemua perangkat yang membuka sistem akan menggunakan tanggal ini."
        );

    } catch (error) {

        console.error(
            "GAGAL SIMPAN TANGGAL GLOBAL:",
            error
        );

        if (
            error.code ===
            "permission-denied"
        ) {

            alert(
                "Tanggal gagal disimpan.\n\nFirestore Rules belum mengizinkan akses ke systemConfig/interviewSettings."
            );

        } else {

            alert(
                "Tanggal gagal disimpan.\n\n" +
                error.message
            );
        }
    }
}


// ======================================================
// TUTUP TANGGAL
// ======================================================

function tutupTanggal() {

    const modal =
        document.getElementById(
            "tanggalModal"
        );


    if (
        modal
    ) {

        modal.style.display =
            "none";
    }
}


// ======================================================
// LOAD
// ======================================================

document.addEventListener(
    "DOMContentLoaded",
    function() {

        tampilkanTanggal();

    }
);


// ======================================================
// EXPOSE
// ======================================================

window.checkIn =
    checkIn;


window.bukaAdmin =
    bukaAdmin;


window.tutupAdmin =
    tutupAdmin;


window.loginAdmin =
    loginAdmin;


window.simpanTanggal =
    simpanTanggal;


window.tutupTanggal =
    tutupTanggal;
