// =========================================================================
// ARCHIVO: js/genomics.js
// DESCRIPCIÓN: Motor computacional y didáctico para el Módulo 4 (Genómica).
//              Implementa:
//              1. Ensamblador de fragmentos mediante Gráficos de De Bruijn (k-mers).
//              2. Algoritmo Euleriano para reconstrucción de consenso (Contigs).
//              3. Visualizador interactivo del Dogma Central (ADN -> ARNm -> Proteína).
//              4. Conexión inter-modular (Ensamble -> Módulo 1, Dogma -> Módulo 3).
//              5. Modo Desafío Gamificado (Clínica Genómica / Ensamble Misterioso).
// =========================================================================

// --- TABLA DEL CÓDIGO GENÉTICO ESTÁNDAR (CODONES ARNm -> AMINOÁCIDOS) ---
const CODON_TABLE = {
    "UUU": { aa: "Phe", name: "Fenilalanina", code: "F", type: "Hidrofóbico" },
    "UUC": { aa: "Phe", name: "Fenilalanina", code: "F", type: "Hidrofóbico" },
    "UUA": { aa: "Leu", name: "Leucina", code: "L", type: "Hidrofóbico" },
    "UUG": { aa: "Leu", name: "Leucina", code: "L", type: "Hidrofóbico" },
    "CUU": { aa: "Leu", name: "Leucina", code: "L", type: "Hidrofóbico" },
    "CUC": { aa: "Leu", name: "Leucina", code: "L", type: "Hidrofóbico" },
    "CUA": { aa: "Leu", name: "Leucina", code: "L", type: "Hidrofóbico" },
    "CUG": { aa: "Leu", name: "Leucina", code: "L", type: "Hidrofóbico" },
    "AUU": { aa: "Ile", name: "Isoleucina", code: "I", type: "Hidrofóbico" },
    "AUC": { aa: "Ile", name: "Isoleucina", code: "I", type: "Hidrofóbico" },
    "AUA": { aa: "Ile", name: "Isoleucina", code: "I", type: "Hidrofóbico" },
    "AUG": { aa: "Met", name: "Metionina (Inicio)", code: "M", type: "Inicio / Hidrofóbico", start: true },
    "GUU": { aa: "Val", name: "Valina", code: "V", type: "Hidrofóbico" },
    "GUC": { aa: "Val", name: "Valina", code: "V", type: "Hidrofóbico" },
    "GUA": { aa: "Val", name: "Valina", code: "V", type: "Hidrofóbico" },
    "GUG": { aa: "Val", name: "Valina", code: "V", type: "Hidrofóbico" },
    "UCU": { aa: "Ser", name: "Serina", code: "S", type: "Polar OH" },
    "UCC": { aa: "Ser", name: "Serina", code: "S", type: "Polar OH" },
    "UCA": { aa: "Ser", name: "Serina", code: "S", type: "Polar OH" },
    "UCG": { aa: "Ser", name: "Serina", code: "S", type: "Polar OH" },
    "CCU": { aa: "Pro", name: "Prolina", code: "P", type: "Rígido" },
    "CCC": { aa: "Pro", name: "Prolina", code: "P", type: "Rígido" },
    "CCA": { aa: "Pro", name: "Prolina", code: "P", type: "Rígido" },
    "CCG": { aa: "Pro", name: "Prolina", code: "P", type: "Rígido" },
    "ACU": { aa: "Thr", name: "Treonina", code: "T", type: "Polar OH" },
    "ACC": { aa: "Thr", name: "Treonina", code: "T", type: "Polar OH" },
    "ACA": { aa: "Thr", name: "Treonina", code: "T", type: "Polar OH" },
    "ACG": { aa: "Thr", name: "Treonina", code: "T", type: "Polar OH" },
    "GCU": { aa: "Ala", name: "Alanina", code: "A", type: "Hidrofóbico" },
    "GCC": { aa: "Ala", name: "Alanina", code: "A", type: "Hidrofóbico" },
    "GCA": { aa: "Ala", name: "Alanina", code: "A", type: "Hidrofóbico" },
    "GCG": { aa: "Ala", name: "Alanina", code: "A", type: "Hidrofóbico" },
    "UAU": { aa: "Tyr", name: "Tirosina", code: "Y", type: "Aromático / Polar" },
    "UAC": { aa: "Tyr", name: "Tirosina", code: "Y", type: "Aromático / Polar" },
    "UAA": { aa: "STOP", name: "Codón de Parada (Ocre)", code: "*", type: "Parada / Fin", stop: true },
    "UAG": { aa: "STOP", name: "Codón de Parada (Ámbar)", code: "*", type: "Parada / Fin", stop: true },
    "CAU": { aa: "His", name: "Histidina", code: "H", type: "Positivo / Polar" },
    "CAC": { aa: "His", name: "Histidina", code: "H", type: "Positivo / Polar" },
    "CAA": { aa: "Gln", name: "Glutamina", code: "Q", type: "Polar" },
    "CAG": { aa: "Gln", name: "Glutamina", code: "Q", type: "Polar" },
    "AAU": { aa: "Asn", name: "Asparagina", code: "N", type: "Polar" },
    "AAC": { aa: "Asn", name: "Asparagina", code: "N", type: "Polar" },
    "AAA": { aa: "Lys", name: "Lisina", code: "K", type: "Positivo (+1)" },
    "AAG": { aa: "Lys", name: "Lisina", code: "K", type: "Positivo (+1)" },
    "GAU": { aa: "Asp", name: "Ácido Aspártico", code: "D", type: "Negativo (-1)" },
    "GAC": { aa: "Asp", name: "Ácido Aspártico", code: "D", type: "Negativo (-1)" },
    "GAA": { aa: "Glu", name: "Glutamato", code: "E", type: "Negativo (-1)" },
    "GAG": { aa: "Glu", name: "Glutamato", code: "E", type: "Negativo (-1)" },
    "UGU": { aa: "Cys", name: "Cisteína", code: "C", type: "Azufrado / Disulfuro" },
    "UGC": { aa: "Cys", name: "Cisteína", code: "C", type: "Azufrado / Disulfuro" },
    "UGA": { aa: "STOP", name: "Codón de Parada (Ópalo)", code: "*", type: "Parada / Fin", stop: true },
    "UGG": { aa: "Trp", name: "Triptófano", code: "W", type: "Aromático Gigante" },
    "CGU": { aa: "Arg", name: "Arginina", code: "R", type: "Positivo (+1)" },
    "CGC": { aa: "Arg", name: "Arginina", code: "R", type: "Positivo (+1)" },
    "CGA": { aa: "Arg", name: "Arginina", code: "R", type: "Positivo (+1)" },
    "CGG": { aa: "Arg", name: "Arginina", code: "R", type: "Positivo (+1)" },
    "AGU": { aa: "Ser", name: "Serina", code: "S", type: "Polar OH" },
    "AGC": { aa: "Ser", name: "Serina", code: "S", type: "Polar OH" },
    "AGA": { aa: "Arg", name: "Arginina", code: "R", type: "Positivo (+1)" },
    "AGG": { aa: "Arg", name: "Arginina", code: "R", type: "Positivo (+1)" },
    "GGU": { aa: "Gly", name: "Glicina", code: "G", type: "Ultra-pequeño" },
    "GGC": { aa: "Gly", name: "Glicina", code: "G", type: "Ultra-pequeño" },
    "GGA": { aa: "Gly", name: "Glicina", code: "G", type: "Ultra-pequeño" },
    "GGG": { aa: "Gly", name: "Glicina", code: "G", type: "Ultra-pequeño" }
};

