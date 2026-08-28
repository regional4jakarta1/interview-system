// ======================================================
// HASIL I1
// ======================================================

function getHasil1HTML(candidate) {

    const hasil = String(
        candidate.hasil ||
        candidate.hasilInterview1 ||
        ""
    )
    .trim()
    .toLowerCase();

    // DISARANKAN
    if (
        hasil === "disarankan" ||
        hasil === "direkomendasikan" ||
        hasil === "recommended"
    ) {
        return `
            <span class="result-recommended">
                DISARANKAN
            </span>
        `;
    }

    // DIPERTIMBANGKAN
    if (
        hasil === "dipertimbangkan" ||
        hasil === "considered"
    ) {
        return `
            <span class="result-considered">
                DIPERTIMBANGKAN
            </span>
        `;
    }

    // TIDAK DIREKOMENDASIKAN
    if (
        hasil === "tidak direkomendasikan" ||
        hasil === "tidak disarankan" ||
        hasil === "not recommended" ||
        hasil === "notrecommended"
    ) {
        return `
            <span class="result-not">
                TIDAK DISARANKAN
            </span>
        `;
    }

    return "-";
}
