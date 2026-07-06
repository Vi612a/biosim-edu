// =========================================================================
// ARCHIVO: js/structure.js
// DESCRIPCIÓN: Motor de visualización y modelado estructural 3D basado en 3Dmol.js.
//              Gestiona representaciones, coloración biológica, simulación
//              biofísica de mutaciones puntuales y el Modo Desafío gamificado.
// =========================================================================

class StructureSimulator {
    constructor() {
        this.viewer = null;
        this.currentPdbText = null;
        this.currentPreset = null;
        this.inChallengeMode = false;
        this.currentStyle = "cartoon";
        this.currentColor = "spectrum";
        this.isSpinning = false;
        this.lastMutatedResi = null;
    }

    // --- 1. INICIALIZACIÓN DEL VISOR WEBGL (3Dmol.js) ---
    initViewer(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return false;

        // Limpiar contenedor previo
        container.innerHTML = "";

        // Crear visor 3Dmol con fondo oscuro estético y soporte WebGL
        if (typeof $3Dmol !== "undefined") {
            this.viewer = $3Dmol.createViewer(container, {
                backgroundColor: "#070b14",
                antialias: true
            });
            return true;
        } else {
            console.error("Librería 3Dmol.js no cargada en el navegador.");
            container.innerHTML = `<div style="padding: 2rem; text-align: center; color: var(--accent-red);">
                ⚠️ Error: No se pudo cargar la librería WebGL 3Dmol.js.<br>Verifica tu conexión a internet o la inclusión del script en index.html.
            </div>`;
            return false;
        }
    }

    // --- 2. CARGA DE ESTRUCTURAS Y PRESETS ---
    async fetchStructureFromRCSB(pdbId) {
        const idClean = pdbId.trim().toUpperCase();
        // 1. Intentar descargar mmCIF (.cif), estándar actual para estructuras recientes (ej. 9VQU)
        try {
            const resCif = await fetch(`https://files.rcsb.org/download/${idClean}.cif`);
            if (resCif.ok) {
                const text = await resCif.text();
                if (text && text.length > 50 && !text.includes("404 Not Found")) {
                    return { text, format: "cif" };
                }
            }
        } catch (e) {
            console.warn(`Intento mmCIF fallido para ${idClean}:`, e);
        }

        // 2. Intentar descargar formato PDB heredado (.pdb)
        try {
            const resPdb = await fetch(`https://files.rcsb.org/download/${idClean}.pdb`);
            if (resPdb.ok) {
                const text = await resPdb.text();
                if (text && text.length > 50 && !text.includes("404 Not Found")) {
                    return { text, format: "pdb" };
                }
            }
        } catch (e) {
            console.warn(`Intento PDB fallido para ${idClean}:`, e);
        }

        throw new Error(`No se pudo descargar "${idClean}" desde RCSB PDB (verifica el código ID o tu conexión).`);
    }

    async loadPreset(presetKey, callbackSuccess, callbackError) {
        if (!window.STRUCTURE_PRESETS || !window.STRUCTURE_PRESETS[presetKey]) {
            if (callbackError) callbackError("Preset no encontrado.");
            return;
        }

        const preset = window.STRUCTURE_PRESETS[presetKey];
        this.currentPreset = preset;
        this.inChallengeMode = (presetKey === "challenge_case");
        this.lastMutatedResi = null;

        const pdbId = preset.pdbId || "1crn";
        try {
            if (presetKey === "challenge_case" && window.OFFLINE_PDB_1CRN) {
                this.loadPDBString(window.OFFLINE_PDB_1CRN, "pdb");
                if (callbackSuccess) callbackSuccess(preset, "offline");
                return;
            }

            const { text, format } = await this.fetchStructureFromRCSB(pdbId);
            this.loadPDBString(text, format);
            if (callbackSuccess) callbackSuccess(preset, "online");
        } catch (err) {
            console.warn(`No se pudo descargar ${pdbId} de RCSB PDB. Usando respaldo offline.`);
            if (window.OFFLINE_PDB_1CRN) {
                this.loadPDBString(window.OFFLINE_PDB_1CRN, "pdb");
                if (callbackSuccess) callbackSuccess(preset, "offline_fallback");
            } else {
                if (callbackError) callbackError(err.message || "Error de red y no hay estructura offline disponible.");
            }
        }
    }

    async loadFromPdbId(pdbId, callbackSuccess, callbackError) {
        this.currentPreset = null;
        this.inChallengeMode = false;
        this.lastMutatedResi = null;

        try {
            const { text, format } = await this.fetchStructureFromRCSB(pdbId);
            this.loadPDBString(text, format);
            if (callbackSuccess) callbackSuccess({ name: `Estructura: ${pdbId.toUpperCase()} (${format.toUpperCase()})` }, "online");
        } catch (err) {
            if (callbackError) callbackError(err.message || `Error al intentar descargar "${pdbId}".`);
        }
    }