// --- PRESETS DE GENÓMICA ---
const GENOMICS_PRESETS = {
    "binary_debruijn": {
        name: "🔢 Grafo Clásico Binario De Bruijn B(2,4) (0s y 1s)",
        type: "debruijn",
        k: 4,
        description: "Reconstrucción exacta del diagrama clásico B(2,4) sobre el alfabeto binario {0, 1} con sus 8 nodos (3-bits) y 16 aristas (4-bits). Demuestra cómo cada palabra binaria posible aparece en una ruta euleriana única, conectando la teoría de grafos computacional con la bioinformática de secuencias ADN.",
        reads: [
            "0000", "0001", "0010", "0011", "0100", "0101", "0110", "0111", "1000", "1001", "1010", "1011", "1100", "1101", "1110", "1111"
        ],
        expectedConsensus: "00001001101011110",
        connectionNote: "💡 Observa cómo en TODOS los presets ahora se muestra en cada nodo y arista tanto el texto principal como su equivalencia (binario 0s/1s o bases ADN)."
    },
    "beta_globin_assembly": {
        name: "🩸 Ensamble Hemoglobina β (Conexión Módulo 1)",
        type: "debruijn",
        k: 4,
        description: "Fragmentos de lecturas (reads) del gen humano HBB que codifica la cadena beta de la hemoglobina. Al ensamblar estos k-mers, reconstruirás la secuencia exacta que estudiamos en el Módulo 1 y podrás enviarla directamente al alineador de Needleman-Wunsch.",
        reads: [
            "ATGC", "TGCA", "GCAC", "CACG", "ACGT", "CGTG", "GTGG", "TGGA", "GGAC", "GACT", "ACTT", "CTTC"
        ],
        expectedConsensus: "ATGCACGTGGACTTC",
        connectionNote: "⚡ Conexión Directa: Una vez ensamblado el contig consenso, podrás enviarlo con un clic como Secuencia 1 al Módulo 1."
    },
    "viral_outbreak": {
        name: "🦠 Ensamble Viral (Brote de SARS-CoV-2)",
        type: "debruijn",
        k: 4,
        description: "Lecturas cortas de secuenciación de nueva generación (NGS) correspondientes a la región del dominio de unión al receptor (RBD) de la proteína Spike viral.",
        reads: [
            "TTCG", "TCGA", "CGAC", "GACA", "ACAT", "CATT", "ATTC", "TTCA", "TCAT", "CATA"
        ],
        expectedConsensus: "TTCGACATTCATA",
        connectionNote: "🔍 Observa cómo los nodos (k-1 mers) se conectan mediante aristas dirigidas para formar un camino euleriano único."
    },
    "sickle_dogma": {
        name: "🩸 Dogma Central: Hemoglobina Normal vs. Falciforme (E6V)",
        type: "dogma",
        description: "Replicación, Transcripción y Traducción del fragmento inicial de la hemoglobina. Te permite simular en vivo la mutación puntual A->T en el codón 6 para ver cómo el Ácido Glutámico (Glu) se transforma en Valina (Val), causando la Anemia Falciforme.",
        dna: "ATGGTGCACCTGACTCCTGAGGAG",
        connectionNote: "⚡ Conexión Directa: Al traducir el péptido mutado (Valina en pos #6), podrás saltar al Módulo 3 para ver su choque estérico en 3D."
    },
    "insulin_dogma": {
        name: "💉 Dogma Central: Síntesis de Insulina Humana",
        type: "dogma",
        description: "Secuencia codificante del péptido señal y cadena A de la insulina humana. Demuestra cómo el ribosoma traduce codones en aminoácidos para formar una hormona metabólica vital.",
        dna: "ATGGCCCTGTGGATGCGCCTCCTG"
    },
    "challenge_genomics": {
        name: "🎯 Modo Desafío: El Ensamblador y Traductor Clínico",
        type: "challenge",
        description: "Resuelve una emergencia clínica identificando el fragmento k-mer perdido para ensamblar el gen o mutando la base de ADN para reparar un codón de parada prematuro.",
        challengeData: {
            title: "CASO CLÍNICO DESAFÍO: Código Genético Roto",
            problemDesc: "Un paciente con fibrosis quística presenta una mutación sin sentido (Nonsense) en su gen CFTR que detiene la traducción ribosomal prematuramente en el tercer codón. Tu misión es seleccionar la reparación de nucleótido adecuada para restaurar la proteína completa.",
            dnaSequence: "ATGTTCTAAGAGATC", // Codón 3 es TAA (STOP en ARNm: UAA)
            targetCodonIdx: 2, // 0-indexed (TAA)
            options: [
                { base: "C", newDna: "ATGTTCCAAGAGATC", mrna: "UUC (Fenilalanina)", correct: false, feedback: "Incorrecto: Cambiar a UUC produce Fenilalanina, pero altera el plegamiento nativo y no coincide con la enzima silvestre." },
                { base: "G", newDna: "ATGTTCGAAGAGATC", mrna: "GAA (Glutamato)", correct: true, feedback: "🏆 ¡PERFECTO! Al cambiar la T por G, el codón de parada UAA se convierte en GAA (Ácido Glutámico). El ribosoma ahora puede continuar leyendo y sintetizar la proteína CFTR funcional." },
                { base: "A", newDna: "ATGTTAAAAGAGATC", mrna: "AAA (Lisina)", correct: false, feedback: "Incorrecto: AAA codifica Lisina (+1), cuya carga electrostática positiva rechaza el sustrato del canal de cloro." }
            ]
        }
    }
};

