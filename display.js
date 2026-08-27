// ======================================================
// DISPLAY QUEUE - SAMSUNG TV AUDIO VERSION
// ======================================================

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
    getFirestore(
        app
    );


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


const tanggalElement =
    document.getElementById(
        "tanggal"
    );


if (
    tanggalElement
) {

    tanggalElement.innerText =
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
}


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
// AUDIO ENGINE
// ======================================================
//
// TIDAK menggunakan speechSynthesis.
//
// Menggunakan HTMLAudioElement + Google Translate TTS.
// Cara ini lebih cocok untuk browser TV yang tidak mempunyai
// Web Speech API / speechSynthesis yang berfungsi.
//
// ======================================================

let soundEnabled =
    localStorage.getItem(
        "displaySoundEnabled"
    ) === "true";


let audioElement =
    new Audio();


audioElement.preload =
    "auto";


audioElement.volume =
    1.0;


// ======================================================
// AUDIO UNLOCK
// ======================================================
//
// Audio harus "dibuka" oleh interaksi user terlebih dahulu.
// Samsung TV biasanya lebih menerima audio HTML setelah
// user menekan tombol.
//
// ======================================================

let audioUnlocked =
    false;


let audioQueue =
    [];


let audioPlaying =
    false;


// ======================================================
// LAST CALL EVENT
// ======================================================

let lastCallEvent =
    localStorage.getItem(
        "lastCallEvent"
    ) ||
    "";


// ======================================================
// UPDATE SOUND BUTTON
// ======================================================

updateSoundButton();


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
// AKTIFKAN SUARA
// ======================================================

window.aktifkanSuara =
    aktifkanSuara;


