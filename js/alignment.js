/**
 * alignment.js - Motor algorítmico y visual de Alineamiento de Secuencias
 * Implementa el algoritmo Global de Needleman-Wunsch con historial paso a paso
 * para uso pedagógico e inspección didáctica de fórmulas matemáticas.
 */

class AlignmentSimulator {
    constructor() {
        this.seq1 = "";
        this.seq2 = "";
        this.match = 5;
        this.mismatch = -2;
        this.gap = -2;

        // Estructuras de datos de la matriz
        this.scoreMatrix = [];
        this.dirMatrix = []; // Direcciones: 'D' (Diagonal), 'U' (Up), 'L' (Left)
        this.calcHistory = []; // Historial detallado de fórmulas para el inspector didáctico
        
        // Resultados
        this.maxScore = -Infinity;
        this.optimalPath = []; // Array de coordenadas [i, j] del camino óptimo
        this.alignedSeq1 = "";
        this.alignedSeq2 = "";
        this.alignmentSymbols = "";

        // Control de animación
        this.animTimer = null;
        this.isPlaying = false;
        this.animSpeed = 100; // ms por paso
    }

    /**
     * Inicializa y ejecuta el cálculo algorítmico de Needleman-Wunsch (Global)
     */
    compute(seq1, seq2, match, mismatch, gap) {
        this.seq1 = seq1.toUpperCase();
        this.seq2 = seq2.toUpperCase();
        this.match = Number(match);
        this.mismatch = Number(mismatch);
        this.gap = Number(gap);

        const rows = this.seq2.length + 1;
        const cols = this.seq1.length + 1;

        // Inicializar matrices
        this.scoreMatrix = Array(rows).fill(0).map(() => Array(cols).fill(0));
        this.dirMatrix = Array(rows).fill(null).map(() => Array(cols).fill([]));
        this.calcHistory = Array(rows).fill(null).map(() => Array(cols).fill(null));

        // 1. Condición inicial (Fila 0 y Columna 0 - Acumulación de Gaps)
        for (let j = 0; j < cols; j++) {
            this.scoreMatrix[0][j] = j * this.gap;
            this.dirMatrix[0][j] = j === 0 ? ['Z'] : ['L'];
            this.calcHistory[0][j] = {
                val: this.scoreMatrix[0][j],
                formula: j === 0 ? "Celda inicial de partida (0,0)" : `Brecha (Gap) acumulada horizontal: ${j} × (${this.gap}) = ${j * this.gap}`,
                chosen: j === 0 ? 'Z' : 'L',
                diagVal: null, upVal: null, leftVal: (j-1)*this.gap + this.gap
            };
        }

        for (let i = 0; i < rows; i++) {
            this.scoreMatrix[i][0] = i * this.gap;
            this.dirMatrix[i][0] = i === 0 ? ['Z'] : ['U'];
            this.calcHistory[i][0] = {
                val: this.scoreMatrix[i][0],
                formula: i === 0 ? "Celda inicial de partida (0,0)" : `Brecha (Gap) acumulada vertical: ${i} × (${this.gap}) = ${i * this.gap}`,
                chosen: i === 0 ? 'Z' : 'U',
                diagVal: null, upVal: (i-1)*this.gap + this.gap, leftVal: null
            };
        }

        // 2. Llenado dinámico de la matriz Needleman-Wunsch
        for (let i = 1; i < rows; i++) {
            for (let j = 1; j < cols; j++) {
                const char1 = this.seq1[j - 1];
                const char2 = this.seq2[i - 1];
                const isMatch = char1 === char2;
                const scoreDiag = this.scoreMatrix[i - 1][j - 1] + (isMatch ? this.match : this.mismatch);
                const scoreUp = this.scoreMatrix[i - 1][j] + this.gap;
                const scoreLeft = this.scoreMatrix[i][j - 1] + this.gap;

                const maxVal = Math.max(scoreDiag, scoreUp, scoreLeft);
                this.scoreMatrix[i][j] = maxVal;

                // Determinar todas las direcciones que producen el valor máximo
                const dirs = [];
                if (maxVal === scoreDiag) dirs.push('D');
                if (maxVal === scoreUp) dirs.push('U');
                if (maxVal === scoreLeft) dirs.push('L');

                this.dirMatrix[i][j] = dirs;

                // Guardar historial detallado para la Pizarra Didáctica
                this.calcHistory[i][j] = {
                    val: maxVal,
                    isMatch: isMatch,
                    char1: char1,
                    char2: char2,
                    diagVal: scoreDiag,
                    upVal: scoreUp,
                    leftVal: scoreLeft,
                    dirs: dirs,
                    formula: this.getExplanationText(i, j, char1, char2, isMatch, scoreDiag, scoreUp, scoreLeft, maxVal)
                };
            }
        }

        this.maxScore = this.scoreMatrix[rows - 1][cols - 1];

        // 3. Ejecutar Traceback (Obtener camino óptimo y alineamiento)
        this.performTraceback();
    }

    getExplanationText(i, j, char1, char2, isMatch, diag, up, left, maxVal) {
        let text = `Comparando base columna [${char1}] con fila [${char2}]:\n\n`;
        text += `• ↖ Diagonal: ${this.scoreMatrix[i-1][j-1]} + (${isMatch ? `Match +${this.match}` : `Mismatch ${this.mismatch}`}) = ${diag}\n`;
        text += `• ↑ Arriba (Gap en Columna): ${this.scoreMatrix[i-1][j]} + (Gap ${this.gap}) = ${up}\n`;
        text += `• ← Izquierda (Gap en Fila): ${this.scoreMatrix[i][j-1]} + (Gap ${this.gap}) = ${left}\n\n`;
        text += `🎯 Valor Máximo Elegido para la celda: ${maxVal}`;
        return text;
    }

    /**
     * Reconstruye el alineamiento óptimo desde la celda final (rows-1, cols-1) hasta (0,0)
     */
    performTraceback() {
        this.optimalPath = [];
        let align1 = [];
        let align2 = [];
        let symbols = [];

        let i = this.scoreMatrix.length - 1;
        let j = this.scoreMatrix[0].length - 1;

        this.optimalPath.push([i, j]);

        while (i > 0 || j > 0) {
            const dirs = this.dirMatrix[i][j];
            if (!dirs || dirs.length === 0) break;

            const dir = dirs[0]; // Elegir la primera dirección óptima

            if (dir === 'D') {
                align1.unshift(this.seq1[j - 1]);
                align2.unshift(this.seq2[i - 1]);
                symbols.unshift(this.seq1[j - 1] === this.seq2[i - 1] ? '|' : '.');
                i--; j--;
            } else if (dir === 'U') {
                align1.unshift('-');
                align2.unshift(this.seq2[i - 1]);
                symbols.unshift(' ');
                i--;
            } else if (dir === 'L') {
                align1.unshift(this.seq1[j - 1]);
                align2.unshift('-');
                symbols.unshift(' ');
                j--;
            } else {
                break;
            }
            this.optimalPath.push([i, j]);
        }

        this.alignedSeq1 = align1.join('');
        this.alignedSeq2 = align2.join('');
        this.alignmentSymbols = symbols.join('');
    }

    /**
     * Verifica si una celda (i, j) pertenece al camino óptimo
     */
    isInOptimalPath(i, j) {
        return this.optimalPath.some(coord => coord[0] === i && coord[1] === j);
    }
}

// Exportar al ámbito global
window.AlignmentSimulator = AlignmentSimulator;