// =========================================================================
// FUNCIÓN AUXILIAR GLOBALE: FORMATEO DUAL DE K-MERS (BINARIO <-> ADN)
// =========================================================================
function formatKmerDual(str) {
    if (!str) return { main: "", sub: "", full: "" };
    if (/^[01]+$/.test(str)) {
        let letters = "";
        for (let i = 0; i < str.length; i += 2) {
            const pair = str.substring(i, i + 2);
            if (pair === "00" || pair === "0") letters += "A";
            else if (pair === "01" || pair === "1") letters += "C";
            else if (pair === "10") letters += "G";
            else if (pair === "11") letters += "T";
        }
        return { main: str, sub: `[${letters}]`, full: `${str} [${letters}]` };
    } else {
        let bits = "";
        for (let i = 0; i < str.length; i++) {
            const ch = str[i].toUpperCase();
            if (ch === "A") bits += "00";
            else if (ch === "C") bits += "01";
            else if (ch === "G") bits += "10";
            else if (ch === "T" || ch === "U") bits += "11";
            else bits += "00";
        }
        return { main: str, sub: `[${bits}]`, full: `${str} [${bits}]` };
    }
}

// =========================================================================
// CLASE 1: ENSAMBLADOR DE BRUIJN (K-MERS & CAMINO EULERIANO)
// =========================================================================
class DeBruijnAssembler {
    constructor() {
        this.reads = [];
        this.k = 4;
        this.nodes = new Map(); // key: (k-1)-mer, val: { id, label, outEdges: [], inDegree: 0, outDegree: 0, x: 0, y: 0 }
        this.edges = [];        // array of { from, to, label (k-mer), id, visited: false }
        this.assemblySteps = [];
        this.currentStepIdx = 0;
        this.consensusSequence = "";
        this.inChallengeMode = false;
    }