function aktifkanSuara() {

    soundEnabled =
        true;


    localStorage.setItem(
        "displaySoundEnabled",
        "true"
    );


    updateSoundButton();


    // ==================================================
    // UNLOCK AUDIO
    // ==================================================

    audioUnlocked =
        true;


    // Audio pendek / kosong untuk membuka izin audio.
    // Setelah user menekan tombol, browser TV biasanya
    // mengizinkan audio berikutnya diputar.
    try {

        audioElement.pause();

        audioElement.currentTime =
            0;

        audioElement.src =
            "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQQAAAAA";

        const promise =
            audioElement.play();

        if (
            promise &&
            typeof promise.catch ===
                "function"
        ) {

            promise.catch(
                function(error) {

                    console.log(
                        "Audio unlock:",
                        error
                    );

                }
            );
        }

    } catch (
        error
    ) {

        console.log(
            "Audio unlock error:",
            error
        );
    }


    // ==================================================
    // TEST SUARA
    // ==================================================

    setTimeout(
        function() {

            playTTS(
                "Sistem panggilan interview telah aktif."
            );

        },
        300
    );
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
            function(
                docSnapshot
            ) {

                const data =
                    docSnapshot.data();


                // ======================================
                // HANYA YANG SEDANG INTERVIEW
                // ======================================

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


        // ==========================================
        // TIDAK ADA PANGGILAN
        // ==========================================

        if (
            activeCandidates.length ===
            0
        ) {

            tampilkanWaiting();

            return;
        }


        // ==========================================
        // URUTKAN EVENT TERBARU
        // ==========================================

        activeCandidates.sort(
            function(
                a,
                b
            ) {

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

        if (
            candidate.waktuPanggilUlangTahap2
        ) {

            const time =
                new Date(
                    candidate
                        .waktuPanggilUlangTahap2
                ).getTime();


            if (
                !isNaN(
                    time
                )
            ) {

                return time;
            }
        }


        if (
            candidate.waktuMulaiTahap2
        ) {

            const time =
                new Date(
                    candidate
                        .waktuMulaiTahap2
                ).getTime();


            if (
                !isNaN(
                    time
                )
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
            !isNaN(
                time
            )
        ) {

            return time;
        }
    }


    if (
        candidate.waktuMulai
    ) {

        const time =
            new Date(
                candidate.waktuMulai
            ).getTime();


        if (
            !isNaN(
                time
            )
        ) {

            return time;
        }
    }


    return 0;
}


// ======================================================
// GET NOMOR MEJA AKTIF
// ======================================================

function getNomorMejaAktif(
    candidate
) {

    const tahap =
        Number(
            candidate.tahapInterview ||
            1
        );


    const kandidatMeja =
        tahap === 2

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


    const meja =
        kandidatMeja.find(
            function(value) {

                return (
                    value !==
                        undefined &&

                    value !==
                        null &&

                    String(
                        value
                    ).trim() !==
                        ""
                );
            }
        );


    return String(
        meja ||
        ""
    ).trim();
}


// ======================================================
// GET CALL EVENT
// ======================================================

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


    const meja =
        getNomorMejaAktif(
            candidate
        ) ||
        "-";


    // ==================================================
    // UPDATE NOMOR KANDIDAT
    // ==================================================

    if (
        nomorAntrian
    ) {

        nomorAntrian.innerText =
            nomor;
    }


    // ==================================================
    // UPDATE NOMOR MEJA
    // ==================================================

    if (
        nomorMeja
    ) {

        nomorMeja.innerText =
            meja ===
                "-"
                ? "MEJA BELUM DITENTUKAN"
                : "MEJA " +
                    meja;
    }


    // ==================================================
    // TAMPILKAN CALLING SCREEN
    // ==================================================

    if (
        waitingScreen
    ) {

        waitingScreen.style.display =
            "none";
    }


    if (
        callingScreen
    ) {

        callingScreen.style.display =
            "block";
    }


    // ==================================================
    // TAHAP
    // ==================================================

    const tahapAktif =
        Number(
            candidate.tahapInterview ||
            1
        );


    // ==================================================
    // WARNA INTERVIEW 2
    // ==================================================

    if (
        nomorAntrian
    ) {

        if (
            tahapAktif ===
            2
        ) {

            nomorAntrian.style.color =
                "#f28c28";

        } else {

            nomorAntrian.style.color =
                "";
        }
    }


    if (
        nomorMeja
    ) {

        if (
            tahapAktif ===
            2
        ) {

            nomorMeja.style.color =
                "#f28c28";

        } else {

            nomorMeja.style.color =
                "";
        }
    }


    // ==================================================
    // EVENT
    // ==================================================

    const callEvent =
        getCallEvent(
            candidate
        );


    // ==================================================
    // JANGAN BUNYIKAN EVENT YANG SAMA
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


        if (
            soundEnabled
        ) {

            setTimeout(
                function() {

                    speakCall(
                        nomor,
                        meja
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

    if (
        callingScreen
    ) {

        callingScreen.style.display =
            "none";
    }


    if (
        waitingScreen
    ) {

        waitingScreen.style.display =
            "block";
    }
}


// ======================================================
// BERSIHKAN TEKS UNTUK TTS
// ======================================================

function cleanSpeechText(
    text
) {

    return String(
        text || ""
    )
        .replace(
            /-/g,
            " "
        )
        .replace(
            /\s+/g,
            " "
        )
        .trim();
}


// ======================================================
// KONVERSI NOMOR KANDIDAT
// ======================================================
//
// A-001
//
// dibaca:
// A 001
//
// Supaya TTS tidak membaca "A strip nol nol satu".
//
// ======================================================

function formatNomorUntukSuara(
    nomor
) {

    let text =
        cleanSpeechText(
            nomor
        );


    text =
        text.replace(
            /A\s+(\d+)/gi,
            "A $1"
        );


    text =
        text.replace(
            /B\s+(\d+)/gi,
            "B $1"
        );


    text =
        text.replace(
            /C\s+(\d+)/gi,
            "C $1"
        );


    text =
        text.replace(
            /D\s+(\d+)/gi,
            "D $1"
        );


    return text;
}


// ======================================================
// SUARA PANGGILAN
// ======================================================

function speakCall(
    nomor,
    nomorMejaAktif
) {

    const nomorSpeech =
        formatNomorUntukSuara(
            nomor
        );


    const meja =
        cleanSpeechText(
            nomorMejaAktif
        );


    // ==================================================
    // KALIMAT SINGKAT
    // ==================================================

    let text =
        "Nomor kandidat " +
        nomorSpeech;


    if (
        meja &&
        meja !== "-"
    ) {

        text +=
            ", silakan ke meja nomor " +
            meja +
            ".";

    } else {

        text +=
            ", silakan menunggu.";
    }


    playTTS(
        text
    );
}


// ======================================================
// GOOGLE TTS URL
// ======================================================
//
// Tidak menggunakan speechSynthesis.
//
// Audio diambil sebagai MP3 dari Google Translate TTS.
//
// ======================================================

function createTTSUrl(
    text
) {

    const encodedText =
        encodeURIComponent(
            text
        );


    return (
        "https://translate.google.com/translate_tts" +
        "?ie=UTF-8" +
        "&tl=id" +
        "&client=tw-ob" +
        "&q=" +
        encodedText
    );
}


// ======================================================
// PLAY TTS
// ======================================================

function playTTS(
    text
) {

    if (
        !soundEnabled
    ) {

        return;
    }


    if (
        !text
    ) {

        return;
    }


    audioQueue.push(
        text
    );


    processAudioQueue();
}


// ======================================================
// AUDIO QUEUE
// ======================================================

function processAudioQueue() {

    if (
        audioPlaying
    ) {

        return;
    }


    if (
        audioQueue.length ===
        0
    ) {

        return;
    }


    if (
        !audioUnlocked
    ) {

        console.log(
            "Audio belum di-unlock. Tekan AKTIFKAN SUARA."
        );

        return;
    }


    const text =
        audioQueue.shift();


    audioPlaying =
        true;


    const url =
        createTTSUrl(
            text
        );


    try {

        audioElement.pause();

        audioElement.currentTime =
            0;

        audioElement.src =
            url;


        audioElement.onended =
            function() {

                audioPlaying =
                    false;


                setTimeout(
                    function() {

                        processAudioQueue();

                    },
                    100
                );
            };


        audioElement.onerror =
            function(error) {

                console.error(
                    "Audio TTS gagal:",
                    error
                );


                audioPlaying =
                    false;


                setTimeout(
                    function() {

                        processAudioQueue();

                    },
                    200
                );
            };


        const playPromise =
            audioElement.play();


        if (
            playPromise &&
            typeof playPromise.catch ===
                "function"
        ) {

            playPromise.catch(
                function(error) {

                    console.error(
                        "Audio tidak dapat diputar:",
                        error
                    );


                    audioPlaying =
                        false;


                    // ==================================
                    // JIKA AUTOPLAY DITOLAK
                    // ==================================

                    audioQueue.unshift(
                        text
                    );


                    setTimeout(
                        function() {

                            processAudioQueue();

                        },
                        1000
                    );
                }
            );
        }

    } catch (
        error
    ) {

        console.error(
            "Audio error:",
            error
        );


        audioPlaying =
            false;


        setTimeout(
            function() {

                processAudioQueue();

            },
            500
        );
    }
}


// ======================================================
// EVENT SOUND BUTTON
// ======================================================

if (
    soundButton
) {

    soundButton.addEventListener(
        "click",
        function() {

            aktifkanSuara();

        }
    );
}


// ======================================================
// GLOBAL FUNCTIONS
// ======================================================

window.playTTS =
    playTTS;


window.speakCall =
    speakCall;


window.aktifkanSuara =
    aktifkanSuara;


// ======================================================
// INITIALIZE
// ======================================================

document.addEventListener(
    "DOMContentLoaded",
    function() {

        updateSoundButton();

        tampilkanWaiting();

    }
);
