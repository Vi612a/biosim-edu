/**
 * presets.js - Base de datos didáctica de secuencias biológicas para BioSim Edu.
 * Contiene casos educativos para el algoritmo global Needleman-Wunsch y para Filogenia UPGMA.
 */

const PRESETS = {
    short_dna: {
        name: "🧪 Tutorial Básico: ADN Corto (10 bases)",
        description: "Secuencias cortas de ADN para comprender el llenado de la matriz celda por celda sin saturación visual.",
        seq1: "ACGGTCGACA",
        seq2: "ACGGCCGAAT",
        type: "dna",
        match: 5,
        mismatch: -2,
        gap: -2
    },
    hb_sickle: {
        name: "🩸 Patología: Hemoglobina Normal vs. Anemia Falciforme",
        description: "Región N-terminal de la cadena β de la hemoglobina (ácidos aminados 1-15). Observa la mutación puntual clave en la posición 6 (Glutamato 'E' mutado a Valina 'V').",
        seq1: "VHLTPEEKSAVTALW", // HbA (Normal)
        seq2: "VHLTPVEKSAVTALW", // HbS (Anemia falciforme - mutación E6V)
        type: "protein",
        match: 5,
        mismatch: -3,
        gap: -4
    },
    hb_human_chimp: {
        name: "🧬 Evolución Cercana: Hemoglobina β (Humano vs. Chimpancé)",
        description: "Las proteínas evolutivamente muy cercanas muestran un alineamiento con puntuaciones altas en la diagonal principal y cero brechas (gaps).",
        seq1: "VHLTPEEKSAVTALWGKVNVDEVGGEALGR",
        seq2: "VHLTPEEKSAVTALWGKVNVDEVGGEALGR", // Identidad del 100% en esta región
        type: "protein",
        match: 5,
        mismatch: -2,
        gap: -3
    },
    hb_human_mouse: {
        name: "🐭 Evolución Distante: Hemoglobina β (Humano vs. Ratón)",
        description: "Al comparar humano y ratón, aparecen sustituciones de aminoácidos conservadas y divergentes a lo largo de millones de años de evolución.",
        seq1: "VHLTPEEKSAVTALWGKVNVDEVGGEALGRLLVVYPWTQR",
        seq2: "VHLTDAEKAAVSCLWGKVNSDEVGGEALGRLLVVYPWTQR",
        type: "protein",
        match: 5,
        mismatch: -2,
        gap: -3
    },
    custom: {
        name: "✏️ Secuencia Personalizada (Edición Libre)",
        description: "Ingresa tus propias secuencias de ADN, ARN o proteínas en formato texto para experimentar libremente.",
        seq1: "GATTACA",
        seq2: "GCATGCG",
        type: "custom",
        match: 5,
        mismatch: -2,
        gap: -2
    }
};

const PHYLO_PRESETS = {
    primates: {
        name: "🐵 Familia de Primates (Humano, Chimpancé, Gorila, Orangután)",
        description: "Demuestra la extrema conservación evolutiva en primates. Humano y Chimpancé se agruparán primero al tener una divergencia casi nula.",
        type: "protein",
        species: [
            { name: "Humano", seq: "VHLTPEEKSAVTALWGKVNVDEVGGEALGR" },
            { name: "Chimpancé", seq: "VHLTPEEKSAVTALWGKVNVDEVGGEALGR" },
            { name: "Gorila", seq: "VHLTPEEKSAVTSLWGKVNVDEVGGEALGR" },
            { name: "Orangután", seq: "VHLTPEEKSAVTALWGKVNVDEIGGEALGR" },
            { name: "Macaco Rhesus", seq: "VHLTPEEKNAVTALWGKVNVDEVGGEALGR" }
        ]
    },
    mammals: {
        name: "🐭 Evolución de Mamíferos (Humano, Perro, Vaca, Ratón)",
        description: "Observa cómo el algoritmo UPGMA separa las líneas evolutivas de los mamíferos terrestres comparando sus cadenas beta-globina.",
        type: "protein",
        species: [
            { name: "Humano", seq: "VHLTPEEKSAVTALWGKVNVDEVGGEALGR" },
            { name: "Perro", seq: "VHLTAEEKSLVSGLWGKVNVDEVGGEALGR" },
            { name: "Vaca", seq: "VHLTAEEKAAVTAFWGKVKVDEVGGEALGR" },
            { name: "Ratón", seq: "VHLTDAEKAAVSCLWGKVNSDEVGGEALGR" }
        ]
    },
    vertebrates: {
        name: "🐟 Diversidad Vertebrada (Humano, Ave, Rana, Pez Cebra)",
        description: "Alineamiento global que evidencia la separación evolutiva en grandes clases anatómicas de vertebrados a lo largo de cientos de millones de años.",
        type: "protein",
        species: [
            { name: "Humano (Mamífero)", seq: "VHLTPEEKSAVTALWGKVNVDEVGGEALGR" },
            { name: "Pollo (Ave)", seq: "VHWTAEEKQLITGLWGKVNVAECGAEALAR" },
            { name: "Rana (Anfibio)", seq: "VHWTAEEKAVITGLWGKVNVEDCGGEALAR" },
            { name: "Pez Cebra (Pez)", seq: "VHWTAEEKQLITGLWGKVNVEDAGCEALAR" }
        ]
    },
    custom_phylo: {
        name: "✏️ Especies Personalizadas (Edición Libre en formato FASTA / Texto)",
        description: "Agrega, modifica o elimina tus propias especies y secuencias moleculares para descubrir sus relaciones filogenéticas.",
        type: "custom",
        species: [
            { name: "Especie Alfa", seq: "ACGTACGTACGTACGT" },
            { name: "Especie Beta", seq: "ACGTACGTACGAACGT" },
            { name: "Especie Gamma", seq: "ACGTTCGAACGAACGT" },
            { name: "Especie Delta", seq: "AGGTTCGAACGAACGT" }
        ]
    }
};

/**
 * Función auxiliar para limpiar encabezados FASTA (>Nombre...) y espacios
 */
function cleanFasta(text) {
    if (!text) return "";
    const lines = text.trim().split(/\r?\n/);
    const sequenceLines = [];
    for (let line of lines) {
        line = line.trim();
        if (line.startsWith('>')) {
            continue; // Ignorar línea de encabezado FASTA
        }
        sequenceLines.push(line.replace(/\s+/g, '').toUpperCase());
    }
    return sequenceLines.join('');
}
