// ======================================================
// DISPLAY.JS - ROBUST REALTIME CALLING
// Firebase Timestamp compatible + realtime call detection\n\n// FIREBASE
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
    doc
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
    String(localStorage.getItem("lastCallEvent") || "");

// Queue suara agar panggilan tidak saling memotong ketika event masuk berdekatan.
let speechQueue = [];
let speaking = false;


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
// LOAD QUEUE REALTIME - EVENT BASED
// ======================================================
//
// Prinsip utama:
// 1. Snapshot awal hanya menentukan kandidat yang sedang aktif.
// 2. Setelah listener siap, setiap ADDED/MODIFIED yang merupakan
//    panggilan baru langsung ditampilkan.
// 3. Jadi kandidat baru tidak kalah hanya karena ada kandidat lain
//    yang masih berstatus "Sedang Interview".
// 4. Jika kandidat selesai, display memilih kandidat aktif terbaru.
// ======================================================

let unsubscribeQueue = null;

// Kandidat yang saat ini sedang tampil di layar.
let currentCandidateId = null;

// Mencegah snapshot awal dianggap sebagai panggilan baru.
let displayListenerReady = false;

// Simpan versi event terakhir per kandidat.
// Ini penting agar perubahan metadata kecil tidak memicu suara berulang.
const lastKnownCallEvent = new Map();

