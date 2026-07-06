/**
 * phylogeny.js - Motor Didáctico de Filogenia (UPGMA & Conexión con Alineamiento Needleman-Wunsch)
 * Víctor Simulador - Suite Bioinformática Educativa
 *
 * Este módulo implementa:
 * 1. Conexión integrada con Módulo 1: Ejecuta alineamientos Needleman-Wunsch por pares para generar matrices de distancia.
 * 2. Algoritmo UPGMA (Unweighted Pair Group Method with Arithmetic Mean) con historial paso a paso para reproducción pedagógica.
 * 3. Cálculo de fórmulas y desglose didáctico de promedios aritméticos ancestrales para la Pizarra Didáctica.
 * 4. Generación de coordenadas y layout de Dendrograma evolutivo para renderizado en Canvas HTML5.
 */

class PhylogenySimulator {
    constructor() {
        this.species = [];
        this.initialMatrix = [];
        this.history = [];
        this.treeRoot = null;
        this.currentStep = 0;
        this.isPlaying = false;
        this.animTimer = null;
        this.inChallengeMode = false;
        this.challengeTargetPair = null;
    }

    /**
     * Carga un conjunto de especies evolutivas
     * @param {Array} speciesList Arreglo de objetos { name, seq }
     */
    loadSpecies(speciesList) {
        this.species = speciesList.map(s => ({
            name: s.name.trim(),
            seq: s.seq.replace(/[^A-Z]/gi, '').toUpperCase()
        }));
    }

    /**
     * CONEXIÓN MÓDULO 1 ➔ MÓDULO 2:
     * Ejecuta alineamientos Needleman-Wunsch globales entre todas las parejas de especies (i, j)
     * para calcular la distancia filogenética D(i, j) = 1 - (coincidencias / longitud_alineada).
     */
    computePairwiseDistances(matchScore = 5, mismatchScore = -2, gapScore = -2) {
        const n = this.species.length;
        const matrix = Array(n).fill(null).map(() => Array(n).fill(0));
        const alignDetails = {};

        // Instancia del motor de alineamiento del Módulo 1
        const aligner = new window.AlignmentSimulator();

        for (let i = 0; i < n; i++) {
            for (let j = i; j < n; j++) {
                if (i === j) {
                    matrix[i][j] = 0;
                } else {
                    aligner.compute(this.species[i].seq, this.species[j].seq, matchScore, mismatchScore, gapScore);
                    
                    const s1Len = aligner.alignedSeq1.length;
                    let matches = 0;
                    for (let k = 0; k < s1Len; k++) {
                        if (aligner.alignedSeq1[k] === aligner.alignedSeq2[k] && aligner.alignedSeq1[k] !== '-') {
                            matches++;
                        }
                    }
                    
                    // Distancia proporcional (porcentaje de divergencia evolutiva)
                    const identity = s1Len > 0 ? (matches / s1Len) : 1;
                    const distance = parseFloat((1 - identity).toFixed(3));
                    
                    matrix[i][j] = distance;
                    matrix[j][i] = distance;
                    
                    alignDetails[`${i}-${j}`] = {
                        s1Name: this.species[i].name,
                        s2Name: this.species[j].name,
                        matches: matches,
                        totalLen: s1Len,
                        identityPct: (identity * 100).toFixed(1),
                        distVal: distance,
                        score: aligner.maxScore
                    };
                }
            }
        }

        this.initialMatrix = matrix;
        this.alignDetails = alignDetails;
        return matrix;
    }