    // 1. Ingerir lecturas y fracturar en k-mers
    loadReads(readsArray, kSize = 4) {
        this.reads = readsArray.map(r => r.trim().toUpperCase()).filter(r => r.length >= kSize);
        this.k = kSize;
        this.buildGraph();
        this.calculateEulerianPath();
    }

    // 2. Construir el grafo de De Bruijn (Nodos = k-1 mers, Aristas = k-mers)
    buildGraph() {
        this.nodes.clear();
        this.edges = [];
        let edgeCounter = 0;

        // Extraer todos los k-mers de las lecturas
        const kmers = [];
        this.reads.forEach(read => {
            for (let i = 0; i <= read.length - this.k; i++) {
                kmers.push(read.substring(i, i + this.k));
            }
        });

        // Crear nodos y aristas
        kmers.forEach(kmer => {
            const prefix = kmer.substring(0, this.k - 1);
            const suffix = kmer.substring(1, this.k);

            if (!this.nodes.has(prefix)) {
                this.nodes.set(prefix, { id: prefix, label: prefix, outEdges: [], inDegree: 0, outDegree: 0 });
            }
            if (!this.nodes.has(suffix)) {
                this.nodes.set(suffix, { id: suffix, label: suffix, outEdges: [], inDegree: 0, outDegree: 0 });
            }

            const nodeFrom = this.nodes.get(prefix);
            const nodeTo = this.nodes.get(suffix);

            const edgeObj = {
                id: `edge_${edgeCounter++}`,
                from: prefix,
                to: suffix,
                label: kmer,
                visited: false
            };

            nodeFrom.outEdges.push(edgeObj);
            nodeFrom.outDegree++;
            nodeTo.inDegree++;
            this.edges.push(edgeObj);
        });

        // Asignar coordenadas espaciales para visualización SVG
        const nodeList = Array.from(this.nodes.values());
        const n = nodeList.length;

        const isB24 = (n === 8) && nodeList.every(node => /^[01]+$/.test(node.label));

        if (isB24) {
            this.svgWidth = 700;
            this.svgHeight = 580;
            const bMap = {
                "000": { x: 350, y: 75 },
                "100": { x: 160, y: 185 },
                "001": { x: 540, y: 185 },
                "010": { x: 350, y: 260 },
                "101": { x: 350, y: 380 },
                "110": { x: 160, y: 455 },
                "011": { x: 540, y: 455 },
                "111": { x: 350, y: 535 }
            };
            nodeList.forEach(node => {
                if (bMap[node.label]) {
                    node.x = bMap[node.label].x;
                    node.y = bMap[node.label].y;
                } else {
                    node.x = 350;
                    node.y = 290;
                }
            });
        } else {
            this.svgWidth = 750;
            const rx = Math.min(290, Math.max(160, n * 22));
            const ry = Math.min(190, Math.max(110, n * 14));
            this.svgHeight = Math.max(450, ry * 2 + 140);
            const centerX = this.svgWidth / 2;
            const centerY = this.svgHeight / 2;

            let startNode = nodeList.find(node => node.outDegree > node.inDegree) || nodeList[0];
            const orderedNodes = [];
            const visited = new Set();
            const queue = [startNode];
            if (startNode) visited.add(startNode.id);

            while (queue.length > 0) {
                const curr = queue.shift();
                orderedNodes.push(curr);
                curr.outEdges.forEach(e => {
                    const nextNode = this.nodes.get(e.to);
                    if (nextNode && !visited.has(nextNode.id)) {
                        visited.add(nextNode.id);
                        queue.push(nextNode);
                    }
                });
            }
            nodeList.forEach(node => {
                if (!visited.has(node.id)) orderedNodes.push(node);
            });

            orderedNodes.forEach((node, idx) => {
                const angle = (idx / n) * 2 * Math.PI - Math.PI / 2;
                node.x = centerX + rx * Math.cos(angle);
                node.y = centerY + ry * Math.sin(angle);
            });
        }
    }

