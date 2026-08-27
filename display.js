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
    onSnapshot
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


const activeDate =
    localStorage.getItem(
        "activeInterviewDate"
    ) ||
    getTodayKey();


// ======================================================
// TAMPILKAN TANGGAL
// ======================================================

const tanggal =
    new Date(
        activeDate +
        "T00:00:00"
    );


document.getElementById(
    "tanggal"
).innerText =
    tanggal.toLocaleDateString(
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


// ======================================================
// ELEMENT
// ======================================================

const callingScreen =
    document.getElementById(
        "callingScreen"
    );


const waitingScreen =
    document.getElementById(
        "waitingScreen"
    );


const nomorAntrian =
    document.getElementById(
        "nomorAntrian"
    );


const nomorMeja =
    document.getElementById(
        "nomorMeja"
    );


const soundButton =
    document.getElementById(
        "soundButton"
    );


// ======================================================
// SOUND STATE
// ======================================================

let soundEnabled =
    localStorage.getItem(
        "displaySoundEnabled"
    ) === "true";


// ======================================================
// EVENT PANGGILAN TERAKHIR
// ======================================================
//
// JANGAN hanya menggunakan candidate.id.
//
// Contoh:
//
// A-004|2026-08-26T10:10:00
//
// berbeda dengan:
//
// A-004|2026-08-26T10:15:00
//
// Jadi kandidat yang sama tetap bisa dipanggil
// berkali-kali.
//

let lastCallEvent =
    localStorage.getItem(
        "lastCallEvent"
    ) || "";


updateSoundButton();


// ======================================================
// AKTIFKAN SUARA
// ======================================================

window.aktifkanSuara =
    aktifkanSuara;


function aktifkanSuara() {

    if (
        !(
            "speechSynthesis"
            in window
        )
    ) {

        alert(
            "Browser ini tidak mendukung fitur suara."
        );

        return;
    }


    soundEnabled =
        true;


    localStorage.setItem(
        "displaySoundEnabled",
        "true"
    );


    updateSoundButton();


    speak(
        "Sistem panggilan interview telah aktif."
    );

}


// ======================================================
// UPDATE BUTTON SUARA
// ======================================================

function updateSoundButton() {

    if (
        soundEnabled
    ) {

        soundButton.innerHTML =
            "🔊 SUARA AKTIF";


        soundButton.classList.add(
            "active"
        );


        soundButton.classList.remove(
            "disabled"
        );

    }

    else {

        soundButton.innerHTML =
            "🔇 AKTIFKAN SUARA";


        soundButton.classList.remove(
            "active"
        );


        soundButton.classList.add(
            "disabled"
        );

    }

}


// ======================================================
// LOAD QUEUE
// ======================================================

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


// ======================================================
// REALTIME LISTENER
// ======================================================

onSnapshot(

    queueQuery,

    function(snapshot) {

        const activeCandidates =
            [];


        snapshot.forEach(
            function(docSnapshot) {

                const data =
                    docSnapshot.data();


                // ==========================================
                // HANYA YANG SEDANG INTERVIEW
                // ==========================================

                if (
                    data.status ===
                    "Sedang Interview"
                ) {

                    activeCandidates.push({

                        id:
                            docSnapshot.id,

                        ...data

                    });

                }

            }
        );


        // ==================================================
        // TIDAK ADA PANGGILAN
        // ==================================================

        if (
            activeCandidates.length ===
            0
        ) {

            tampilkanWaiting();

            return;

        }


        // ==================================================
        // URUTKAN BERDASARKAN EVENT PANGGILAN TERAKHIR
        // ==================================================
        //
        // PRIORITAS:
        //
        // T1:
        // waktuPanggilUlang
        //
        // T2:
        // waktuPanggilUlangTahap2
        //
        // Kalau belum pernah panggil ulang:
        //
        // waktuMulai / waktuMulaiTahap2
        //
        // ==================================================

        activeCandidates.sort(

            function(a, b) {

                const timeA =
                    getLastCallTime(
                        a
                    );


                const timeB =
                    getLastCallTime(
                        b
                    );


                return (
                    timeB -
                    timeA
                );

            }

        );


        const current =
            activeCandidates[0];


        tampilkanPanggilan(
            current
        );

    },


    function(error) {

        console.error(
            "Display error:",
            error
        );

    }

);


// ======================================================
// GET LAST CALL TIME
// ======================================================

function getLastCallTime(
    candidate
) {

    const tahap =
        Number(
            candidate.tahapInterview ||
            1
        );


    // ==================================================
    // INTERVIEW 2
    // ==================================================

    if (
        tahap === 2
    ) {

        // ----------------------------------------------
        // PRIORITAS PANGGIL ULANG TAHAP 2
        // ----------------------------------------------

        if (
            candidate.waktuPanggilUlangTahap2
        ) {

            const time =
                new Date(
                    candidate
                        .waktuPanggilUlangTahap2
                ).getTime();


            if (
                !isNaN(time)
            ) {

                return time;

            }

        }


        // ----------------------------------------------
        // FALLBACK WAKTU MULAI TAHAP 2
        // ----------------------------------------------

        if (
            candidate.waktuMulaiTahap2
        ) {

            const time =
                new Date(
                    candidate
                        .waktuMulaiTahap2
                ).getTime();


            if (
                !isNaN(time)
            ) {

                return time;

            }

        }

    }


    // ==================================================
    // INTERVIEW 1
    // ==================================================

    if (
        candidate.waktuPanggilUlang
    ) {

        const time =
            new Date(
                candidate
                    .waktuPanggilUlang
            ).getTime();


        if (
            !isNaN(time)
        ) {

            return time;

        }

    }


    // ==================================================
    // FALLBACK WAKTU MULAI INTERVIEW 1
    // ==================================================

    if (
        candidate.waktuMulai
    ) {

        const time =
            new Date(
                candidate.waktuMulai
            ).getTime();


        if (
            !isNaN(time)
        ) {

            return time;

        }

    }


    return 0;

}


// ======================================================
// GET INTERVIEWER AKTIF
// ======================================================

function getNomorMejaAktif(candidate) {
    const tahap = Number(candidate.tahapInterview || 1);

    // Gunakan field meja berdasarkan tahap terlebih dahulu.
    // Beberapa data lama mungkin masih memakai nama field generik.
    const kandidatMeja = tahap === 2
        ? [
            candidate.nomorMejaTahap2,
            candidate.nomorMeja,
            candidate.nomorMejaTahap1,
            candidate.nomorMeja2,
            candidate.mejaTahap2,
            candidate.mejaInterview2,
            candidate.meja,
            candidate.desk
        ]
        : [
            candidate.nomorMejaTahap1,
            candidate.nomorMeja,
            candidate.nomorMeja1,
            candidate.mejaTahap1,
            candidate.mejaInterview1,
            candidate.meja,
            candidate.desk
        ];

    const meja = kandidatMeja.find(
        value => value !== undefined && value !== null && String(value).trim() !== ""
    );

    return String(meja || "").trim();
}


// ======================================================
// GET CALL EVENT ID
// ======================================================
//
// Ini yang membuat:
//
// A-004 dipanggil
// A-004 dipanggil ulang
// A-004 dipanggil ulang lagi
//
// semuanya dianggap event berbeda.
//

function getCallEvent(
    candidate
) {

    const tahap =
        Number(
            candidate.tahapInterview ||
            1
        );


    let waktuEvent =
        "";


    // ==================================================
    // TAHAP 2
    // ==================================================

    if (
        tahap === 2
    ) {

        waktuEvent =
            candidate.waktuPanggilUlangTahap2 ||
            candidate.waktuMulaiTahap2 ||
            candidate.waktuMulai ||
            "";

    }


    // ==================================================
    // TAHAP 1
    // ==================================================

    else {

        waktuEvent =
            candidate.waktuPanggilUlang ||
            candidate.waktuMulai ||
            "";

    }


    return (
        candidate.id +
        "|" +
        tahap +
        "|" +
        String(
            waktuEvent
        )
    );

}


// ======================================================
// TAMPILKAN PANGGILAN
// ======================================================

function tampilkanPanggilan(
    candidate
) {

    const nomor =
        candidate.nomorAntrian ||
        "-";


    // ==================================================
    // NOMOR MEJA AKTIF
    // ==================================================

    const meja =
        getNomorMejaAktif(candidate) || "-";


    // ==================================================
    // UPDATE NOMOR
    // ==================================================

    nomorAntrian.innerText =
        nomor;


    // ==================================================
    // UPDATE INTERVIEWER
    // ==================================================

    nomorMeja.innerText =
        meja === "-" ? "MEJA BELUM DITENTUKAN" : "MEJA " + meja;


    // ==================================================
    // TAMPILKAN CALLING SCREEN
    // ==================================================

    waitingScreen.style.display =
        "none";


    callingScreen.style.display =
        "block";


    // ==================================================
    // TENTUKAN TAHAP INTERVIEW
    // ==================================================

    const tahapAktif =
        Number(
            candidate.tahapInterview ||
            1
        );


    // ==================================================
    // STYLE INTERVIEWER 2
    // ==================================================
    //
    // Interview 2:
    // - Nomor kandidat ORANGE
    // - Nama interviewer ORANGE
    //
    // Interview 1:
    // - Kembali ke warna normal
    //
    // ==================================================

    if (
        tahapAktif === 2
    ) {

        nomorAntrian.style.color =
            "#f28c28";

        nomorMeja.style.color =
            "#f28c28";

    }

    else {

        nomorAntrian.style.color =
            "";

        nomorMeja.style.color =
            "";

    }


    // ==================================================
    // EVENT PANGGILAN
    // ==================================================

    const callEvent =
        getCallEvent(
            candidate
        );


    // ==================================================
    // CEGAH EVENT YANG SAMA BERBUNYI ULANG
    // ==================================================

    if (
        callEvent !==
        lastCallEvent
    ) {

        lastCallEvent =
            callEvent;


        localStorage.setItem(
            "lastCallEvent",
            callEvent
        );


        // ==================================================
        // SUARA
        // ==================================================

        if (
            soundEnabled
        ) {

            setTimeout(

                function() {

                    speakCall(
                        nomor,
                        meja,
                        tahapAktif === 2
                    );

                },

                300

            );

        }

    }

}


// ======================================================
// TAMPILKAN WAITING
// ======================================================

function tampilkanWaiting() {

    callingScreen.style.display =
        "none";


    waitingScreen.style.display =
        "block";

}


// ======================================================
// FORMAT NAMA INTERVIEWER
// ======================================================
//
// Tidak ada deteksi gender.
//
// Ahmad
//
// menjadi:
//
// Bpk/Ibu. Ahmad
//
// ======================================================

function formatNamaInterviewer(nama) {
    return nama ? String(nama).trim() : "-";
}


// ======================================================
// SUARA PANGGILAN
// ======================================================

function speakCall(
    nomor,
    nomorMejaAktif,
    isInterview2 = false
) {

    // ==================================================
    // A-027
    // menjadi
    // A 027
    // ==================================================

    const nomorSpeech =
        nomor.replace(
            /-/g,
            " "
        );


    // ==================================================
    // HAPUS PREFIX Bpk/Ibu.
    // ==================================================

    const meja = String(nomorMejaAktif || "-").trim();

    // Bahasa panggilan dibuat lebih natural untuk peserta.
    const text =
        "Nomor kandidat " +
        nomorSpeech +
        ", silakan ke meja nomor " +
        meja +
        ".";


    speak(
        text,
        isInterview2
    );

}


// ======================================================
// TEXT TO SPEECH
// ======================================================

function speak(
    text,
    isInterview2 = false
) {

    if (
        !(
            "speechSynthesis"
            in window
        )
    ) {

        return;

    }


    // ==================================================
    // HENTIKAN SUARA SEBELUMNYA
    // ==================================================

    window.speechSynthesis.cancel();


    // ==================================================
    // CREATE UTTERANCE
    // ==================================================

    const utterance =
        new SpeechSynthesisUtterance(
            text
        );


    // ==================================================
    // BAHASA
    // ==================================================

    utterance.lang =
        "id-ID";


    // ==================================================
    // RATE
    // ==================================================

    // Sedikit diperlambat agar jelas, tetapi tetap singkat.
    utterance.rate = 0.92;


    // Suara dibuat lebih rendah/bass.
    // Browser tetap menentukan karakter suara berdasarkan voice yang tersedia.
    utterance.pitch = 0.72;


    // ==================================================
    // VOLUME
    // ==================================================

    utterance.volume =
        1;


    // ==================================================
    // PILIH VOICE INDONESIA YANG TERDENGAR LEBIH MASKULIN
    // ==================================================

    const voices = window.speechSynthesis.getVoices();
    const indonesianVoices = voices.filter(voice =>
        voice.lang && voice.lang.toLowerCase().startsWith("id")
    );

    if (indonesianVoices.length > 0) {
        const maleKeywords = [
            "male", "man", "pria", "laki", "bapak",
            "andika", "dimas", "rio", "arya", "budi"
        ];

        const maleVoice = indonesianVoices.find(voice => {
            const name = String(voice.name || "").toLowerCase();
            return maleKeywords.some(keyword => name.includes(keyword));
        });

        // Jika voice Indonesia tidak memberi informasi gender, pakai voice
        // Indonesia pertama dan gunakan pitch rendah sebagai fallback.
        utterance.voice = maleVoice || indonesianVoices[0];
    }

    // ==================================================
    // JALANKAN
    // ==================================================

    window.speechSynthesis.speak(
        utterance
    );

}