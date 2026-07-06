/**
 * app.js - Controlador Principal de la Interfaz y Módulos de Víctor Simulador
 * Gestiona navegación, presets, visualización responsiva, Pizarra Didáctica de altura constante blindada (310px),
 * reproductor paso a paso con cálculo en tiempo real (celdas ocultas revelándose), inspección por CLIC (no hover),
 * y Modo Desafío Traceback secuencial con soporte de empates.
 */

document.addEventListener("DOMContentLoaded", () => {
    // Inicializar el motor de alineamiento Needleman-Wunsch
    const sim = new AlignmentSimulator();
    sim.inChallengeMode = false;
    sim.challengeCurrent = null;
    
    // Referencias DOM - Navegación
    const navButtons = document.querySelectorAll(".nav-tab");
    const tabContents = document.querySelectorAll(".tab-content");

    // Referencias DOM - Módulo de Alineamiento
    const presetSelect = document.getElementById("preset-select");
    const seq1Input = document.getElementById("seq1-input");
    const seq2Input = document.getElementById("seq2-input");
    const editNotice = document.getElementById("edit-notice");
    const matchInput = document.getElementById("match-score");
    const mismatchInput = document.getElementById("mismatch-score");
    const gapInput = document.getElementById("gap-score");
    
    // Sliders displays
    const matchValDisplay = document.getElementById("match-val");
    const mismatchValDisplay = document.getElementById("mismatch-val");
    const gapValDisplay = document.getElementById("gap-val");

    // Botones y controles de acción / reproducción
    const btnCalculate = document.getElementById("btn-calculate");
    const btnPlay = document.getElementById("btn-play");
    const playerControls = document.getElementById("player-controls");
    const btnStepNext = document.getElementById("btn-step-next");
    const btnStepRow = document.getElementById("btn-step-row");
    const animSpeedSelect = document.getElementById("anim-speed");
    const playerStatus = document.getElementById("player-status");
    const btnChallenge = document.getElementById("btn-challenge");
    const viewModeSelect = document.getElementById("view-mode-select");

    // Contenedores de resultados
    const resultsArea = document.getElementById("results-area");
    const statsContainer = document.getElementById("stats-container");
    const alignmentVisual = document.getElementById("alignment-visual");
    const matrixContainer = document.getElementById("matrix-container");
    const heatmapCanvas = document.getElementById("heatmap-canvas");
    const chalkboardContent = document.getElementById("chalkboard-content");

    // --- 1. GESTIÓN DE PESTAÑAS (NAVEGACIÓN) ---
    navButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            navButtons.forEach(b => b.classList.remove("active"));
            tabContents.forEach(c => c.classList.remove("active"));

            btn.classList.add("active");
            const targetId = btn.getAttribute("data-target");
            const targetSection = document.getElementById(targetId);
            if (targetSection) {
                targetSection.classList.add("active");
            }
        });
    });

    // --- 2. GESTIÓN DE PRESETS DIDÁCTICOS (SOLO LECTURA VS EDICIÓN) ---
    function loadPreset(key) {
        if (!PRESETS[key]) return;
        const p = PRESETS[key];
        seq1Input.value = p.seq1;
        seq2Input.value = p.seq2;
        
        if (p.type !== "custom") {
            seq1Input.readOnly = true;
            seq2Input.readOnly = true;
            seq1Input.classList.add("readonly-box");
            seq2Input.classList.add("readonly-box");
            if (editNotice) {
                editNotice.innerHTML = `🔒 <strong>Modo Lectura:</strong> Estas secuencias de estudio están bloqueadas para evitar modificaciones accidentales. Para escribir tus propias secuencias, selecciona <strong>"✏️ Secuencia Personalizada"</strong> en el menú superior.`;
                editNotice.className = "notice-box notice-locked";
            }
            matchInput.value = p.match;
            mismatchInput.value = p.mismatch;
            gapInput.value = p.gap;
            updateSliderDisplays();
        } else {
            seq1Input.readOnly = false;
            seq2Input.readOnly = false;
            seq1Input.classList.remove("readonly-box");
            seq2Input.classList.remove("readonly-box");
            if (editNotice) {
                editNotice.innerHTML = `✏️ <strong>Modo Edición Libre:</strong> Ahora puedes escribir, pegar o modificar directamente tus secuencias en las cajas de texto de abajo.`;
                editNotice.className = "notice-box notice-editable";
            }
        }
    }

    if (presetSelect) {
        presetSelect.innerHTML = "";
        Object.keys(PRESETS).forEach(key => {
            const opt = document.createElement("option");
            opt.value = key;
            opt.textContent = PRESETS[key].name;
            presetSelect.appendChild(opt);
        });

        presetSelect.addEventListener("change", (e) => {
            loadPreset(e.target.value);
            clearAndHideResults(); // No auto-calcular, obligar a pulsar Calcular Alineamiento
        });

        loadPreset("short_dna");
    }

    // --- 3. ACTUALIZACIÓN DE SLIDERS Y LIMPIEZA AUTOMÁTICA ---
    function updateSliderDisplays() {
        if (matchValDisplay) matchValDisplay.textContent = `+${matchInput.value}`;
        if (mismatchValDisplay) mismatchValDisplay.textContent = mismatchInput.value;
        if (gapValDisplay) gapValDisplay.textContent = gapInput.value;
    }

    function clearAndHideResults() {
        stopStepAnimation();
        sim.inChallengeMode = false;
        sim.challengeCurrent = null;
        if (btnChallenge) {
            btnChallenge.innerHTML = "🎯 Modo Desafío Traceback";
            btnChallenge.style.background = "";
        }
        if (resultsArea) resultsArea.classList.add("hidden");
        if (playerControls) playerControls.classList.add("hidden");
    }

    [matchInput, mismatchInput, gapInput].forEach(slider => {
        if (slider) {
            slider.addEventListener("input", () => {
                updateSliderDisplays();
                clearAndHideResults(); // Oculta resultados al mover sliders
            });
        }
    });

    if (viewModeSelect) {
        viewModeSelect.addEventListener("change", () => {
            if (!sim.isPlaying && !resultsArea.classList.contains("hidden")) {
                renderMatrixOrHeatmap();
            }
        });
    }

    // --- 4. EJECUCIÓN DEL ALGORITMO ---
    function runSimulation() {
        stopStepAnimation();
        sim.inChallengeMode = false;
        sim.challengeCurrent = null;
        if (btnChallenge) {
            btnChallenge.innerHTML = "🎯 Modo Desafío Traceback";
            btnChallenge.style.background = "";
        }
        if (playerControls) playerControls.classList.add("hidden");

        const s1 = cleanFasta(seq1Input.value);
        const s2 = cleanFasta(seq2Input.value);
        
        // VALIDACIÓN DE FASTA VACÍA (Sin letras "A" por defecto)
        if (!s1 || !s2 || s1.length === 0 || s2.length === 0) {
            alert("⚠️ ¡Atención! Por favor ingresa al menos un símbolo o aminoácido válido en ambas cajas de texto (Secuencia 1 y Secuencia 2) antes de calcular el alineamiento.");
            if (resultsArea) resultsArea.classList.add("hidden");
            return;
        }

        sim.compute(
            s1, 
            s2, 
            matchInput.value, 
            mismatchInput.value, 
            gapInput.value
        );

        resultsArea.classList.remove("hidden");
        renderStats();
        renderAlignmentVisual();
        renderMatrixOrHeatmap();
        updateChalkboard(sim.scoreMatrix.length - 1, sim.scoreMatrix[0].length - 1, false);
    }

    if (btnCalculate) btnCalculate.addEventListener("click", runSimulation);

    [seq1Input, seq2Input].forEach(input => {
        if (input) {
            input.addEventListener("input", () => {
                if (!input.readOnly) clearAndHideResults(); // Oculta resultados si escriben nueva secuencia
            });
        }
    });

    // --- 5. RENDERIZADO DE ESTADÍSTICAS Y ALINEAMIENTO ---
    function renderStats() {
        if (!statsContainer) return;
        const s1Len = sim.alignedSeq1.length;
        let matches = 0;
        let mismatches = 0;
        let gaps = 0;
        
        for (let i = 0; i < s1Len; i++) {
            if (sim.alignedSeq1[i] === '-' || sim.alignedSeq2[i] === '-') {
                gaps++;
            } else if (sim.alignedSeq1[i] === sim.alignedSeq2[i]) {
                matches++;
            } else {
                mismatches++;
            }
        }
        const identity = s1Len > 0 ? ((matches / s1Len) * 100).toFixed(1) : 0;

        statsContainer.innerHTML = `
            <div class="stat-box">
                <span class="stat-label">Puntaje Global</span>
                <span class="stat-value highlight-score">${sim.maxScore}</span>
            </div>
            <div class="stat-box">
                <span class="stat-label">Identidad</span>
                <span class="stat-value">${identity}%</span>
            </div>
            <div class="stat-box">
                <span class="stat-label">Coincidencias (Matches)</span>
                <span class="stat-value text-green">${matches}</span>
            </div>
            <div class="stat-box">
                <span class="stat-label">Diferencias (Mismatches)</span>
                <span class="stat-value text-yellow">${mismatches}</span>
            </div>
            <div class="stat-box">
                <span class="stat-label">Brechas (Gaps)</span>
                <span class="stat-value text-red">${gaps}</span>
            </div>
        `;
    }

    function renderAlignmentVisual() {
        if (!alignmentVisual) return;
        
        const blockSize = 20;
        const s1 = sim.alignedSeq1;
        const s2 = sim.alignedSeq2;
        const sym = sim.alignmentSymbols;

        let html = `<div class="alignment-legend">
                        <span><strong class="char-box char-match" style="width:20px;height:20px;display:inline-flex;">A</strong> Coincidencia (Match)</span>
                        <span><strong class="char-box char-mismatch" style="width:20px;height:20px;display:inline-flex;">X</strong> Diferencia (Mismatch)</span>
                        <span><strong class="char-box char-gap" style="width:20px;height:20px;display:inline-flex;">-</strong> Brecha (Gap)</span>
                    </div>`;
        html += `<div class="alignment-track">`;

        for (let i = 0; i < s1.length; i += blockSize) {
            const sub1 = s1.slice(i, i + blockSize);
            const sub2 = s2.slice(i, i + blockSize);
            const subSym = sym.slice(i, i + blockSize);

            html += `<div class="alignment-block">`;
            
            html += `<div class="seq-row"><span class="seq-hdr">Sec 1 (${i+1}-${Math.min(s1.length, i+blockSize)}):</span><div class="chars-container">`;
            for (let c = 0; c < sub1.length; c++) {
                const char = sub1[c];
                const cls = char === '-' ? 'char-gap' : (subSym[c] === '|' ? 'char-match' : 'char-mismatch');
                html += `<span class="char-box ${cls}" title="Posición ${i+c+1}: ${char}">${char}</span>`;
            }
            html += `</div></div>`;

            html += `<div class="sym-row"><span class="seq-hdr"></span><div class="chars-container">`;
            for (let c = 0; c < subSym.length; c++) {
                const char1 = sub1[c];
                const char2 = sub2[c];
                let symChar = '&nbsp;';
                let symCls = '';
                if (char1 === '-' || char2 === '-') {
                    symChar = ' ';
                } else if (char1 === char2) {
                    symChar = '|';
                    symCls = 'sym-match';
                } else {
                    symChar = '•';
                    symCls = 'sym-mismatch';
                }
                html += `<span class="sym-box ${symCls}">${symChar}</span>`;
            }
            html += `</div></div>`;

            html += `<div class="seq-row"><span class="seq-hdr">Sec 2 (${i+1}-${Math.min(s2.length, i+blockSize)}):</span><div class="chars-container">`;
            for (let c = 0; c < sub2.length; c++) {
                const char = sub2[c];
                const cls = char === '-' ? 'char-gap' : (subSym[c] === '|' ? 'char-match' : 'char-mismatch');
                html += `<span class="char-box ${cls}" title="Posición ${i+c+1}: ${char}">${char}</span>`;
            }
            html += `</div></div>`;

            html += `</div>`;
        }
        html += `</div>`;
        alignmentVisual.innerHTML = html;
    }

    // --- 6. RENDERIZADO DE MATRIZ O MAPA DE CALOR ---
    function renderMatrixOrHeatmap() {
        const rows = sim.scoreMatrix.length;
        const cols = sim.scoreMatrix[0].length;
        const isMacro = (rows > 35 || cols > 35) || (viewModeSelect && viewModeSelect.value === "macro");

        if (isMacro && (!viewModeSelect || viewModeSelect.value !== "micro")) {
            if (matrixContainer) matrixContainer.classList.add("hidden");
            if (heatmapCanvas) {
                heatmapCanvas.classList.remove("hidden");
                drawHeatmap();
            }
        } else {
            if (heatmapCanvas) heatmapCanvas.classList.add("hidden");
            if (matrixContainer) {
                matrixContainer.classList.remove("hidden");
                drawInteractiveTable();
            }
        }
    }

    /**
     * ARQUITECTURA DE MATRIZ SEPARADA:
     * Separa físicamente los aminoácidos en contenedores externos (Top y Left Viewports)
     * sincronizados con el scroll de la tabla numérica interna (Data Viewport).
     */
    function drawInteractiveTable() {
        if (!matrixContainer) return;
        const rows = sim.scoreMatrix.length;
        const cols = sim.scoreMatrix[0].length;

        // 1. Encabezado superior (Secuencia 1)
        let topHeadersHtml = `<div class="header-cell" title="Brecha (Gap) inicial">-</div>`;
        for (let j = 1; j < cols; j++) {
            topHeadersHtml += `<div class="header-cell" title="Columna ${j}: ${sim.seq1[j - 1]}">${sim.seq1[j - 1]}</div>`;
        }

        // 2. Encabezado izquierdo (Secuencia 2)
        let leftHeadersHtml = `<div class="header-cell" title="Brecha (Gap) inicial">-</div>`;
        for (let i = 1; i < rows; i++) {
            leftHeadersHtml += `<div class="header-cell" title="Fila ${i}: ${sim.seq2[i - 1]}">${sim.seq2[i - 1]}</div>`;
        }

        // 3. Tabla de datos numéricos puros (sin cabeceras TH)
        let dataTableHtml = `<table class="score-data-table"><tbody>`;
        for (let i = 0; i < rows; i++) {
            dataTableHtml += `<tr>`;
            for (let j = 0; j < cols; j++) {
                const val = sim.scoreMatrix[i][j];
                const isOptimal = (!sim.inChallengeMode && sim.isInOptimalPath(i, j)) || (sim.inChallengeMode && sim.challengeCurrent && sim.challengeCurrent[0] === i && sim.challengeCurrent[1] === j);
                const cellClass = isOptimal ? 'cell-optimal' : '';
                dataTableHtml += `<td class="${cellClass}" data-row="${i}" data-col="${j}">
                                    <span class="val">${val}</span>
                                  </td>`;
            }
            dataTableHtml += `</tr>`;
        }
        dataTableHtml += `</tbody></table>`;

        // 4. Estructura Grid completa
        const fullLayout = `
            <div class="matrix-layout-container">
                <div class="matrix-corner" title="Secuencia 2 (Vertical) \\ Secuencia 1 (Horizontal)">S2\\S1</div>
                <div id="top-header-viewport" class="top-header-viewport">
                    <div class="top-header-content" style="width: ${cols * 38}px;">
                        ${topHeadersHtml}
                    </div>
                </div>
                <div id="left-header-viewport" class="left-header-viewport">
                    <div class="left-header-content" style="height: ${rows * 38}px;">
                        ${leftHeadersHtml}
                    </div>
                </div>
                <div id="data-viewport" class="data-viewport">
                    ${dataTableHtml}
                </div>
            </div>
        `;

        matrixContainer.innerHTML = fullLayout;

        // 5. SINCRONIZADOR DE SCROLL PERFECTO ENTRE VIEWPORTS
        const dataViewport = document.getElementById("data-viewport");
        const topViewport = document.getElementById("top-header-viewport");
        const leftViewport = document.getElementById("left-header-viewport");

        if (dataViewport && topViewport && leftViewport) {
            dataViewport.addEventListener("scroll", () => {
                topViewport.scrollLeft = dataViewport.scrollLeft;
                leftViewport.scrollTop = dataViewport.scrollTop;
            });
        }

        // 6. Agregar eventos de inspección (POR CLIC) y gamificación a las celdas numéricas
        const cells = matrixContainer.querySelectorAll("td");
        cells.forEach(cell => {
            // Mouseenter solo para efecto hover visual leve, SIN sobreescribir la Pizarra
            cell.addEventListener("mouseenter", () => {
                cells.forEach(td => td.classList.remove("cell-hover"));
                cell.classList.add("cell-hover");
            });

            // INSPECCIÓN Y MODO DESAFÍO POR CLIC DIRECTO
            cell.addEventListener("click", () => {
                const r = parseInt(cell.getAttribute("data-row"));
                const c = parseInt(cell.getAttribute("data-col"));

                // Si NO está en modo desafío, el clic inspecciona y fija la celda en la Pizarra
                if (!sim.inChallengeMode) {
                    cells.forEach(td => td.classList.remove("cell-selected"));
                    cell.classList.add("cell-selected");
                    updateChalkboard(r, c, false);
                    return;
                }

                // SI ESTÁ EN MODO DESAFÍO: LÓGICA SECUENCIAL REAL
                if (sim.inChallengeMode && sim.challengeCurrent) {
                    const [currR, currC] = sim.challengeCurrent;
                    
                    if (r === currR && c === currC) return; // Clic en la misma celda donde ya está

                    const validDirs = sim.dirMatrix[currR][currC] || [];
                    let isValid = false;

                    // Validar si la celda clickeada corresponde exactamente a una de las direcciones óptimas
                    if (validDirs.includes('D') && r === currR - 1 && c === currC - 1) isValid = true;
                    if (validDirs.includes('U') && r === currR - 1 && c === currC) isValid = true;
                    if (validDirs.includes('L') && r === currR && c === currC - 1) isValid = true;

                    if (isValid) {
                        cell.classList.add("cell-optimal");
                        sim.challengeCurrent = [r, c];
                        updateChalkboard(r, c, true); // Ocultar cartel óptimo en la pizarra para evitar spoilers
                        
                        // ¿Llegó a la celda origen o completó el camino?
                        if ((r === 0 && c === 0) || !sim.dirMatrix[r][c] || sim.dirMatrix[r][c].length === 0 || sim.dirMatrix[r][c][0] === 'Z') {
                            setTimeout(() => {
                                alert("🏆 ¡FELICIDADES! Has completado el Traceback con total precisión y sin errores. ¡Has demostrado dominar el algoritmo Needleman-Wunsch!");
                                sim.inChallengeMode = false;
                                if (btnChallenge) {
                                    btnChallenge.innerHTML = "🎯 Modo Desafío Traceback";
                                    btnChallenge.style.background = "";
                                }
                                drawInteractiveTable();
                            }, 100);
                        }
                    } else {
                        // Efecto visual de error
                        const origBg = cell.style.backgroundColor;
                        cell.style.backgroundColor = "rgba(255, 0, 84, 0.6)";
                        setTimeout(() => { cell.style.backgroundColor = origBg; }, 600);
                        
                        let dirNames = validDirs.map(d => d === 'D' ? 'Diagonal ↖️' : (d === 'U' ? 'Arriba ⬆️' : 'Izquierda ⬅️')).join(" o ");
                        alert(`❌ ¡Paso incorrecto en el Traceback!\n\nDesde la celda actual (${currR}, ${currC}), el puntaje máximo provino de la dirección: [ ${dirNames} ].\n\nDebes hacer clic en la celda adyacente correspondiente para continuar retrocediendo.`);
                    }
                }
            });
        });
    }

    function drawHeatmap() {
        if (!heatmapCanvas) return;
        const ctx = heatmapCanvas.getContext("2d");
        const rows = sim.scoreMatrix.length;
        const cols = sim.scoreMatrix[0].length;

        const cellW = Math.max(2, heatmapCanvas.width / cols);
        const cellH = Math.max(2, heatmapCanvas.height / rows);

        let min = Infinity, max = -Infinity;
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                if (sim.scoreMatrix[i][j] < min) min = sim.scoreMatrix[i][j];
                if (sim.scoreMatrix[i][j] > max) max = sim.scoreMatrix[i][j];
            }
        }
        const range = max - min || 1;

        ctx.clearRect(0, 0, heatmapCanvas.width, heatmapCanvas.height);

        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                const val = sim.scoreMatrix[i][j];
                const norm = (val - min) / range;
                const hue = 240 - (norm * 180);
                const lightness = 20 + (norm * 50);
                ctx.fillStyle = `hsl(${hue}, 80%, ${lightness}%)`;
                ctx.fillRect(j * cellW, i * cellH, cellW + 0.5, cellH + 0.5);
            }
        }

        ctx.strokeStyle = "#00ffcc";
        ctx.lineWidth = Math.max(2, cellW / 2);
        ctx.shadowColor = "#00ffcc";
        ctx.shadowBlur = 8;
        ctx.beginPath();
        sim.optimalPath.forEach((coord, idx) => {
            const x = (coord[1] + 0.5) * cellW;
            const y = (coord[0] + 0.5) * cellH;
            if (idx === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();
        ctx.shadowBlur = 0;
    }

    // --- 7. LA PIZARRA DIDÁCTICA (ALTURA Y TAMAÑO CONSTANTE BLINDADO) ---
    function updateChalkboard(i, j, hideOptimal = false) {
        if (!chalkboardContent || !sim.calcHistory[i] || !sim.calcHistory[i][j]) return;
        const h = sim.calcHistory[i][j];
        
        let html = `<div class="chalkboard-title">📍 Inspeccionando Celda (${i}, ${j})</div>`;
        html += `<div class="chalkboard-val">Puntaje Calculado: <strong class="text-glow">${h.val}</strong></div>`;
        html += `<div class="chalkboard-formula">${h.formula.replace(/\n/g, '<br>')}</div>`;
        
        if (!hideOptimal && sim.isInOptimalPath(i, j)) {
            html += `<div class="optimal-badge">✨ Esta celda forma parte del Camino Óptimo de Traceback</div>`;
        }
        
        chalkboardContent.innerHTML = html;
    }

    // --- 8. REPRODUCTOR PASO A PASO DIDÁCTICO (MANUAL + VELOCIDAD + VACIADO REAL) ---
    let animCells = [];
    let animIdx = 0;

    function stopStepAnimation() {
        if (sim.animTimer) clearInterval(sim.animTimer);
        sim.isPlaying = false;
        if (btnPlay) btnPlay.innerHTML = `<i class="icon">▶️</i> Reproducir Paso a Paso`;
        if (viewModeSelect) viewModeSelect.disabled = false;
        if (playerStatus) playerStatus.textContent = "Pausado / Detenido";
    }

    function finishStepAnimation() {
        stopStepAnimation();
        if (playerControls) playerControls.classList.add("hidden");
        
        animCells.forEach(td => {
            const r = parseInt(td.getAttribute("data-row"));
            const c = parseInt(td.getAttribute("data-col"));
            const valSpan = td.querySelector(".val");
            if (valSpan && sim.scoreMatrix[r] && sim.scoreMatrix[r][c] !== undefined) {
                valSpan.textContent = sim.scoreMatrix[r][c];
            }
            if (sim.isInOptimalPath(r, c)) td.classList.add("cell-optimal");
        });
        
        const lastTd = animCells[animCells.length - 1];
        if (lastTd) {
            const r = parseInt(lastTd.getAttribute("data-row"));
            const c = parseInt(lastTd.getAttribute("data-col"));
            updateChalkboard(r, c, false);
        }
    }

    function advanceStep(steps = 1) {
        if (animIdx >= animCells.length) {
            finishStepAnimation();
            return;
        }

        const dataViewport = document.getElementById("data-viewport");

        for (let s = 0; s < steps && animIdx < animCells.length; s++) {
            const td = animCells[animIdx];
            const r = parseInt(td.getAttribute("data-row"));
            const c = parseInt(td.getAttribute("data-col"));
            
            // REVELAR EL VALOR REAL DE LA CELDA EN TIEMPO REAL
            const valSpan = td.querySelector(".val");
            if (valSpan && sim.scoreMatrix[r] && sim.scoreMatrix[r][c] !== undefined) {
                valSpan.textContent = sim.scoreMatrix[r][c];
            }

            animCells.forEach(t => t.classList.remove("cell-hover", "cell-selected"));
            td.classList.add("cell-selected");
            updateChalkboard(r, c, true);

            // Scroll automático suave hacia la celda en evaluación
            if (s === steps - 1 && dataViewport) {
                const cellTop = td.offsetTop;
                const cellLeft = td.offsetLeft;
                if (cellTop > dataViewport.scrollTop + dataViewport.clientHeight - 60 || cellTop < dataViewport.scrollTop) {
                    dataViewport.scrollTop = cellTop - 100;
                }
                if (cellLeft > dataViewport.scrollLeft + dataViewport.clientWidth - 60 || cellLeft < dataViewport.scrollLeft) {
                    dataViewport.scrollLeft = cellLeft - 100;
                }
            }

            animIdx++;
        }

        if (playerStatus) {
            playerStatus.textContent = `Celda ${animIdx} de ${animCells.length} calculada`;
        }

        if (animIdx >= animCells.length) {
            finishStepAnimation();
        }
    }

    if (btnPlay) {
        btnPlay.addEventListener("click", () => {
            // Si el panel de resultados está oculto o no se ha calculado, ejecutar cálculo primero
            if (resultsArea && resultsArea.classList.contains("hidden")) {
                runSimulation();
                // Si la validación de FASTA falló, resultsArea seguirá oculto
                if (resultsArea.classList.contains("hidden")) return;
            }

            if (sim.isPlaying) {
                stopStepAnimation();
                if (playerStatus) playerStatus.textContent = `⏸️ Pausado (en celda ${animIdx})`;
            } else {
                if (heatmapCanvas && !heatmapCanvas.classList.contains("hidden")) {
                    if (viewModeSelect) viewModeSelect.value = "micro";
                    renderMatrixOrHeatmap();
                }
                
                animCells = Array.from(matrixContainer.querySelectorAll("td"));
                animIdx = 0;
                
                // VACIAR LA MATRIZ PARA SIMULAR EL CÁLCULO EN TIEMPO REAL DESDE CERO
                animCells.forEach(td => {
                    td.classList.remove("cell-optimal", "cell-hover", "cell-selected");
                    const valSpan = td.querySelector(".val");
                    if (valSpan) valSpan.textContent = "?";
                });
                
                sim.isPlaying = true;
                btnPlay.innerHTML = `<i class="icon">⏸️</i> Pausar Animación`;
                if (viewModeSelect) viewModeSelect.disabled = true;
                if (playerControls) playerControls.classList.remove("hidden");
                
                const speedVal = animSpeedSelect ? animSpeedSelect.value : "manual";
                if (speedVal === "manual") {
                    sim.isPlaying = false; // Pausado en modo manual
                    if (playerStatus) playerStatus.textContent = "⏸️ Modo Manual (usa botones de paso para revelar)";
                    advanceStep(1);
                } else {
                    if (playerStatus) playerStatus.textContent = "▶️ Calculando matriz en tiempo real...";
                    sim.animTimer = setInterval(() => advanceStep(1), parseInt(speedVal));
                }
            }
        });
    }

    if (btnStepNext) {
        btnStepNext.addEventListener("click", () => {
            if (sim.animTimer) clearInterval(sim.animTimer);
            if (btnPlay) btnPlay.innerHTML = `<i class="icon">▶️</i> Continuar Auto`;
            sim.isPlaying = false;
            if (animSpeedSelect) animSpeedSelect.value = "manual";
            advanceStep(1);
        });
    }

    if (btnStepRow) {
        btnStepRow.addEventListener("click", () => {
            if (sim.animTimer) clearInterval(sim.animTimer);
            if (btnPlay) btnPlay.innerHTML = `<i class="icon">▶️</i> Continuar Auto`;
            sim.isPlaying = false;
            if (animSpeedSelect) animSpeedSelect.value = "manual";
            const cols = sim.scoreMatrix[0].length;
            advanceStep(cols);
        });
    }

    if (animSpeedSelect) {
        animSpeedSelect.addEventListener("change", () => {
            if (playerControls && !playerControls.classList.contains("hidden") && animIdx < animCells.length) {
                if (sim.animTimer) clearInterval(sim.animTimer);
                const speedVal = animSpeedSelect.value;
                if (speedVal === "manual") {
                    sim.isPlaying = false;
                    if (btnPlay) btnPlay.innerHTML = `<i class="icon">▶️</i> Continuar Auto`;
                    if (playerStatus) playerStatus.textContent = "⏸️ Modo Manual";
                } else {
                    sim.isPlaying = true;
                    if (btnPlay) btnPlay.innerHTML = `<i class="icon">⏸️</i> Pausar Animación`;
                    if (playerStatus) playerStatus.textContent = "▶️ Calculando matriz en tiempo real...";
                    sim.animTimer = setInterval(() => advanceStep(1), parseInt(speedVal));
                }
            }
        });
    }

    // --- 9. MODO DESAFÍO REAL GAMIFICADO ---
    if (btnChallenge) {
        btnChallenge.addEventListener("click", () => {
            if (sim.inChallengeMode) {
                // Cancelar desafío
                sim.inChallengeMode = false;
                btnChallenge.innerHTML = "🎯 Modo Desafío Traceback";
                btnChallenge.style.background = "";
                runSimulation();
            } else {
                // Activar desafío
                sim.inChallengeMode = true;
                stopStepAnimation();
                if (playerControls) playerControls.classList.add("hidden");
                
                btnChallenge.innerHTML = "❌ Salir del Desafío";
                btnChallenge.style.background = "#ff0054";
                
                const rows = sim.scoreMatrix.length;
                const cols = sim.scoreMatrix[0].length;
                sim.challengeCurrent = [rows - 1, cols - 1];
                
                drawInteractiveTable();
                
                alert("🎯 ¡MODO DESAFÍO ACTIVADO!\n\n1. El camino óptimo ha sido ocultado y la Pizarra Didáctica no te dará spoilers.\n2. Tu punto de partida es la celda inferior derecha (" + (rows-1) + ", " + (cols-1) + ") que está iluminada en azul.\n3. Haz clic en la celda adyacente correcta hacia atrás siguiendo la dirección del valor máximo hasta llegar a la esquina superior izquierda (0,0).\n\n💡 Nota de bioinformática: Si una celda tuvo empates en el cálculo, ¡cualquiera de los caminos ganadores será validado como correcto!");
            }
        });
    }

    // =========================================================================
    // --- 10. MÓDULO 2: FILOGENIA (UPGMA & CONEXIÓN ALINEAMIENTO) ---
    // =========================================================================
    const phyloSim = new window.PhylogenySimulator();
    
    const phyloPresetSelect = document.getElementById("phylo-preset-select");
    const phyloEditNotice = document.getElementById("phylo-edit-notice");
    const phyloSpeciesList = document.getElementById("phylo-species-list");
    const btnAddSpecies = document.getElementById("btn-add-species");
    const btnPhyloCalculate = document.getElementById("btn-phylo-calculate");
    const btnPhyloPlay = document.getElementById("btn-phylo-play");
    const phyloPlayerControls = document.getElementById("phylo-player-controls");
    const btnPhyloStepPrev = document.getElementById("btn-phylo-step-prev");
    const btnPhyloStepNext = document.getElementById("btn-phylo-step-next");
    const phyloAnimSpeed = document.getElementById("phylo-anim-speed");
    const phyloPlayerStatus = document.getElementById("phylo-player-status");
    const btnPhyloChallenge = document.getElementById("btn-phylo-challenge");
    
    const phyloResultsArea = document.getElementById("phylo-results-area");
    const phyloConnectionBanner = document.getElementById("phylo-connection-banner");
    const phyloAlignCountBadge = document.getElementById("phylo-align-count-badge");
    const phyloStepTitle = document.getElementById("phylo-step-title");
    const phyloMatrixContainer = document.getElementById("phylo-matrix-container");
    const phyloCanvas = document.getElementById("phylo-canvas");
    const phyloChalkboardContent = document.getElementById("phylo-chalkboard-content");

    let phyloCurrentSpecies = [];
    let phyloIsReadOnly = false;

    function renderSpeciesListUI() {
        if (!phyloSpeciesList) return;
        phyloSpeciesList.innerHTML = "";
        
        phyloCurrentSpecies.forEach((sp, idx) => {
            const item = document.createElement("div");
            item.className = "phylo-species-item";
            
            let headerHtml = `<div class="phylo-species-header">
                                <span class="phylo-species-name">Especie #${idx + 1}: ${phyloIsReadOnly ? sp.name : ''}</span>`;
            if (!phyloIsReadOnly && phyloCurrentSpecies.length > 2) {
                headerHtml += `<button type="button" class="phylo-btn-remove" data-idx="${idx}">🗑️ Eliminar</button>`;
            }
            headerHtml += `</div>`;

            if (!phyloIsReadOnly) {
                headerHtml += `<input type="text" class="sp-name-input" data-idx="${idx}" value="${sp.name}" placeholder="Nombre de la especie..." style="margin-bottom:0.2rem;">`;
            }

            const readonlyAttr = phyloIsReadOnly ? "readonly class='readonly-box'" : "";
            const seqHtml = `<input type="text" class="sp-seq-input" data-idx="${idx}" value="${sp.seq}" placeholder="Secuencia molecular FASTA (A, C, G, T...)..." ${readonlyAttr}>`;

            item.innerHTML = headerHtml + seqHtml;
            phyloSpeciesList.appendChild(item);
        });

        // Eventos de edición y borrado
        if (!phyloIsReadOnly) {
            phyloSpeciesList.querySelectorAll(".sp-name-input").forEach(inp => {
                inp.addEventListener("input", (e) => {
                    const idx = parseInt(e.target.getAttribute("data-idx"));
                    phyloCurrentSpecies[idx].name = e.target.value;
                    clearPhyloResults();
                });
            });
            phyloSpeciesList.querySelectorAll(".sp-seq-input").forEach(inp => {
                inp.addEventListener("input", (e) => {
                    const idx = parseInt(e.target.getAttribute("data-idx"));
                    phyloCurrentSpecies[idx].seq = e.target.value.replace(/[^A-Z]/gi, '').toUpperCase();
                    clearPhyloResults();
                });
            });
            phyloSpeciesList.querySelectorAll(".phylo-btn-remove").forEach(btn => {
                btn.addEventListener("click", (e) => {
                    const idx = parseInt(e.target.getAttribute("data-idx"));
                    phyloCurrentSpecies.splice(idx, 1);
                    renderSpeciesListUI();
                    clearPhyloResults();
                });
            });
        }
    }

    function loadPhyloPreset(key) {
        if (!PHYLO_PRESETS || !PHYLO_PRESETS[key]) return;
        const p = PHYLO_PRESETS[key];
        
        phyloCurrentSpecies = p.species.map(s => ({ name: s.name, seq: s.seq }));
        
        if (p.type !== "custom") {
            phyloIsReadOnly = true;
            if (btnAddSpecies) btnAddSpecies.style.display = "none";
            if (phyloEditNotice) {
                phyloEditNotice.innerHTML = `🔒 <strong>Modo Lectura Biológico:</strong> Las especies y secuencias de este caso de estudio están bloqueadas. Selecciona <strong>"✏️ Especies Personalizadas"</strong> para modificar, eliminar o añadir secuencias libres.`;
                phyloEditNotice.className = "notice-box notice-locked";
            }
        } else {
            phyloIsReadOnly = false;
            if (btnAddSpecies) btnAddSpecies.style.display = "inline-block";
            if (phyloEditNotice) {
                phyloEditNotice.innerHTML = `✏️ <strong>Modo Edición Libre:</strong> Escribe nombres y secuencias FASTA, o haz clic en "+ Agregar" para añadir nuevas especies y ver cómo se modifica el árbol evolutivo.`;
                phyloEditNotice.className = "notice-box notice-editable";
            }
        }
        renderSpeciesListUI();
        clearPhyloResults();
    }

    if (phyloPresetSelect && typeof PHYLO_PRESETS !== "undefined") {
        phyloPresetSelect.innerHTML = "";
        Object.keys(PHYLO_PRESETS).forEach(key => {
            const opt = document.createElement("option");
            opt.value = key;
            opt.textContent = PHYLO_PRESETS[key].name;
            phyloPresetSelect.appendChild(opt);
        });

        phyloPresetSelect.addEventListener("change", (e) => {
            loadPhyloPreset(e.target.value);
        });

        loadPhyloPreset("primates");
    }

    if (btnAddSpecies) {
        btnAddSpecies.addEventListener("click", () => {
            if (phyloIsReadOnly) return;
            const newNum = phyloCurrentSpecies.length + 1;
            phyloCurrentSpecies.push({ name: `Especie Nueva #${newNum}`, seq: "ACGTACGT" });
            renderSpeciesListUI();
            clearPhyloResults();
        });
    }

    function clearPhyloResults() {
        stopPhyloAnimation();
        phyloSim.inChallengeMode = false;
        if (btnPhyloChallenge) {
            btnPhyloChallenge.innerHTML = "🎯 Modo Desafío Filogenético";
            btnPhyloChallenge.style.background = "";
        }
        if (phyloResultsArea) phyloResultsArea.classList.add("hidden");
        if (phyloPlayerControls) phyloPlayerControls.classList.add("hidden");
    }

    function runPhyloSimulation() {
        stopPhyloAnimation();
        phyloSim.inChallengeMode = false;
        if (btnPhyloChallenge) {
            btnPhyloChallenge.innerHTML = "🎯 Modo Desafío Filogenético";
            btnPhyloChallenge.style.background = "";
        }
        if (phyloPlayerControls) phyloPlayerControls.classList.add("hidden");

        // Validar especies
        const validSpecies = phyloCurrentSpecies.filter(s => s.name.trim() !== "" && s.seq.trim().length >= 2);
        if (validSpecies.length < 2) {
            alert("⚠️ ¡Atención! Se requieren al menos 2 especies con secuencias válidas (de al menos 2 bases o aminoácidos) para calcular las distancias y construir el árbol.");
            if (phyloResultsArea) phyloResultsArea.classList.add("hidden");
            return;
        }

        phyloSim.loadSpecies(validSpecies);
        phyloSim.computePairwiseDistances(5, -2, -2);
        phyloSim.runUPGMA();

        const numPairs = (validSpecies.length * (validSpecies.length - 1)) / 2;
        if (phyloAlignCountBadge) {
            phyloAlignCountBadge.textContent = `⚡ ${numPairs} Alineamientos Needleman-Wunsch realizados`;
        }

        phyloResultsArea.classList.remove("hidden");
        
        // Mostrar por defecto el árbol completo terminado (el último paso del historial)
        const finalStep = phyloSim.history.length - 1;
        renderPhyloStep(finalStep);
        updatePhyloChalkboardGeneral(finalStep);
    }

    if (btnPhyloCalculate) {
        btnPhyloCalculate.addEventListener("click", runPhyloSimulation);
    }

    // --- 11. RENDERIZADO DE PASOS Y ÁRBOL FILOGENÉTICO ---
    function renderPhyloStep(stepIdx) {
        if (!phyloSim.history || !phyloSim.history[stepIdx]) return;
        const stepData = phyloSim.history[stepIdx];
        phyloSim.currentStep = stepIdx;

        if (phyloStepTitle) {
            phyloStepTitle.textContent = stepData.title;
        }

        // 1. Renderizar Matriz de Distancia Evolutiva para el paso actual
        if (phyloMatrixContainer) {
            const clusters = stepData.clusters;
            const matrix = stepData.matrix;
            const minPair = stepData.minPair;

            let html = `<table class="phylo-matrix-table"><thead><tr><th>Especie / Grupo</th>`;
            clusters.forEach(c => {
                html += `<th>${c.name}</th>`;
            });
            html += `</tr></thead><tbody>`;

            clusters.forEach((cRow, r) => {
                html += `<tr><th>${cRow.name}</th>`;
                clusters.forEach((cCol, c) => {
                    const val = matrix[r][c];
                    let cellCls = "";
                    if (!phyloSim.inChallengeMode && minPair && ((r === minPair.i && c === minPair.j) || (r === minPair.j && c === minPair.i))) {
                        cellCls = "phylo-cell-min";
                    }
                    html += `<td class="${cellCls}" data-r="${r}" data-c="${c}" title="Distancia entre ${cRow.name} y ${cCol.name}: ${val}">${val}</td>`;
                });
                html += `</tr>`;
            });
            html += `</tbody></table>`;
            phyloMatrixContainer.innerHTML = html;

            const tdCells = phyloMatrixContainer.querySelectorAll("td");
            tdCells.forEach(td => {
                td.addEventListener("click", () => {
                    const r = parseInt(td.getAttribute("data-r"));
                    const c = parseInt(td.getAttribute("data-c"));

                    if (phyloSim.inChallengeMode && minPair) {
                        if ((r === minPair.i && c === minPair.j) || (r === minPair.j && c === minPair.i)) {
                            td.classList.add("phylo-cell-min");
                            setTimeout(() => {
                                const nextStep = stepIdx + 1;
                                if (nextStep < phyloSim.history.length - 1) {
                                    alert(`🎉 ¡CORRECTO! Has identificado la distancia mínima (${minPair.dist}) entre "${clusters[minPair.i].name}" y "${clusters[minPair.j].name}".\n\nEl algoritmo UPGMA procederá a fusionar estas dos líneas evolutivas en un ancestro común.`);
                                    renderPhyloStep(nextStep);
                                    updatePhyloChalkboardGeneral(nextStep);
                                } else {
                                    alert(`🎉 ¡CORRECTO! Has identificado la última agrupación (${minPair.dist}) entre "${clusters[minPair.i].name}" y "${clusters[minPair.j].name}".\n\n🏆 ¡FELICIDADES! Has completado exitosamente la construcción de todo el árbol filogenético.`);
                                    phyloSim.inChallengeMode = false;
                                    if (btnPhyloChallenge) {
                                        btnPhyloChallenge.innerHTML = "🎯 Modo Desafío Filogenético";
                                        btnPhyloChallenge.style.background = "";
                                    }
                                    renderPhyloStep(phyloSim.history.length - 1);
                                    updatePhyloChalkboardGeneral(phyloSim.history.length - 1);
                                }
                            }, 100);
                        } else if (r === c) {
                            alert("❌ Esa es la diagonal de identidad (distancia 0 consigo misma). Debes buscar la mínima distancia entre DOS especies diferentes.");
                        } else {
                            const origBg = td.style.backgroundColor;
                            td.style.backgroundColor = "rgba(255, 0, 84, 0.6)";
                            setTimeout(() => { td.style.backgroundColor = origBg; }, 600);
                            alert(`❌ Incorrecto. La distancia en esa celda (${matrix[r][c]}) no es la más pequeña en la matriz actual.\n\nBusca el valor mínimo entre dos especies distintas para saber quiénes divergen del ancestro más reciente.`);
                        }
                        return;
                    }

                    tdCells.forEach(t => t.classList.remove("phylo-cell-selected"));
                    td.classList.add("phylo-cell-selected");
                    updatePhyloChalkboardCell(stepIdx, r, c);
                });
            });
        }

        // 2. Renderizar Árbol en Canvas
        drawPhylogeneticTree(stepIdx);
    }

    function updatePhyloChalkboardGeneral(stepIdx) {
        if (!phyloChalkboardContent || !phyloSim.history[stepIdx]) return;
        const stepData = phyloSim.history[stepIdx];

        let html = `<div class="chalkboard-title" style="color: var(--accent-green);">📍 ${stepData.title}</div>`;
        if (stepData.mergedPair) {
            html += `<div class="chalkboard-val" style="font-size: 0.95rem; color: #fff;">Agrupamiento: <strong>"${stepData.mergedPair.aName}"</strong> + <strong>"${stepData.mergedPair.bName}"</strong></div>`;
            html += `<div style="font-size: 0.82rem; color: var(--accent-yellow); margin-top: 0.2rem;">Distancia mutacional: ${stepData.mergedPair.dist} &bull; Altura del nodo ancestral: ${stepData.mergedPair.height}</div>`;
        } else {
            html += `<div class="chalkboard-val" style="font-size: 0.95rem; color: #fff;">Distancias calculadas a partir de alineamientos del Módulo 1.</div>`;
        }
        html += `<div class="chalkboard-formula" style="margin-top: 0.6rem;">${stepData.explanation}</div>`;
        
        phyloChalkboardContent.innerHTML = html;
    }

    function updatePhyloChalkboardCell(stepIdx, r, c) {
        if (!phyloChalkboardContent || !phyloSim.history[stepIdx]) return;
        const stepData = phyloSim.history[stepIdx];
        const cellFormulas = stepData.cellFormulas || {};
        const key = `${r}-${c}`;
        const f = cellFormulas[key];

        if (!f) {
            updatePhyloChalkboardGeneral(stepIdx);
            return;
        }

        let html = `<div class="chalkboard-title" style="color: var(--accent-cyan);">📍 Inspeccionando Celda [${r}, ${c}]: ${f.title}</div>`;
        html += `<div class="chalkboard-val" style="font-size: 1rem; color: var(--accent-green);">Distancia Evolutiva: <strong class="text-glow">${f.val}</strong></div>`;
        html += `<div class="chalkboard-formula" style="margin-top: 0.6rem;">${f.formula.replace(/\n/g, '<br>')}</div>`;
        
        phyloChalkboardContent.innerHTML = html;
    }

    function drawPhylogeneticTree(stepIdx) {
        if (!phyloCanvas || !phyloSim.treeRoot) return;
        const ctx = phyloCanvas.getContext("2d");
        const w = phyloCanvas.width;
        const h = phyloCanvas.height;

        ctx.clearRect(0, 0, w, h);

        const layout = phyloSim.getTreeLayout(w, h);
        const { nodes, edges, maxH, leftMargin, rightMargin } = layout;

        ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(leftMargin, h - 30);
        ctx.lineTo(rightMargin, h - 30);
        ctx.stroke();

        ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
        ctx.font = "11px var(--font-mono)";
        ctx.textAlign = "center";
        const numTicks = 5;
        for (let t = 0; t <= numTicks; t++) {
            const ratio = t / numTicks;
            const x = rightMargin - (ratio * (rightMargin - leftMargin));
            const val = (ratio * maxH).toFixed(3);
            ctx.beginPath();
            ctx.moveTo(x, h - 33);
            ctx.lineTo(x, h - 27);
            ctx.stroke();
            ctx.fillText(val, x, h - 14);
        }
        ctx.textAlign = "left";
        ctx.fillText("Divergencia Evolutiva (Altura Ancestral UPGMA)", leftMargin, h - 4);

        edges.forEach(edge => {
            const isCreated = edge.stepCreated <= stepIdx;
            const isJustCreated = (edge.stepCreated === stepIdx) && (stepIdx > 0);
            
            if (isJustCreated) {
                ctx.strokeStyle = "#ffbe0b"; // Amarillo oro brillante para la rama recién nacida
                ctx.lineWidth = 3.5;
                ctx.shadowColor = "#ffbe0b";
                ctx.shadowBlur = 12;
            } else if (isCreated) {
                ctx.strokeStyle = "#00ffcc"; // Cian neón para ramas anteriores
                ctx.lineWidth = 2.5;
                ctx.shadowColor = "#00ffcc";
                ctx.shadowBlur = 6;
            } else {
                ctx.strokeStyle = "rgba(255, 255, 255, 0.1)"; // Línea tenue para ramas futuras
                ctx.lineWidth = 1;
                ctx.shadowBlur = 0;
            }

            ctx.beginPath();
            ctx.moveTo(edge.fromX, edge.fromY);
            ctx.lineTo(edge.fromX, edge.toY);
            ctx.lineTo(edge.toX, edge.toY);
            ctx.stroke();
            ctx.shadowBlur = 0;
        });

        nodes.forEach(node => {
            const isCreated = node.stepCreated <= stepIdx;
            const isJustCreated = (node.stepCreated === stepIdx) && (stepIdx > 0);

            ctx.beginPath();
            ctx.arc(node.x, node.y, node.isLeaf ? 5 : (isJustCreated ? 7 : 6), 0, Math.PI * 2);
            
            if (node.isLeaf) {
                ctx.fillStyle = "#39ff14";
                ctx.shadowColor = "#39ff14";
                ctx.shadowBlur = 8;
            } else if (isJustCreated) {
                ctx.fillStyle = "#ffbe0b"; // Nodo dorado recién creado
                ctx.shadowColor = "#ffbe0b";
                ctx.shadowBlur = 12;
            } else if (isCreated) {
                ctx.fillStyle = "#00ffcc";
                ctx.shadowColor = "#00ffcc";
                ctx.shadowBlur = 6;
            } else {
                ctx.fillStyle = "rgba(255, 255, 255, 0.2)"; // Nodo futuro
                ctx.shadowBlur = 0;
            }
            
            ctx.fill();
            ctx.shadowBlur = 0;

            if (node.isLeaf) {
                ctx.fillStyle = "#ffffff";
                ctx.font = "bold 13px var(--font-main, sans-serif)";
                ctx.textAlign = "left";
                ctx.fillText(`🌿 ${node.name}`, node.x + 10, node.y + 4);
            } else if (isCreated) {
                ctx.fillStyle = isJustCreated ? "#ffbe0b" : "var(--accent-yellow, #ffbe0b)";
                ctx.font = isJustCreated ? "bold 12px var(--font-mono)" : "11px var(--font-mono)";
                ctx.textAlign = "center";
                ctx.fillText(`h=${node.height}`, node.x - 15, node.y - 8);
            }
        });
    }

    // --- 12. REPRODUCTOR PASO A PASO FILOGENÍA ---
    function stopPhyloAnimation() {
        if (phyloSim.animTimer) clearInterval(phyloSim.animTimer);
        phyloSim.isPlaying = false;
        if (btnPhyloPlay) btnPhyloPlay.innerHTML = `<i class="icon">▶️</i> Reproducir Paso a Paso`;
        if (phyloPlayerStatus) phyloPlayerStatus.textContent = "Pausado / Detenido";
    }

    function advancePhyloStep(steps = 1) {
        let target = phyloSim.currentStep + steps;
        if (target >= phyloSim.history.length) {
            target = phyloSim.history.length - 1;
            stopPhyloAnimation();
        }
        if (target < 0) target = 0;

        renderPhyloStep(target);
        updatePhyloChalkboardGeneral(target);

        if (phyloPlayerStatus) {
            phyloPlayerStatus.textContent = `Paso ${target} de ${phyloSim.history.length - 1}`;
        }
    }

    if (btnPhyloPlay) {
        btnPhyloPlay.addEventListener("click", () => {
            if (phyloResultsArea && phyloResultsArea.classList.contains("hidden")) {
                runPhyloSimulation();
                if (phyloResultsArea.classList.contains("hidden")) return;
            }

            if (phyloSim.isPlaying) {
                stopPhyloAnimation();
                if (phyloPlayerStatus) phyloPlayerStatus.textContent = `⏸️ Pausado (Paso ${phyloSim.currentStep})`;
            } else {
                phyloSim.isPlaying = true;
                btnPhyloPlay.innerHTML = `<i class="icon">⏸️</i> Pausar Animación`;
                if (phyloPlayerControls) phyloPlayerControls.classList.remove("hidden");

                const speedVal = phyloAnimSpeed ? phyloAnimSpeed.value : "manual";
                if (speedVal === "manual") {
                    phyloSim.isPlaying = false;
                    if (phyloPlayerStatus) phyloPlayerStatus.textContent = "⏸️ Modo Manual (usa botones de paso)";
                    if (phyloSim.currentStep >= phyloSim.history.length - 1) {
                        renderPhyloStep(0);
                        updatePhyloChalkboardGeneral(0);
                    }
                } else {
                    if (phyloSim.currentStep >= phyloSim.history.length - 1) {
                        renderPhyloStep(0);
                        updatePhyloChalkboardGeneral(0);
                    }
                    if (phyloPlayerStatus) phyloPlayerStatus.textContent = "▶️ Construyendo árbol en tiempo real...";
                    phyloSim.animTimer = setInterval(() => advancePhyloStep(1), parseInt(speedVal));
                }
            }
        });
    }

    if (btnPhyloStepPrev) {
        btnPhyloStepPrev.addEventListener("click", () => {
            if (phyloSim.animTimer) clearInterval(phyloSim.animTimer);
            if (btnPhyloPlay) btnPhyloPlay.innerHTML = `<i class="icon">▶️</i> Continuar Auto`;
            phyloSim.isPlaying = false;
            if (phyloAnimSpeed) phyloAnimSpeed.value = "manual";
            advancePhyloStep(-1);
        });
    }

    if (btnPhyloStepNext) {
        btnPhyloStepNext.addEventListener("click", () => {
            if (phyloSim.animTimer) clearInterval(phyloSim.animTimer);
            if (btnPhyloPlay) btnPhyloPlay.innerHTML = `<i class="icon">▶️</i> Continuar Auto`;
            phyloSim.isPlaying = false;
            if (phyloAnimSpeed) phyloAnimSpeed.value = "manual";
            advancePhyloStep(1);
        });
    }

    if (phyloAnimSpeed) {
        phyloAnimSpeed.addEventListener("change", () => {
            if (phyloPlayerControls && !phyloPlayerControls.classList.contains("hidden")) {
                if (phyloSim.animTimer) clearInterval(phyloSim.animTimer);
                const speedVal = phyloAnimSpeed.value;
                if (speedVal === "manual") {
                    phyloSim.isPlaying = false;
                    if (btnPhyloPlay) btnPhyloPlay.innerHTML = `<i class="icon">▶️</i> Continuar Auto`;
                    if (phyloPlayerStatus) phyloPlayerStatus.textContent = "⏸️ Modo Manual";
                } else {
                    phyloSim.isPlaying = true;
                    if (btnPhyloPlay) btnPhyloPlay.innerHTML = `<i class="icon">⏸️</i> Pausar Animación`;
                    if (phyloPlayerStatus) phyloPlayerStatus.textContent = "▶️ Construyendo árbol...";
                    phyloSim.animTimer = setInterval(() => advancePhyloStep(1), parseInt(speedVal));
                }
            }
        });
    }

    // --- 13. MODO DESAFÍO FILOGENÉTICO ---
    if (btnPhyloChallenge) {
        btnPhyloChallenge.addEventListener("click", () => {
            if (phyloSim.inChallengeMode) {
                phyloSim.inChallengeMode = false;
                btnPhyloChallenge.innerHTML = "🎯 Modo Desafío Filogenético";
                btnPhyloChallenge.style.background = "";
                runPhyloSimulation();
            } else {
                if (phyloResultsArea && phyloResultsArea.classList.contains("hidden")) {
                    runPhyloSimulation();
                }
                phyloSim.inChallengeMode = true;
                stopPhyloAnimation();
                if (phyloPlayerControls) phyloPlayerControls.classList.add("hidden");
                
                btnPhyloChallenge.innerHTML = "❌ Salir del Desafío";
                btnPhyloChallenge.style.background = "#ff0054";
                
                renderPhyloStep(0);
                updatePhyloChalkboardGeneral(0);
                
                alert("🎯 ¡MODO DESAFÍO FILOGENÉTICO ACTIVADO!\n\n1. El resaltado verde automático de la mínima distancia ha sido ocultado.\n2. Examina los valores de la Matriz de Distancia actual en el Paso 0.\n3. Haz clic en la celda que contenga la distancia MÍNIMA entre dos especies diferentes para predecir quiénes se agruparán primero en la evolución.");
            }
        });
    }

    // AL CARGAR LA PÁGINA: NO AUTO-CALCULAR, DEJAR RESULTADOS OCULTOS HASTA QUE PULSEN EL BOTÓN
    if (resultsArea) resultsArea.classList.add("hidden");
});