    // 3. Algoritmo para encontrar el Camino o Ciclo Euleriano (Ensamble de Contig)
    calculateEulerianPath() {
        this.assemblySteps = [];
        this.consensusSequence = "";

        if (this.edges.length === 0) return;

        let startNode = null;
        for (const [id, node] of this.nodes) {
            if (node.outDegree > node.inDegree) {
                startNode = node;
                break;
            }
        }
        if (!startNode) {
            for (const [id, node] of this.nodes) {
                if (node.outDegree > 0) {
                    startNode = node;
                    break;
                }
            }
        }

        if (!startNode) return;

        // Implementación del Algoritmo de Hierholzer (con backtracking en pila) para caminos/ciclos eulerianos
        const adj = new Map();
        for (const [id, node] of this.nodes) {
            adj.set(id, [...node.outEdges]);
        }

        const currPathNodes = [startNode.id];
        const currPathEdges = [null];
        const circuitNodes = [];
        const circuitEdges = [];

        while (currPathNodes.length > 0) {
            const u = currPathNodes[currPathNodes.length - 1];
            const edges = adj.get(u);
            if (edges && edges.length > 0) {
                const nextEdge = edges.shift();
                currPathNodes.push(nextEdge.to);
                currPathEdges.push(nextEdge);
            } else {
                circuitNodes.push(currPathNodes.pop());
                circuitEdges.push(currPathEdges.pop());
            }
        }

        circuitNodes.reverse();
        circuitEdges.reverse();

        let currSeq = circuitNodes[0];
        const initNodeDual = formatKmerDual(circuitNodes[0]);

        this.assemblySteps.push({
            step: 0,
            type: "init",
            nodeId: circuitNodes[0],
            edgeId: null,
            kmer: null,
            consensus: currSeq,
            desc: `🚀 <strong>Inicio del Ensamble:</strong> Partimos del nodo prefijo inicial <code>${initNodeDual.full}</code>.`
        });

        for (let i = 1; i < circuitEdges.length; i++) {
            const edge = circuitEdges[i];
            const nextNodeId = circuitNodes[i];
            if (!edge) continue;

            const addedChar = edge.label.charAt(this.k - 1);
            currSeq += addedChar;

            const dualEdge = formatKmerDual(edge.label);
            const dualNode = formatKmerDual(nextNodeId);

            this.assemblySteps.push({
                step: i,
                type: "walk",
                nodeId: nextNodeId,
                edgeId: edge.id,
                kmer: edge.label,
                consensus: currSeq,
                desc: `⚡ <strong>Paso ${i}:</strong> Recorremos la arista <code>${dualEdge.full}</code> hacia el nodo <code>${dualNode.full}</code>. Añadimos la base/bit <strong>${addedChar}</strong> al contig.`
            });
        }

        this.consensusSequence = currSeq;
        this.assemblySteps.push({
            step: circuitEdges.length,
            type: "done",
            nodeId: circuitNodes[circuitNodes.length - 1],
            edgeId: null,
            kmer: null,
            consensus: currSeq,
            desc: `🏆 <strong>¡Ensamble Completado!</strong> Se ha recorrido el grafo euleriano uniendo todas las superposiciones (${circuitEdges.length - 1} aristas en total). Secuencia Consenso Resultante: <code>${currSeq}</code>.`
        });
    }