    loadPDBString(pdbText, format = "pdb") {
        if (!this.viewer) return;
        this.currentPdbText = pdbText;
        this.currentFormat = format;
        this.viewer.clear();
        this.viewer.addModel(pdbText, format);
        
        // Aplicar representación y color actual
        this.updateRepresentation(this.currentStyle, this.currentColor);
        
        this.viewer.zoomTo();
        this.viewer.render();
    }

    getResidueInfo(resiNum, chainId = null) {
        if (!this.viewer) return null;
        let selector = { resi: parseInt(resiNum) };
        if (chainId && chainId !== "ALL" && chainId !== "") selector.chain = chainId;

        let atoms = this.viewer.selectedAtoms(selector);
        if (!atoms || atoms.length === 0) {
            // Intentar buscar el residuo en CUALQUIER cadena si falló en la solicitada
            const anySelector = { resi: parseInt(resiNum) };
            const anyAtoms = this.viewer.selectedAtoms(anySelector);
            if (anyAtoms && anyAtoms.length > 0) {
                atoms = anyAtoms;
            } else {
                return null;
            }
        }

        const firstAtom = atoms[0];
        return {
            resi: parseInt(firstAtom.resi || resiNum),
            chain: firstAtom.chain || "A",
            resn: (firstAtom.resn || "ALA").toUpperCase()
        };
    }

    getAvailableResidues() {
        if (!this.viewer) return [];
        const atoms = this.viewer.selectedAtoms({});
        if (!atoms || atoms.length === 0) return [];

        const resMap = new Map();
        atoms.forEach(a => {
            if (a.resi && a.resn) {
                const key = `${a.chain || 'A'}_${a.resi}`;
                if (!resMap.has(key)) {
                    resMap.set(key, { resi: parseInt(a.resi), chain: a.chain || 'A', resn: a.resn.toUpperCase() });
                }
            }
        });
        return Array.from(resMap.values()).sort((a, b) => {
            if (a.chain !== b.chain) return a.chain.localeCompare(b.chain);
            return a.resi - b.resi;
        });
    }

    // --- 3. ESTILOS DE REPRESENTACIÓN Y ESQUEMAS DE COLOR ---
    updateRepresentation(styleType, colorScheme) {
        if (!this.viewer || !this.currentPdbText) return;
        this.currentStyle = styleType;
        this.currentColor = colorScheme;

        if (this.viewer.removeAllSurfaces) this.viewer.removeAllSurfaces();
        if (this.viewer.removeAllShapes) this.viewer.removeAllShapes();
        if (this.viewer.removeAllLabels) this.viewer.removeAllLabels();
        this.viewer.setStyle({}, {}); // Reset total

        // Determinar coloración por átomo o cadena
        let colorSpec = { colorscheme: "spectrum" };
        if (colorScheme === "secstruct") {
            colorSpec = { colorscheme: "Jmol" }; // Jmol resalta secundario
        } else if (colorScheme === "chain") {
            colorSpec = { colorscheme: "chain" };
        } else if (colorScheme === "hydrophobic") {
            colorSpec = { colorscheme: "amino" };
        }

        // Aplicar estilo de visualización
        if (styleType === "cartoon") {
            this.viewer.setStyle({}, { cartoon: colorSpec });
        } else if (styleType === "stick") {
            this.viewer.setStyle({}, { stick: { radius: 0.2, ...colorSpec } });
        } else if (styleType === "sphere") {
            this.viewer.setStyle({}, { sphere: { scale: 0.7, ...colorSpec } });
        } else if (styleType === "surface") {
            this.viewer.setStyle({}, { cartoon: colorSpec });
            this.viewer.addSurface($3Dmol.SurfaceType.VDW, { opacity: 0.75, colorscheme: colorSpec.colorscheme || "spectrum" });
        } else if (styleType === "cartoon_stick") {
            this.viewer.setStyle({}, { 
                cartoon: colorSpec, 
                stick: { radius: 0.15, colorscheme: "default" } 
            });
        }

        // Si hay una mutación previa resaltada, mantener su resplandor en rojo
        if (this.lastMutatedResi) {
            this.highlightResidue(this.lastMutatedResi.resi, this.lastMutatedResi.chain, "#ff0054", true);
        }

        this.viewer.render();
    }

    toggleSpin(enable) {
        if (!this.viewer) return;
        this.isSpinning = enable;
        this.viewer.spin(enable ? "y" : false, 1);
    }

    resetView() {
        if (!this.viewer) return;
        this.viewer.zoomTo();
        this.viewer.render();
    }

