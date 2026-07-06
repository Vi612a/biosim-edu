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

    // AL CARGAR LA PÁGINA: NO AUTO-CALCULAR, DEJAR RESULTADOS OCULTOS HASTA QUE PULSEN EL BOTÓN
    if (resultsArea) resultsArea.classList.add("hidden");
});