    // 4. Renderizado SVG del Gráfico de De Bruijn
    renderGraphSVG(containerId, activeStepIdx = -1) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const width = this.svgWidth || 700;
        const height = this.svgHeight || 400;

        let svgHtml = `<svg width="100%" height="100%" viewBox="0 0 ${width} ${height}" style="background: rgba(10, 14, 23, 0.6); border-radius: 12px; overflow: visible;">
            <defs>
                <marker id="arrow-default" viewBox="0 0 10 10" refX="22" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#4361ee" />
                </marker>
                <marker id="arrow-active" viewBox="0 0 10 10" refX="22" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#00ffcc" />
                </marker>
                <marker id="arrow-visited" viewBox="0 0 10 10" refX="22" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#39ff14" />
                </marker>
            </defs>`;

        const activeStep = this.assemblySteps[activeStepIdx] || null;
        const visitedEdgeIds = new Set();
        if (activeStepIdx >= 0) {
            for (let i = 0; i <= activeStepIdx; i++) {
                if (this.assemblySteps[i] && this.assemblySteps[i].edgeId) {
                    visitedEdgeIds.add(this.assemblySteps[i].edgeId);
                }
            }
        }

        this.edges.forEach(edge => {
            const nFrom = this.nodes.get(edge.from);
            const nTo = this.nodes.get(edge.to);
            if (!nFrom || !nTo) return;

            const isCurrent = activeStep && activeStep.edgeId === edge.id;
            const isVisited = visitedEdgeIds.has(edge.id);

            let strokeColor = "#4361ee";
            let strokeWidth = 2;
            let marker = "url(#arrow-default)";
            if (isCurrent) {
                strokeColor = "#00ffcc";
                strokeWidth = 4;
                marker = "url(#arrow-active)";
            } else if (isVisited) {
                strokeColor = "#39ff14";
                strokeWidth = 2.5;
                marker = "url(#arrow-visited)";
            }

            const dualEdge = formatKmerDual(edge.label);
            const hasOpposite = this.edges.some(e => e.from === edge.to && e.to === edge.from && e.id !== edge.id);

            if (edge.from === edge.to) {
                const isBottom = nFrom.y > height / 2;
                const dy = isBottom ? 35 : -35;
                const dyText = isBottom ? 48 : -22;
                const yAnchor = isBottom ? nFrom.y + 15 : nFrom.y - 15;
                const cx = nFrom.x;
                const cy = nFrom.y + dy;
                svgHtml += `<path d="M ${nFrom.x-10} ${yAnchor} C ${cx-40} ${cy+dy}, ${cx+40} ${cy+dy}, ${nFrom.x+10} ${yAnchor}" 
                    fill="none" stroke="${strokeColor}" stroke-width="${strokeWidth}" marker-end="${marker}" />`;
                svgHtml += `<text x="${cx}" y="${nFrom.y + dyText}" fill="${strokeColor}" font-size="10.5" font-weight="bold" text-anchor="middle">${dualEdge.full}</text>`;
            } else if (hasOpposite) {
                const midX = (nFrom.x + nTo.x) / 2;
                const midY = (nFrom.y + nTo.y) / 2;
                const dx = nTo.x - nFrom.x;
                const dy = nTo.y - nFrom.y;
                const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                const nx = -dy / dist;
                const ny = dx / dist;
                const ctrlX = midX + nx * 38;
                const ctrlY = midY + ny * 38;
                svgHtml += `<path d="M ${nFrom.x} ${nFrom.y} Q ${ctrlX} ${ctrlY}, ${nTo.x} ${nTo.y}" 
                    fill="none" stroke="${strokeColor}" stroke-width="${strokeWidth}" marker-end="${marker}" />`;
                const labelX = (midX + ctrlX) / 2;
                const labelY = (midY + ctrlY) / 2;
                const textWidth = Math.max(45, dualEdge.full.length * 6.6);
                svgHtml += `<rect x="${labelX - textWidth/2}" y="${labelY - 8}" width="${textWidth}" height="16" rx="4" fill="rgba(10, 14, 23, 0.9)" />`;
                svgHtml += `<text x="${labelX}" y="${labelY + 3}" fill="${strokeColor}" font-size="10" font-weight="700" text-anchor="middle" font-family="monospace">${dualEdge.full}</text>`;
            } else {
                const midX = (nFrom.x + nTo.x) / 2;
                const midY = (nFrom.y + nTo.y) / 2 - 12;
                svgHtml += `<line x1="${nFrom.x}" y1="${nFrom.y}" x2="${nTo.x}" y2="${nTo.y}" 
                    stroke="${strokeColor}" stroke-width="${strokeWidth}" marker-end="${marker}" />`;
                const textWidth = Math.max(45, dualEdge.full.length * 6.6);
                svgHtml += `<rect x="${midX - textWidth/2}" y="${midY - 8}" width="${textWidth}" height="16" rx="4" fill="rgba(10, 14, 23, 0.88)" />`;
                svgHtml += `<text x="${midX}" y="${midY + 3}" fill="${strokeColor}" font-size="10" font-weight="700" text-anchor="middle" font-family="monospace">${dualEdge.full}</text>`;
            }
        });