    // --- 4. SIMULADOR BIOFÍSICO DE MUTACIONES PUNTUALES ---
    highlightResidue(resiNum, chainId = null, hexColor = "#ff0054", noZoom = false) {
        if (!this.viewer) return;
        
        let selector = { resi: parseInt(resiNum) };
        if (chainId && chainId !== "ALL" && chainId !== "") selector.chain = chainId;

        // Validar si el residuo existe en la estructura antes de hacer zoom (evitar zoom infinito o pantalla vacía)
        let atoms = this.viewer.selectedAtoms(selector);
        if (!atoms || atoms.length === 0) {
            // Intentar buscar el residuo en CUALQUIER cadena si falló en la cadena seleccionada
            const anySelector = { resi: parseInt(resiNum) };
            const anyAtoms = this.viewer.selectedAtoms(anySelector);
            if (anyAtoms && anyAtoms.length > 0) {
                selector = anySelector;
                atoms = anyAtoms;
                chainId = anyAtoms[0].chain || "ALL";
            } else {
                if (!noZoom) {
                    alert(`⚠️ El residuo #${resiNum} no se encontró en esta estructura molecular. Mostrando vista general.`);
                    this.viewer.zoomTo();
                    this.viewer.render();
                }
                return false;
            }
        }

        // Añadir esferas y palos brillantes al residuo objetivo para que resalte
        this.viewer.addStyle(selector, {
            stick: { radius: 0.4, color: hexColor },
            sphere: { scale: 1.1, color: hexColor, opacity: 0.85 }
        });

        if (!noZoom) {
            // Zoom suave con margen hacia atrás para que no se vea gigantesco ni infinito
            this.viewer.zoomTo(selector, 800);
            setTimeout(() => {
                if (this.viewer) {
                    this.viewer.zoom(0.45, 600);
                }
            }, 820);
        }
        this.viewer.render();
        this.lastMutatedResi = { resi: parseInt(resiNum), chain: chainId };
        return true;
    }

    simulateMutation(resiNum, chainId, origAmino, mutAmino) {
        // 1. Resaltar visualmente en 3D
        this.updateRepresentation(this.currentStyle, this.currentColor); // Reset previo
        this.highlightResidue(resiNum, chainId, "#ff0054", false);

        // 2. Calcular propiedades biofísicas comparativas
        const bioReport = this.analyzeBiophysicalImpact(origAmino, mutAmino, resiNum);
        return bioReport;
    }