function normalizeStatus(value) {
    return String(value || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");
}

function isCallingStatus(value) {
    const status = normalizeStatus(value);

    return (
        status === "sedang interview" ||
        status === "sedang interview 1" ||
        status === "sedang i1" ||
        status === "sedang interview 2" ||
        status === "sedang i2" ||
        status === "dipanggil" ||
        status === "calling"
    );
}

function isCallingCandidate(candidate) {
    return isCallingStatus(candidate.status);
}

function candidateCallTime(candidate) {
    const event = getCallEvent(candidate);
    const parts = String(event).split("|");
    const millis = Number(parts[2] || 0);

    return Number.isFinite(millis) ? millis : 0;
}

function sortNewestCandidates(candidates) {
    return candidates.sort(
        (a, b) =>
            candidateCallTime(b) -
            candidateCallTime(a)
    );
}

function showNewestActiveCandidate(activeCandidates) {

    if (!activeCandidates.length) {
        currentCandidateId = null;
        tampilkanWaiting();
        return;
    }

    sortNewestCandidates(activeCandidates);

    const candidate =
        activeCandidates[0];

    currentCandidateId =
        candidate.id;

    tampilkanPanggilan(
        candidate,
        false
    );
}

function listenDisplayQueue(tanggal) {

    activeDate =
        String(
            tanggal ||
            getTodayKey()
        ).slice(0, 10);

    localStorage.setItem(
        "activeInterviewDate",
        activeDate
    );

    if (
        typeof unsubscribeQueue ===
        "function"
    ) {
        unsubscribeQueue();
    }

    // Reset state setiap tanggal berubah.
    currentCandidateId = null;
    displayListenerReady = false;
    lastKnownCallEvent.clear();

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

    unsubscribeQueue =
        onSnapshot(
            queueQuery,

            function(snapshot) {

                const allCandidates = [];

                snapshot.forEach(
                    function(docSnapshot) {

                        const data =
                            docSnapshot.data() ||
                            {};

                        allCandidates.push({
                            id:
                                docSnapshot.id,
                            ...data
                        });
                    }
                );

                // ==============================================
                // SNAPSHOT PERTAMA
                // ==============================================
                //
                // Jangan membunyikan kandidat lama saat display
                // baru dibuka. Hanya tampilkan kandidat aktif terbaru.
                //
                if (!displayListenerReady) {

                    const activeCandidates =
                        allCandidates.filter(
                            isCallingCandidate
                        );

                    activeCandidates.forEach(
                        function(candidate) {
                            lastKnownCallEvent.set(
                                candidate.id,
                                getCallEvent(candidate)
                            );
                        }
                    );

                    displayListenerReady = true;

                    showNewestActiveCandidate(
                        activeCandidates
                    );

                    return;
                }

                // ==============================================
                // EVENT REALTIME
                // ==============================================
                //
                // Cari dokumen yang benar-benar berubah.
                // ADDED/MODIFIED yang menjadi panggilan aktif
                // langsung mengambil alih layar.
                //
                let newestCallCandidate = null;
                let newestCallTime = -1;

                snapshot.docChanges().forEach(
                    function(change) {

                        const data =
                            change.doc.data() ||
                            {};

                        const candidate = {
                            id:
                                change.doc.id,
                            ...data
                        };

                        if (
                            !isCallingCandidate(
                                candidate
                            )
                        ) {

                            // Kalau kandidat yang sedang tampil
                            // sudah selesai, nanti dipilih kandidat aktif lain.
                            return;
                        }

                        const event =
                            getCallEvent(
                                candidate
                            );

                        const previousEvent =
                            lastKnownCallEvent.get(
                                candidate.id
                            );

                        lastKnownCallEvent.set(
                            candidate.id,
                            event
                        );

                        // Hanya event yang berubah dianggap
                        // sebagai panggilan baru.
                        if (
                            change.type === "added" ||
                            change.type === "modified"
                        ) {

                            if (
                                previousEvent ===
                                event
                            ) {
                                return;
                            }

                            const eventTime =
                                candidateCallTime(
                                    candidate
                                );

                            if (
                                eventTime >=
                                newestCallTime
                            ) {

                                newestCallTime =
                                    eventTime;

                                newestCallCandidate =
                                    candidate;
                            }
                        }
                    }
                );

                // ==============================================
                // ADA PANGGILAN BARU
                // ==============================================

                if (
                    newestCallCandidate
                ) {

                    currentCandidateId =
                        newestCallCandidate.id;

                    tampilkanPanggilan(
                        newestCallCandidate,
                        true
                    );

                    return;
                }

                // ==============================================
                // KANDIDAT YANG TAMPIL SELESAI
                // ==============================================

                const activeCandidates =
                    allCandidates.filter(
                        isCallingCandidate
                    );

                if (
                    currentCandidateId &&
                    !activeCandidates.some(
                        candidate =>
                            candidate.id ===
                            currentCandidateId
                    )
                ) {

                    showNewestActiveCandidate(
                        activeCandidates
                    );
                }
            },

            function(error) {

                console.error(
                    "Display realtime error:",
                    error
                );

                displayListenerReady = false;
                currentCandidateId = null;

                tampilkanWaiting();
            }
        );
}

listenDisplayQueue(
    activeDate
);

// Ikuti tanggal global dari systemConfig.
const globalDateRef =
    doc(
        db,
        "systemConfig",
        "interviewSettings"
    );

onSnapshot(
    globalDateRef,

    function(snapshot) {

        const data =
            snapshot.exists()
                ? (
                    snapshot.data() ||
                    {}
                )
                : {};

        const tanggalGlobal =
            data.activeDate ||
            data.tanggalInterview ||
            data.tanggal ||
            data.date ||
            "";

        if (
            tanggalGlobal &&
            String(tanggalGlobal)
                .slice(0, 10) !==
            activeDate
        ) {

            listenDisplayQueue(
                tanggalGlobal
            );
        }
    },

    function(error) {

        console.warn(
            "DISPLAY global date listener:",
            error.message
        );
    }
);

// ======================================================
// GET LAST CALL TIME
// ======================================================

function timestampToMillis(value) {

    if (value === undefined || value === null || value === "") {
        return 0;
    }

    // Firestore Timestamp
    if (typeof value === "object" && typeof value.toMillis === "function") {
        const millis = value.toMillis();
        return Number.isFinite(millis) ? millis : 0;
    }

    // Firestore Timestamp-like object
    if (typeof value === "object" && Number.isFinite(value.seconds)) {
        return Number(value.seconds) * 1000 +
            Math.floor(Number(value.nanoseconds || 0) / 1000000);
    }

    if (value instanceof Date) {
        const millis = value.getTime();
        return Number.isFinite(millis) ? millis : 0;
    }

    if (typeof value === "number") {
        return Number.isFinite(value) ? value : 0;
    }

    const millis = new Date(String(value)).getTime();
    return Number.isFinite(millis) ? millis : 0;
}


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
                timestampToMillis(
                    candidate.waktuPanggilUlangTahap2
                );


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
                timestampToMillis(
                    candidate.waktuMulaiTahap2
                );


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
            timestampToMillis(
                candidate.waktuPanggilUlang
            );


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
            timestampToMillis(
                candidate.waktuMulai
            );


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

    // Timestamp yang paling spesifik untuk event panggilan.
    // Fallback ke waktu mulai dan terakhir diperbarui agar perubahan
    // Firestore tetap dapat dikenali meskipun field panggilan tertentu kosong.
    let waktuEvent = "";

    if (tahap === 2) {

        waktuEvent =
            candidate.waktuPanggilUlangTahap2 ||
            candidate.waktuMulaiTahap2 ||
            candidate.waktuPanggilUlang ||
            candidate.waktuMulai ||
            candidate.updatedAt ||
            candidate.updated_at ||
            "";

    } else {

        waktuEvent =
            candidate.waktuPanggilUlang ||
            candidate.waktuMulai ||
            candidate.updatedAt ||
            candidate.updated_at ||
            "";

    }

    return (
        String(candidate.id || "") +
        "|" +
        tahap +
        "|" +
        timestampToMillis(waktuEvent) +
        "|" +
        String(waktuEvent && typeof waktuEvent === "object"
            ? JSON.stringify(waktuEvent)
            : waktuEvent)
    );

}