    /**
     * ALGORITMO UPGMA (Unweighted Pair Group Method with Arithmetic Mean)
     * Construye el árbol jerárquico y almacena cada paso del agrupamiento para la reproducción didáctica.
     */
    runUPGMA() {
        this.history = [];
        const n = this.species.length;
        if (n === 0) return;

        // Paso 0: Estado inicial con N clusters hoja
        let activeClusters = this.species.map((s, idx) => ({
            id: `leaf_${idx}`,
            name: s.name,
            leafCount: 1,
            height: 0,
            left: null,
            right: null,
            isLeaf: true,
            origIdx: idx,
            stepCreated: 0
        }));

        let distMatrix = this.initialMatrix.map(row => [...row]);

        // Registrar el paso inicial en el historial didáctico
        this.history.push({
            step: 0,
            title: "Paso 0: Matriz de Distancia Inicial (Alineamiento por Pares)",
            clusters: activeClusters.map(c => ({ ...c })),
            matrix: distMatrix.map(row => [...row]),
            minPair: this.findMinDistancePair(distMatrix),
            explanation: `Hemos ejecutado (${n * (n - 1)} / 2) alineamientos Needleman-Wunsch entre todas las especies. Cada número en la tabla representa la Distancia Evolutiva (porcentaje de divergencia mutacional). En el Paso 0, buscamos el valor más pequeño en la tabla para unir a los dos parientes más cercanos.`,
            cellFormulas: this.generateInitialCellFormulas(activeClusters, distMatrix)
        });

        let stepNum = 1;
        while (activeClusters.length > 1) {
            // 1. Encontrar la pareja (i, j) con la mínima distancia
            const minPair = this.findMinDistancePair(distMatrix);
            const { i, j, dist } = minPair;

            const clusterA = activeClusters[i];
            const clusterB = activeClusters[j];

            // 2. Crear el nuevo nodo ancestro (agrupamiento)
            const newHeight = parseFloat((dist / 2).toFixed(3));
            const newClusterName = `(${clusterA.name}, ${clusterB.name})`;
            const newCluster = {
                id: `node_${stepNum}`,
                name: newClusterName,
                leafCount: clusterA.leafCount + clusterB.leafCount,
                height: newHeight,
                left: clusterA,
                right: clusterB,
                isLeaf: false,
                mergedDist: dist,
                stepCreated: stepNum
            };

            // 3. Calcular nueva fila/columna de distancias por promedio aritmético UPGMA
            const nextMatrix = [];
            const nextClusters = [];
            const cellFormulas = {};

            // Añadir el nuevo cluster fusionado en la posición 0 de la nueva lista
            nextClusters.push(newCluster);

            // Mantener los clusters que no fueron fusionados
            const remainingIndices = [];
            for (let k = 0; k < activeClusters.length; k++) {
                if (k !== i && k !== j) {
                    remainingIndices.push(k);
                    nextClusters.push(activeClusters[k]);
                }
            }

            const mSize = nextClusters.length;
            for (let r = 0; r < mSize; r++) {
                nextMatrix.push(Array(mSize).fill(0));
            }

            // Calcular distancias entre el NUEVO cluster U y cada cluster restante K
            for (let idx = 0; idx < remainingIndices.length; idx++) {
                const k = remainingIndices[idx];
                const cluK = activeClusters[k];
                const dAK = distMatrix[i][k];
                const dBK = distMatrix[j][k];

                // Fórmula UPGMA: Promedio aritmético ponderado por número de hojas
                const countA = clusterA.leafCount;
                const countB = clusterB.leafCount;
                const dUK = parseFloat(((countA * dAK + countB * dBK) / (countA + countB)).toFixed(3));

                // En nextMatrix, el nuevo cluster está en el índice 0, los restantes en idx + 1
                const nextKIdx = idx + 1;
                nextMatrix[0][nextKIdx] = dUK;
                nextMatrix[nextKIdx][0] = dUK;

                // Guardar explicación matemática para la Pizarra Didáctica
                const formulaText = `Fórmula de Promedio Aritmético UPGMA:\n` +
                    `Distancia(${newCluster.name} ➔ ${cluK.name}) = [ |${clusterA.name}|·d(A,K) + |${clusterB.name}|·d(B,K) ] / [ |A| + |B| ]\n` +
                    `= [ (${countA} · ${dAK}) + (${countB} · ${dBK}) ] / (${countA} + ${countB})\n` +
                    `= [ ${(countA * dAK).toFixed(3)} + ${(countB * dBK).toFixed(3)} ] / ${countA + countB} = ${dUK}`;

                cellFormulas[`0-${nextKIdx}`] = {
                    title: `Cálculo de Distancia Ancestral (Paso ${stepNum})`,
                    val: dUK,
                    formula: formulaText
                };
                cellFormulas[`${nextKIdx}-0`] = cellFormulas[`0-${nextKIdx}`];
            }

            // Copiar las distancias entre los clusters que ya existían y no cambiaron
            for (let idx1 = 0; idx1 < remainingIndices.length; idx1++) {
                for (let idx2 = idx1 + 1; idx2 < remainingIndices.length; idx2++) {
                    const k1 = remainingIndices[idx1];
                    const k2 = remainingIndices[idx2];
                    const val = distMatrix[k1][k2];
                    const n1 = idx1 + 1;
                    const n2 = idx2 + 1;
                    nextMatrix[n1][n2] = val;
                    nextMatrix[n2][n1] = val;

                    cellFormulas[`${n1}-${n2}`] = {
                        title: `Distancia Conservada (Sin cambios)`,
                        val: val,
                        formula: `Esta distancia entre "${activeClusters[k1].name}" y "${activeClusters[k2].name}" se calculó previamente y no cambia en este paso.`
                    };
                    cellFormulas[`${n2}-${n1}`] = cellFormulas[`${n1}-${n2}`];
                }
            }

            // Actualizar referencias de iteración
            activeClusters = nextClusters;
            distMatrix = nextMatrix;

            // Registrar este paso en el historial
            this.history.push({
                step: stepNum,
                title: `Paso ${stepNum}: Fusión de "${clusterA.name}" y "${clusterB.name}"`,
                clusters: activeClusters.map(c => ({ ...c })),
                matrix: distMatrix.map(row => [...row]),
                minPair: activeClusters.length > 1 ? this.findMinDistancePair(distMatrix) : null,
                mergedPair: { aName: clusterA.name, bName: clusterB.name, dist: dist, height: newHeight },
                explanation: `Hemos agrupado a "${clusterA.name}" y "${clusterB.name}" porque tenían la mínima distancia en la tabla (${dist}). Creando el nodo ancestral con altura ${newHeight}. Luego recalculamos la matriz reducida promediando las distancias contra las demás especies.`,
                cellFormulas: cellFormulas
            });

            stepNum++;
        }

        this.treeRoot = activeClusters[0];
        this.currentStep = this.history.length - 1;
        return this.treeRoot;
    }