    analyzeBiophysicalImpact(origCode, mutCode, resiNum) {
        const props = {
            "ALA": { name: "Alanina", charge: "Neutra", hydro: "Hidrofóbica", size: "Pequeño" },
            "ARG": { name: "Arginina", charge: "Positiva (+1)", hydro: "Hidrofílica (Polar)", size: "Grande (Pólvora electrostática)" },
            "ASN": { name: "Asparagina", charge: "Neutra", hydro: "Hidrofílica (Polar)", size: "Mediano" },
            "ASP": { name: "Ácido Aspártico", charge: "Negativa (-1)", hydro: "Hidrofílica (Polar)", size: "Mediano (Puente salino)" },
            "CYS": { name: "Cisteína", charge: "Neutra", hydro: "Hidrofóbica / Reactivo", size: "Mediano (Forma puente disulfuro)" },
            "GLU": { name: "Glutamato", charge: "Negativa (-1)", hydro: "Hidrofílica (Polar)", size: "Grande" },
            "GLN": { name: "Glutamina", charge: "Neutra", hydro: "Hidrofílica (Polar)", size: "Grande" },
            "GLY": { name: "Glicina", charge: "Neutra", hydro: "Neutra", size: "Ultra-pequeño (Sin cadena lateral)" },
            "HIS": { name: "Histidina", charge: "Positiva (+1) / Neutra", hydro: "Polar / Aromática", size: "Grande" },
            "ILE": { name: "Isoleucina", charge: "Neutra", hydro: "Muy Hidrofóbica", size: "Grande" },
            "LEU": { name: "Leucina", charge: "Neutra", hydro: "Muy Hidrofóbica", size: "Grande" },
            "LYS": { name: "Lisina", charge: "Positiva (+1)", hydro: "Hidrofílica (Polar)", size: "Grande" },
            "MET": { name: "Metionina", charge: "Neutra", hydro: "Hidrofóbica (Azufrado)", size: "Grande" },
            "PHE": { name: "Fenilalanina", charge: "Neutra", hydro: "Muy Hidrofóbica (Aromático)", size: "Muy Grande" },
            "PRO": { name: "Prolina", charge: "Neutra", hydro: "Hidrofóbica (Rígido)", size: "Anillo rígido (Rompe hélices)" },
            "SER": { name: "Serina", charge: "Neutra", hydro: "Hidrofílica (Polar OH)", size: "Pequeño" },
            "THR": { name: "Treonina", charge: "Neutra", hydro: "Hidrofílica (Polar OH)", size: "Mediano" },
            "TRP": { name: "Triptófano", charge: "Neutra", hydro: "Hidrofóbico (Aromático doble)", size: "Ultra-grande" },
            "TYR": { name: "Tirosina", charge: "Neutra", hydro: "Polar / Aromática", size: "Muy Grande" },
            "VAL": { name: "Valina", charge: "Neutra", hydro: "Muy Hidrofóbica", size: "Mediano" }
        };

        const o = props[origCode] || { name: origCode, charge: "Desconocida", hydro: "Variable", size: "Estándar" };
        const m = props[mutCode] || { name: mutCode, charge: "Desconocida", hydro: "Variable", size: "Estándar" };

        let severity = "🟢 Bajo / Conservador";
        let impactDetail = "La mutación sustituye un aminoácido de propiedades fisicoquímicas similares. Es probable que la estructura tridimensional y la función proteica se conserven (mutación silente o tolerada).";

        // Caso clínico famoso: Hemoglobina E6V (Anemia Falciforme)
        if ((origCode === "GLU" && mutCode === "VAL") || (origCode === "E" && mutCode === "V")) {
            severity = "🔴 CRÍTICO / Patológico (Anemia Falciforme)";
            impactDetail = "¡Alerta Clínica! El Glutamato (carga negativa hidrofílica) es reemplazado por Valina (apolar hidrofóbica) en la superficie acuosa exterior. Esto crea un 'parche pegajoso hidrofóbico' que hace que las moléculas de hemoglobina se agrupen en fibras rígidas, deformando el glóbulo rojo en forma de hoz y bloqueando los capilares sanguíneos.";
        }
        // Caso Prolina (rompedor de hélices)
        else if (mutCode === "PRO" && origCode !== "PRO") {
            severity = "🟠 ALTO / Severo (Distorsión Estructural)";
            impactDetail = "La Prolina posee un anillo pirrolidínico rígido que impide la formación de puentes de hidrógeno normales en la columna vertebral. Su introducción destruye o dobla severamente las hélices alfa y láminas beta locales.";
        }
        // Cambio drástico de carga electrostática
        else if ((o.charge.includes("Positiva") && m.charge.includes("Negativa")) || (o.charge.includes("Negativa") && m.charge.includes("Positiva"))) {
            severity = "🔴 CRÍTICO / Inversión de Carga";
            impactDetail = "Se ha invertido la carga electrostática del residuo. Esto destruye puentes salinos esenciales con residuos vecinos y genera repulsiones electrostáticas violentas que desestabilizan el plegamiento globular o la unión con sustratos/ADN.";
        }
        // Polar a Muy Hidrofóbico en superficie o viceversa
        else if (o.hydro.includes("Polar") && m.hydro.includes("Hidrofóbica")) {
            severity = "🟠 MEDIO-ALTO / Inestabilidad Térmica";
            impactDetail = "Introducir un residuo hidrofóbico donde había uno polar expuesto al solvente disminuye la solubilidad proteica y favorece el plegamiento erróneo o la agregación.";
        }
        else if (o.size.includes("Pequeño") && m.size.includes("Grande")) {
            severity = "🟡 MEDIO / Choque Estérico";
            impactDetail = "El nuevo aminoácido es considerablemente más voluminoso que el original. Puede generar un choque estérico (colisión de nubes electrónicas) con los residuos vecinos, deformando la cavidad local.";
        }

        return {
            orig: o,
            mut: m,
            resiNum: resiNum,
            severity: severity,
            impactDetail: impactDetail
        };
    }

    // --- 5. EVALUADOR DEL MODO DESAFÍO GAMIFICADO ---
    submitChallengeAnswer(selectedCode, challengeObj) {
        if (!challengeObj || !challengeObj.options) return { correct: false, msg: "Error de configuración de desafío." };

        const option = challengeObj.options.find(o => o.code === selectedCode);
        if (!option) return { correct: false, msg: "Opción no válida." };

        if (option.correct) {
            // ¡ÉXITO! Resaltar el residuo salvado en VERDE NEÓN
            this.updateRepresentation(this.currentStyle, this.currentColor);
            this.highlightResidue(challengeObj.problemResidue, challengeObj.problemChain, "#39ff14", false);
            this.inChallengeMode = false;
            return {
                correct: true,
                title: "🏆 ¡FELICIDADES! ¡PROTEÍNA SALVADA CON ÉXITO!",
                feedback: option.feedback
            };
        } else {
            // ¡ERROR! Resaltar en ROJO ALARMA con vibración visual
            this.highlightResidue(challengeObj.problemResidue, challengeObj.problemChain, "#ff0054", false);
            return {
                correct: false,
                title: "❌ MUTACIÓN INESTABLE / INCORRECTA",
                feedback: option.feedback
            };
        }
    }
}

// Exportar instancia global para app.js
window.phyloStructureSim = new StructureSimulator();
