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


// ======================================================
// TANGGAL AKTIF
// ======================================================

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

const namaInterviewer =
    document.getElementById(
        "namaInterviewer"
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
// VOICE STATE
// ======================================================

// Daftar voice browser / TV
let availableVoices = [];


// Voice Indonesia yang akan dipakai
let indonesianVoice = null;


// Menandai apakah sistem suara sudah dipersiapkan
let speechReady = false;


// ======================================================
// EVENT PANGGILAN TERAKHIR
// ======================================================
//
// Format:
//
// candidateId + "|" + waktuEvent
//
// Untuk panggilan pertama:
// waktuEvent = waktuMulai
//
// Untuk PANGGIL ULANG:
// waktuEvent = waktuPanggilUlang
//
// ======================================================

let lastCallEvent =
    localStorage.getItem(
        "lastCallEvent"
    ) || "";


// ======================================================
// BERSIHKAN KEY LAMA
// ======================================================

localStorage.removeItem(
    "lastCalledCandidateId"
);


// ======================================================
// UPDATE BUTTON
// ======================================================

updateSoundButton();


// ======================================================
// LOAD VOICE
// ======================================================

function loadVoices() {

    if (
        !(
            "speechSynthesis"
            in window
        )
    ) {

        return;

    }


    availableVoices =
        window.speechSynthesis
            .getVoices();


    if (
        !availableVoices ||
        availableVoices.length === 0
    ) {

        speechReady = false;

        return;

    }


    // ==================================================
    // CARI VOICE INDONESIA
    // ==================================================

    indonesianVoice =
        availableVoices.find(
            function(voice) {

                return (
                    voice.lang &&
                    voice.lang
                        .toLowerCase()
                        .startsWith(
                            "id"
                        )
                );

            }
        ) || null;


    // ==================================================
    // JIKA TIDAK ADA VOICE INDONESIA
    // CARI VOICE YANG MENDUKUNG id-ID
    // ==================================================

    if (
        !indonesianVoice
    ) {

        indonesianVoice =
            availableVoices.find(
                function(voice) {

                    return (
                        voice.lang &&
                        voice.lang
                            .toLowerCase()
                            .includes(
                                "id-id"
                            )
                    );

                }
            ) || null;

    }


    // ==================================================
    // VOICE SUDAH SIAP
    // ==================================================

    speechReady = true;

}


// ======================================================
// VOICE BERUBAH / SELESAI LOADING
// ======================================================

if (
    "speechSynthesis"
    in window
) {

    window.speechSynthesis
        .addEventListener(
            "voiceschanged",
            function() {

                loadVoices();

            }
        );


    // Coba load langsung
    loadVoices();


    // Coba lagi setelah browser selesai loading
    setTimeout(
        function() {

            loadVoices();

        },
        500
    );


    setTimeout(
        function() {

            loadVoices();

        },
        1500
    );

}


// ======================================================
// AKTIFKAN SUARA
// ======================================================

window.aktifkanSuara =
    aktifkanSuara;


function aktifkanSuara() {

    // ==================================================
    // CEK SUPPORT
    // ==================================================

    if (
        !(
            "speechSynthesis"
            in window
        )
    ) {

        alert(
            "Browser TV ini tidak mendukung fitur suara otomatis."
        );

        return;

    }


    // ==================================================
    // LOAD VOICE
    // ==================================================

    loadVoices();


    // ==================================================
    // AKTIFKAN
    // ==================================================

    soundEnabled =
        true;


    localStorage.setItem(
        "displaySoundEnabled",
        "true"
    );


    updateSoundButton();


    // ==================================================
    // RESUME SPEECH ENGINE
    // ==================================================

    try {

        window.speechSynthesis
            .resume();

    } catch (error) {

        console.warn(
            "Speech resume error:",
            error
        );

    }


    // ==================================================
    // TEST / PRIME SUARA
    // ==================================================

    setTimeout(
        function() {

            speak(
                "Sistem panggilan interview telah aktif."
            );

        },
        100
    );

}


// ======================================================
// UPDATE BUTTON SUARA
// ======================================================

function updateSoundButton() {

    if (
        !soundButton
    ) {

        return;

    }


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

    } else {

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
                // HANYA KANDIDAT YANG SEDANG INTERVIEW
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
        // URUTKAN BERDASARKAN WAKTU MULAI
        // YANG PALING BARU DI ATAS
        // ==================================================

        activeCandidates.sort(
            function(a, b) {

                const timeA =
                    new Date(
                        a.waktuMulai ||
                        0
                    ).getTime();


                const timeB =
                    new Date(
                        b.waktuMulai ||
                        0
                    ).getTime();


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
// TAMPILKAN PANGGILAN
// ======================================================

function tampilkanPanggilan(
    candidate
) {

    const nomor =
        candidate.nomorAntrian ||
        "-";


    const interviewer =
        formatNamaInterviewer(
            candidate.interviewer
        );


    // ==================================================
    // UPDATE LAYAR
    // ==================================================

    nomorAntrian.innerText =
        nomor;


    namaInterviewer.innerText =
        interviewer;


    waitingScreen.style.display =
        "none";


    callingScreen.style.display =
        "block";


    // ==================================================
    // DETEKSI EVENT PANGGILAN
    // ==================================================
    //
    // Panggilan pertama:
    // waktuEvent = waktuMulai
    //
    // Panggil ulang:
    // waktuEvent = waktuPanggilUlang
    //
    // ==================================================

    const waktuEvent =
        candidate.waktuPanggilUlang ||
        candidate.waktuMulai ||
        "";


    const callEvent =
        candidate.id +
        "|" +
        String(
            waktuEvent
        );


    // ==================================================
    // CEK APAKAH INI PANGGILAN BARU
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
        // JALANKAN SUARA
        // ==================================================

        if (
            soundEnabled
        ) {

            setTimeout(
                function() {

                    speakCall(
                        nomor,
                        interviewer
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
// Apa pun nama yang diisi interviewer:
//
// Ahmad Fauzan
//
// akan tampil:
//
// Bpk/Ibu. Ahmad Fauzan
//
// ======================================================

function formatNamaInterviewer(
    nama
) {

    if (
        !nama
    ) {

        return "-";

    }


    const cleanName =
        nama.trim();


    return (
        "Bpk/Ibu. " +
        cleanName
    );

}


// ======================================================
// SUARA PANGGILAN
// ======================================================
//
// Tampilan:
//
// Bpk/Ibu. Ahmad Fauzan
//
// Suara:
//
// "Nomor antrean A 027,
//  silakan menuju interviewer,
//  Bapak atau Ibu Ahmad Fauzan."
//
// ======================================================

function speakCall(
    nomor,
    interviewer
) {

    // ==================================================
    // NOMOR ANTREAN
    // ==================================================
    //
    // A-027
    //
    // menjadi:
    //
    // A 027
    //
    // ==================================================

    const nomorSpeech =
        String(
            nomor
        ).replace(
            /-/g,
            " "
        );


    // ==================================================
    // HAPUS "Bpk/Ibu."
    // DARI NAMA UNTUK SUARA
    // ==================================================

    const namaAsli =
        interviewer.replace(
            /^Bpk\/Ibu\.\s*/i,
            ""
        );


    // ==================================================
    // KALIMAT SUARA
    // ==================================================

    const text =
        "Nomor antrean " +
        nomorSpeech +
        ", silakan menuju interviewer, " +
        "Bapak atau Ibu " +
        namaAsli +
        ".";


    // ==================================================
    // JALANKAN
    // ==================================================

    speak(
        text
    );

}


// ======================================================
// TEXT TO SPEECH
// ======================================================

function speak(
    text
) {

    // ==================================================
    // CEK SUPPORT
    // ==================================================

    if (
        !(
            "speechSynthesis"
            in window
        )
    ) {

        console.warn(
            "SpeechSynthesis tidak tersedia."
        );

        return;

    }


    // ==================================================
    // LOAD VOICE TERLEBIH DAHULU
    // ==================================================

    loadVoices();


    // ==================================================
    // HENTIKAN SUARA SEBELUMNYA
    // ==================================================

    try {

        window.speechSynthesis
            .cancel();

    } catch (error) {

        console.warn(
            "Speech cancel error:",
            error
        );

    }


    // ==================================================
    // RESUME ENGINE
    // ==================================================

    try {

        window.speechSynthesis
            .resume();

    } catch (error) {

        console.warn(
            "Speech resume error:",
            error
        );

    }


    // ==================================================
    // BUAT UTTERANCE
    // ==================================================

    const utterance =
        new SpeechSynthesisUtterance(
            text
        );


    // ==================================================
    // BAHASA INDONESIA
    // ==================================================

    utterance.lang =
        "id-ID";


    // ==================================================
    // PILIH VOICE INDONESIA
    // ==================================================

    if (
        indonesianVoice
    ) {

        utterance.voice =
            indonesianVoice;

    }


    // ==================================================
    // KECEPATAN
    // ==================================================

    utterance.rate =
        0.85;


    // ==================================================
    // PITCH
    // ==================================================

    utterance.pitch =
        1;


    // ==================================================
    // VOLUME
    // ==================================================

    utterance.volume =
        1;


    // ==================================================
    // EVENT DEBUG
    // ==================================================

    utterance.onstart =
        function() {

            console.log(
                "🔊 Suara mulai:",
                text
            );

        };


    utterance.onend =
        function() {

            console.log(
                "🔊 Suara selesai."
            );

        };


    utterance.onerror =
        function(event) {

            console.error(
                "🔊 Speech error:",
                event
            );

        };


    // ==================================================
    // JALANKAN SUARA
    // ==================================================

    try {

        window.speechSynthesis
            .speak(
                utterance
            );

    } catch (error) {

        console.error(
            "Gagal menjalankan suara:",
            error
        );

    }

}


// ======================================================
// AUTO RESTORE SOUND
// ======================================================
//
// Kalau TV sebelumnya sudah pernah menekan
// "AKTIFKAN SUARA", status tetap tersimpan.
//
// Namun browser TV tetap akan mencoba menyiapkan
// speech engine saat halaman dibuka.
//
// ======================================================

if (
    soundEnabled &&
    (
        "speechSynthesis"
        in window
    )
) {

    // Load voice
    loadVoices();


    // Resume engine
    try {

        window.speechSynthesis
            .resume();

    } catch (error) {

        console.warn(
            "Auto resume error:",
            error
        );

    }

}