    /**
     * Busca la pareja con la distancia mínima en la matriz actual
     */
    findMinDistancePair(matrix) {
        let minVal = Infinity;
        let minI = -1;
        let minJ = -1;
        const size = matrix.length;

        for (let i = 0; i < size; i++) {
            for (let j = i + 1; j < size; j++) {
                if (matrix[i][j] < minVal) {
                    minVal = matrix[i][j];
                    minI = i;
                    minJ = j;
                }
            }
        }
        return { i: minI, j: minJ, dist: minVal };
    }

    /**
     * Genera las fórmulas didácticas iniciales del paso 0
     */
    generateInitialCellFormulas(clusters, matrix) {
        const formulas = {};
        const size = clusters.length;

        for (let i = 0; i < size; i++) {
            for (let j = 0; j < size; j++) {
                if (i === j) {
                    formulas[`${i}-${j}`] = {
                        title: `Distancia Identidad (${clusters[i].name})`,
                        val: 0,
                        formula: `La distancia evolutiva de una especie consigo misma es exactamente 0.000 (0% de divergencia).`
                    };
                } else {
                    const key = `${clusters[i].origIdx}-${clusters[j].origIdx}`;
                    const det = this.alignDetails[key] || { matches: 0, totalLen: 0, identityPct: 0, score: 0 };
                    const val = matrix[i][j];
                    
                    formulas[`${i}-${j}`] = {
                        title: `Distancia Needleman-Wunsch (${clusters[i].name} vs ${clusters[j].name})`,
                        val: val,
                        formula: `Conexión con Módulo 1 (Alineamiento Global Needleman-Wunsch):\n` +
                            `• Coincidencias (Matches): ${det.matches} aminoácidos/bases idénticas.\n` +
                            `• Longitud total alineada: ${det.totalLen} posiciones.\n` +
                            `• Porcentaje de Identidad: ${det.identityPct}%\n` +
                            `• Distancia Evolutiva D(i,j) = 1.000 - (${det.identityPct}/100) = ${val}\n` +
                            `• Puntaje Óptimo Needleman-Wunsch: ${det.score}`
                    };
                }
            }
        }
        return formulas;
    }