        this.nodes.forEach(node => {
            const isCurrentNode = activeStep && activeStep.nodeId === node.id;
            let strokeNode = "#4361ee";
            let textColor = "#ffffff";
            let r = 26;

            if (isCurrentNode) {
                strokeNode = "#00ffcc";
                textColor = "#00ffcc";
                r = 29;
            }

            const dualNode = formatKmerDual(node.label);
            svgHtml += `<g class="debruijn-node" style="cursor: pointer;" title="Nodo: ${dualNode.full} (In: ${node.inDegree}, Out: ${node.outDegree})">
                <circle cx="${node.x}" cy="${node.y}" r="${r}" fill="#0f172a" stroke="${strokeNode}" stroke-width="3" style="filter: drop-shadow(0 0 8px rgba(67, 97, 238, 0.4));" />
                <text x="${node.x}" y="${node.y - 3}" fill="${textColor}" font-size="11.5" font-weight="800" text-anchor="middle" font-family="monospace">${dualNode.main}</text>
                <text x="${node.x}" y="${node.y + 11}" fill="#00ffcc" font-size="8.5" font-weight="700" text-anchor="middle" font-family="monospace" opacity="0.9">${dualNode.sub}</text>
            </g>`;
        });

        svgHtml += `</svg>`;
        container.innerHTML = svgHtml;
    }
}

// =========================================================================
// CLASE 2: VISUALIZADOR DEL DOGMA CENTRAL (ADN -> ARNm -> PROTEÍNA)
// =========================================================================
class CentralDogmaVisualizer {
    constructor() {
        this.dnaSeq = "ATGGTGCACCTGACTCCTGAGGAG";
        this.mrnaSeq = "";
        this.codons = [];
        this.peptides = [];
        this.currentStep = 0;
    }

    loadDNA(dnaText) {
        this.dnaSeq = dnaText.trim().toUpperCase().replace(/[^ATCG]/g, "");
        this.mrnaSeq = "";
        this.codons = [];
        this.peptides = [];
        this.currentStep = 0;

        this.mrnaSeq = this.dnaSeq.replace(/T/g, "U");

        for (let i = 0; i + 3 <= this.mrnaSeq.length; i += 3) {
            const codonStr = this.mrnaSeq.substring(i, i + 3);
            const aaInfo = CODON_TABLE[codonStr] || { aa: "???", name: "Desconocido", code: "?", type: "N/A" };
            this.codons.push({
                index: i / 3,
                codon: codonStr,
                dnaTriplet: this.dnaSeq.substring(i, i + 3),
                aaInfo: aaInfo
            });
            this.peptides.push(aaInfo);
        }
    }