// ======================================================
// TAMPILKAN PANGGILAN
// ======================================================

function tampilkanPanggilan(
    candidate,
    announce = true
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

    // Hanya snapshot realtime setelah listener siap
    // yang boleh memicu suara.
    if (
        announce &&
        callEvent !== lastCallEvent
    ) {

        lastCallEvent =
            callEvent;

        localStorage.setItem(
            "lastCallEvent",
            callEvent
        );

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
                150
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
        String(nomor || "-").replace(
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
        ) || !soundEnabled
    ) {

        return;

    }

    speechQueue.push({ text, isInterview2 });
    processSpeechQueue();

}


function processSpeechQueue() {

    if (speaking || speechQueue.length === 0) return;

    if (
        !(
            "speechSynthesis"
            in window
        ) || !soundEnabled
    ) {

        speechQueue = [];
        return;

    }

    speaking = true;

    const item = speechQueue.shift();

    const voices =
        window.speechSynthesis.getVoices();

    const indonesianVoices = voices.filter(
        voice =>
            voice.lang &&
            voice.lang.toLowerCase().startsWith("id")
    );

    const utterance =
        new SpeechSynthesisUtterance(
            item.text
        );

    utterance.lang = "id-ID";
    utterance.rate = 0.92;
    utterance.pitch = 0.72;
    utterance.volume = 1;

    if (indonesianVoices.length > 0) {

        const maleKeywords = [
            "male", "man", "pria", "laki", "bapak",
            "andika", "dimas", "rio", "arya", "budi"
        ];

        const maleVoice =
            indonesianVoices.find(voice => {
                const name =
                    String(voice.name || "").toLowerCase();

                return maleKeywords.some(
                    keyword => name.includes(keyword)
                );
            });

        utterance.voice =
            maleVoice || indonesianVoices[0];
    }

    const finish = () => {
        speaking = false;
        setTimeout(processSpeechQueue, 100);
    };

    utterance.onstart = () =>
        console.log("TTS mulai:", item.text);

    utterance.onend = finish;

    utterance.onerror = event => {
        console.warn(
            "TTS gagal:",
            event?.error || event
        );
        finish();
    };

    try {
        window.speechSynthesis.speak(
            utterance
        );
    } catch (error) {
        console.warn(
            "Speech synthesis exception:",
            error
        );
        finish();
    }
}


if ("speechSynthesis" in window) {
    window.speechSynthesis.onvoiceschanged = () =>
        window.speechSynthesis.getVoices();

    // Safety net untuk browser yang kadang membuat TTS stuck.
    setInterval(() => {
        if (
            soundEnabled &&
            !window.speechSynthesis.speaking &&
            speaking
        ) {
            speaking = false;
            processSpeechQueue();
        }
    }, 1500);
}