    /**
     * Genera las coordenadas X, Y para dibujar el Dendrograma en un Canvas HTML5
     * @param {Object} root Nodo raíz del árbol
     * @param {Number} width Ancho del lienzo en píxeles
     * @param {Number} height Alto del lienzo en píxeles
     */
    getTreeLayout(width, height) {
        if (!this.treeRoot) return { nodes: [], edges: [], maxH: 1 };

        const nodes = [];
        const edges = [];
        const leaves = [];

        // 1. Recorrer árbol para recolectar hojas en orden
        function collectLeaves(node) {
            if (node.isLeaf) {
                leaves.push(node);
            } else {
                if (node.left) collectLeaves(node.left);
                if (node.right) collectLeaves(node.right);
            }
        }
        collectLeaves(this.treeRoot);

        const leafCount = leaves.length;
        const leafSpacing = (height - 80) / Math.max(1, leafCount - 1);
        const topMargin = 40;
        const leftMargin = 50;
        const rightMargin = width - 180;
        const drawWidth = rightMargin - leftMargin;

        // Altura máxima evolutiva del árbol
        const maxTreeHeight = this.treeRoot.height || 1;

        // 2. Asignar coordenadas a cada nodo (Post-order traversal)
        function assignCoords(node) {
            if (node.isLeaf) {
                const idx = leaves.indexOf(node);
                node.y = topMargin + idx * leafSpacing;
                // En dendrogramas UPGMA, las hojas están en el extremo derecho (tiempo actual)
                node.x = rightMargin;
                nodes.push({
                    id: node.id,
                    name: node.name,
                    x: node.x,
                    y: node.y,
                    height: node.height,
                    isLeaf: true,
                    stepCreated: 0
                });
                return node.y;
            } else {
                const leftY = assignCoords(node.left);
                const rightY = assignCoords(node.right);
                node.y = (leftY + rightY) / 2;
                
                // La coordenada X depende de la altura evolutiva ancestral (hacia la izquierda)
                const timeRatio = node.height / maxTreeHeight;
                node.x = rightMargin - (timeRatio * drawWidth);
                const stepCreated = node.stepCreated || parseInt(node.id.split("_")[1] || 0);

                nodes.push({
                    id: node.id,
                    name: node.name,
                    x: node.x,
                    y: node.y,
                    height: node.height,
                    isLeaf: false,
                    leftName: node.left.name,
                    rightName: node.right.name,
                    stepCreated: stepCreated
                });

                // Crear líneas de conexión (aristas) con estilo rectilíneo dendrograma
                edges.push({
                    fromX: node.x,
                    fromY: node.y,
                    toX: node.left.x,
                    toY: node.left.y,
                    type: 'parent-to-left',
                    stepCreated: stepCreated
                });
                edges.push({
                    fromX: node.x,
                    fromY: node.y,
                    toX: node.right.x,
                    toY: node.right.y,
                    type: 'parent-to-right',
                    stepCreated: stepCreated
                });

                return node.y;
            }
        }

        assignCoords(this.treeRoot);
        return { nodes, edges, maxH: maxTreeHeight, leftMargin, rightMargin };
    }
}

// Exportar al ámbito global
window.PhylogenySimulator = PhylogenySimulator;