    renderVisual(containerId, step = 0) {
        const container = document.getElementById(containerId);
        if (!container) return;
        this.currentStep = step;

        let html = `<div class="dogma-container" style="display: flex; flex-direction: column; gap: 1.5rem; padding: 1rem;">`;

        // NIVEL 1: HEBRA DE ADN
        html += `<div class="dogma-track">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                <span style="font-weight: 700; color: var(--accent-cyan); font-size: 0.95rem;">🧬 1. Hebra de ADN Codificante (Gen)</span>
                <span style="font-size: 0.8rem; color: var(--text-secondary);">Extremo 5' ➔ 3'</span>
            </div>
            <div style="display: flex; flex-wrap: wrap; gap: 0.4rem; background: rgba(0, 0, 0, 0.4); padding: 0.8rem; border-radius: 8px; border-left: 4px solid var(--accent-cyan);">`;
        
        this.codons.forEach(c => {
            html += `<div class="codon-box" style="background: rgba(67, 97, 238, 0.2); border: 1px solid var(--accent-blue); padding: 0.4rem 0.6rem; border-radius: 6px; text-align: center; font-family: monospace; font-weight: 700; color: white;">
                ${c.dnaTriplet}
            </div>`;
        });
        html += `</div></div>`;

        // NIVEL 2: TRANSCRIPCIÓN (ARNm)
        const showMrna = (step >= 1);
        html += `<div class="dogma-track" style="opacity: ${showMrna ? "1" : "0.3"}; transition: all 0.5s;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                <span style="font-weight: 700; color: var(--accent-yellow); font-size: 0.95rem;">📨 2. Transcripción (ARNm Mensajero)</span>
                <span style="font-size: 0.8rem; color: var(--text-secondary);">Traducción del código T ➔ U por ARN Polimerasa</span>
            </div>
            <div style="display: flex; flex-wrap: wrap; gap: 0.4rem; background: rgba(0, 0, 0, 0.4); padding: 0.8rem; border-radius: 8px; border-left: 4px solid var(--accent-yellow);">`;
        
        if (showMrna) {
            this.codons.forEach(c => {
                html += `<div class="codon-box" style="background: rgba(255, 190, 11, 0.15); border: 1px solid var(--accent-yellow); padding: 0.4rem 0.6rem; border-radius: 6px; text-align: center; font-family: monospace; font-weight: 700; color: var(--accent-yellow);">
                    ${c.codon}
                </div>`;
            });
        } else {
            html += `<div style="color: var(--text-secondary); font-size: 0.85rem; font-style: italic;">Presiona "Siguiente Paso" o "Reproducir" para transcribir el ADN en ARNm...</div>`;
        }
        html += `</div></div>`;

        // NIVEL 3: TRADUCCIÓN RIBOSOMAL
        const translatedCount = Math.max(0, step - 1);
        html += `<div class="dogma-track" style="opacity: ${translatedCount > 0 ? "1" : "0.3"}; transition: all 0.5s;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                <span style="font-weight: 700; color: var(--accent-green); font-size: 0.95rem;">🔬 3. Traducción Ribosomal (Cadena Peptídica de Aminoácidos)</span>
                <span style="font-size: 0.8rem; color: var(--text-secondary);">Síntesis en el Ribosoma (ARNt)</span>
            </div>
            <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; background: rgba(0, 0, 0, 0.4); padding: 1rem; border-radius: 8px; border-left: 4px solid var(--accent-green); min-height: 70px;">`;
        
        if (translatedCount > 0) {
            for (let i = 0; i < Math.min(translatedCount, this.codons.length); i++) {
                const c = this.codons[i];
                const isLatest = (i === translatedCount - 1);
                let badgeColor = "var(--accent-green)";
                if (c.aaInfo.start) badgeColor = "var(--accent-cyan)";
                if (c.aaInfo.stop) badgeColor = "var(--accent-red)";

                html += `<div class="peptide-bead ${isLatest ? 'bead-pop' : ''}" style="background: ${badgeColor}; color: #0a0e17; padding: 0.5rem 0.8rem; border-radius: 50px; font-weight: 800; font-size: 0.9rem; display: flex; align-items: center; gap: 0.4rem; box-shadow: 0 0 12px rgba(57, 255, 20, 0.4); cursor: pointer;" title="Codón: ${c.codon} -> ${c.aaInfo.name} (${c.aaInfo.type})">
                    <span>${c.aaInfo.code}</span>
                    <span style="font-size: 0.75rem; background: rgba(0,0,0,0.2); padding: 0.1rem 0.4rem; border-radius: 10px; color: white;">${c.aaInfo.aa}</span>
                </div>`;

                if (i < Math.min(translatedCount, this.codons.length) - 1) {
                    html += `<span style="color: var(--accent-green); font-weight: bold;">━</span>`;
                }
            }
        } else {
            html += `<div style="color: var(--text-secondary); font-size: 0.85rem; font-style: italic;">Esperando al ribosoma para traducir codones ARNm en aminoácidos...</div>`;
        }
        html += `</div></div>`;

        html += `</div>`;
        container.innerHTML = html;
    }
}

// Instancias globales para el Módulo 4
window.debruijnSim = new DeBruijnAssembler();
window.dogmaSim = new CentralDogmaVisualizer();
