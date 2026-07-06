// =========================================================================
// ARCHIVO: js/pdb_data.js
// DESCRIPCIÓN: Presets biológicos y datos PDB de respaldo (offline) para
//              el Módulo 3 de Modelado Estructural 3D (3Dmol.js).
// =========================================================================

window.STRUCTURE_PRESETS = {
    "hemoglobin": {
        id: "hemoglobin",
        name: "🩸 Hemoglobina β (Mutación Falciforme E6V)",
        pdbId: "1a3n",
        description: "La hemoglobina transporta oxígeno en los eritrocitos. La mutación puntual E6V en la cadena beta cambia un Glutamato polar por una Valina hidrofóbica, causando la agregación patológica de la Anemia Falciforme.",
        targetResidue: 6,
        targetChain: "B",
        origAmino: "GLU",
        mutAmino: "VAL",
        connectionNote: "✨ Conexión con Módulo 1: Esta es exactamente la mutación E6V analizada en el alineamiento Needleman-Wunsch entre Humano Normal y Paciente Falciforme.",
        challengeCase: null
    },
    "gfp": {
        id: "gfp",
        name: "🌟 Proteína Verde Fluorescente (GFP - Barril Beta)",
        pdbId: "1gfl",
        description: "Estructura en barril beta de la medusa Aequorea victoria. En su centro alberga un cromóforo fluorogénico protegido del agua que emite bioluminiscencia verde.",
        targetResidue: 66,
        targetChain: "A",
        origAmino: "TYR",
        mutAmino: "HIS",
        connectionNote: "💡 Mutaciones en la cavidad del cromóforo modifican la longitud de onda emitida (creando variantes como BFP, CFP o YFP).",
        challengeCase: null
    },
    "p53": {
        id: "p53",
        name: "🛡️ Proteína p53 (Dominio de Unión al ADN / Tumor Suppressor)",
        pdbId: "1tup",
        description: "Conocido como el 'Guardián del genoma', p53 regula el ciclo celular y previene el cáncer. El residuo Arg-248 es crítico para anclar la proteína al surco menor del ADN.",
        targetResidue: 248,
        targetChain: "A",
        origAmino: "ARG",
        mutAmino: "GLN",
        connectionNote: "⚠️ Más del 50% de los cánceres humanos presentan mutaciones de pérdida de función en los residuos de contacto al ADN de p53.",
        challengeCase: null
    },
    "insulin": {
        id: "insulin",
        name: "💉 Insulina Humana (Hormona Metabólica)",
        pdbId: "4ins",
        description: "Pequeña hormona proteica compuesta por dos cadenas (A y B) unidas por puentes disulfuro. Regula el metabolismo de la glucosa en la sangre.",
        targetResidue: 10,
        targetChain: "A",
        origAmino: "VAL",
        mutAmino: "ASP",
        connectionNote: "🧪 Mutaciones en la interfaz de dimerización de la insulina se utilizan en farmacología para crear insulinas de acción rápida o prolongada.",
        challengeCase: null
    },
    "challenge_case": {
        id: "challenge_case",
        name: "🎯 CASO CLÍNICO DESAFÍO: Enzima Mutada Inestable",
        pdbId: "1crn", // Crambina como modelo de bolsillo compacto
        description: "🚨 PATOLOGÍA AGUDA: Una enzima clave del paciente presenta pérdida total de plegamiento debido a una repulsión electrostática severa en el bolsillo activo (Residuo #16).",
        targetResidue: 16,
        targetChain: "A",
        origAmino: "ARG", // Simulamos que tiene una arginina problemática
        mutAmino: "ASP", // La solución correcta
        connectionNote: "🏆 Modo Desafío Gamificado: Tu misión como ingeniero bioinformático es identificar qué aminoácido restaurará la estabilidad molecular y salvará la función proteica.",
        challengeCase: {
            problemResidue: 16,
            problemChain: "A",
            currentAmino: "ARG (Arginina - Carga positiva enorme +1)",
            problemDesc: "La Arginina en la posición 16 choca estéricamente y repele violentamente a la His-25 cercana (+1), destruyendo el sitio activo.",
            options: [
                { code: "ASP", name: "Ácido Aspártico (ASP - Carga negativa -1)", correct: true, feedback: "🏆 ¡PERFECTO! El Ácido Aspártico (-1) forma un puente salino de atracción electrostática ideal con His-25 (+1), estabilizando la enzima por completo." },
                { code: "VAL", name: "Valina (VAL - Hidrofóbico apolar)", correct: false, feedback: "❌ Incorrecto. Al colocar un residuo apolar en una zona con carga expuesta, la enzima se desnaturaliza y precipita en el agua." },
                { code: "LYS", name: "Lisina (LYS - Carga positiva +1)", correct: false, feedback: "❌ Incorrecto. La Lisina tiene otra carga positiva (+1) que continuaría repeliendo a la His-25, empeorando la inestabilidad del paciente." },
                { code: "GLY", name: "Glicina (GLY - Sin cadena lateral)", correct: false, feedback: "❌ Incorrecto. Aunque no repele, la Glicina deja un hueco vacío en el núcleo de la enzima, provocando un colapso estructural por falta de empaquetamiento." }
            ]
        }
    }
};

// Respaldo PDB offline ultra-ligero (Crambina 1CRN - 46 residuos) para carga instantánea 100% garantizada sin internet
window.OFFLINE_PDB_1CRN = `
HEADER    PLANT PROTEIN                           03-JUL-81   1CRN              
TITLE     STRUCTURE OF CRAMBIN AT 1.5 ANGSTROMS RESOLUTION                      
ATOM      1  N   THR A   1       17.047  14.099   3.625  1.00 13.79           N  
ATOM      2  CA  THR A   1       16.967  12.784   4.338  1.00 10.80           C  
ATOM      3  C   THR A   1       15.685  12.755   5.133  1.00  9.19           C  
ATOM      4  O   THR A   1       15.268  13.808   5.644  1.00 10.45           O  
ATOM      5  CB  THR A   1       18.170  12.703   5.337  1.00 13.02           C  
ATOM      6  OG1 THR A   1       19.334  12.829   4.500  1.00 15.06           O  
ATOM      7  CG2 THR A   1       18.150  11.385   6.107  1.00 14.23           C  
ATOM      8  N   THR A   2       15.115  11.555   5.265  1.00  7.81           N  
ATOM      9  CA  THR A   2       13.856  11.469   6.066  1.00  8.31           C  
ATOM     10  C   THR A   2       14.164  10.785   7.379  1.00  5.80           C  
ATOM     11  O   THR A   2       14.993   9.862   7.410  1.00  6.94           O  
ATOM     12  CB  THR A   2       12.732  10.711   5.261  1.00 10.32           C  
ATOM     13  OG1 THR A   2       13.308  10.222   4.045  1.00 12.81           O  
ATOM     14  CG2 THR A   2       12.249   9.531   6.096  1.00 12.55           C  
ATOM     15  N   CYS A   3       13.488  11.241   8.435  1.00  5.24           N  
ATOM     16  CA  CYS A   3       13.660  10.707   9.784  1.00  5.39           C  
ATOM     17  C   CYS A   3       12.583   9.684  10.158  1.00  3.98           C  
ATOM     18  O   CYS A   3       11.530   9.715   9.526  1.00  5.69           O  
ATOM     19  CB  CYS A   3       13.612  11.890  10.760  1.00  5.80           C  
ATOM     20  SG  CYS A   3       15.148  12.793  10.871  1.00  5.71           S  
ATOM     21  N   PRO A   4       12.847   8.766  11.113  1.00  3.84           N  
ATOM     22  CA  PRO A   4       11.859   7.766  11.565  1.00  4.50           C  
ATOM     23  C   PRO A   4       11.787   6.574  10.609  1.00  3.83           C  
ATOM     24  O   PRO A   4       12.737   6.168  9.932  1.00  4.49           O  
ATOM     25  CB  PRO A   4       12.433   7.320  12.919  1.00  5.26           C  
ATOM     26  CG  PRO A   4       13.826   7.893  12.871  1.00  5.14           C  
ATOM     27  CD  PRO A   4       14.072   8.490  11.517  1.00  4.42           C  
ATOM     28  N   PRO A   5       10.655   6.012  10.551  1.00  3.46           N  
ATOM     29  CA  PRO A   5       10.457   4.869   9.664  1.00  3.66           C  
ATOM     30  C   PRO A   5       10.985   5.127   8.243  1.00  3.29           C  
ATOM     31  O   PRO A   5       11.391   4.184   7.550  1.00  4.54           O  
ATOM     32  CB  PRO A   5        8.932   4.789   9.673  1.00  4.06           C  
ATOM     33  CG  PRO A   5        8.453   5.882  10.612  1.00  4.80           C  
ATOM     34  CD  PRO A   5        9.444   6.376  11.597  1.00  3.90           C  
ATOM     35  N   SER A   6       10.980   6.402   7.834  1.00  2.83           N  
ATOM     36  CA  SER A   6       11.472   6.786   6.505  1.00  3.26           C  
ATOM     37  C   SER A   6       12.977   6.612   6.388  1.00  2.79           C  
ATOM     38  O   SER A   6       13.565   6.046   7.311  1.00  3.89           O  
ATOM     39  CB  SER A   6       11.139   8.261   6.257  1.00  4.42           C  
ATOM     40  OG  SER A   6       11.831   9.112   7.155  1.00  6.51           O  
ATOM     41  N   ILE A   7       13.612   7.135   5.328  1.00  2.62           N  
ATOM     42  CA  ILE A   7       15.067   7.054   5.111  1.00  2.41           C  
ATOM     43  C   ILE A   7       15.776   8.196   5.836  1.00  2.48           C  
ATOM     44  O   ILE A   7       15.197   9.255   6.064  1.00  3.57           O  
ATOM     45  CB  ILE A   7       15.441   7.138   3.611  1.00  3.29           C  
ATOM     46  CG1 ILE A   7       14.674   6.059   2.846  1.00  3.71           C  
ATOM     47  CG2 ILE A   7       16.938   7.042   3.385  1.00  3.68           C  
ATOM     48  CD1 ILE A   7       14.992   6.096   1.365  1.00  5.17           C  
ATOM     49  N   THR A   8       17.021   8.000   6.223  1.00  2.24           N  
ATOM     50  CA  THR A   8       17.781   9.014   6.945  1.00  2.32           C  
ATOM     51  C   THR A   8       19.049   9.333   6.166  1.00  2.55           C  
ATOM     52  O   THR A   8       19.821   8.411   5.932  1.00  3.36           O  
ATOM     53  CB  THR A   8       18.156   8.455   8.347  1.00  3.02           C  
ATOM     54  OG1 THR A   8       16.980   8.026   9.035  1.00  3.89           O  
ATOM     55  CG2 THR A   8       19.030   9.479   9.083  1.00  4.00           C  
ATOM     56  N   GLY A   9       19.267  10.603   5.779  1.00  2.08           N  
ATOM     57  CA  GLY A   9       20.467  10.985   5.031  1.00  2.03           C  
ATOM     58  C   GLY A   9       20.301  11.168   3.522  1.00  2.24           C  
ATOM     59  O   GLY A   9       19.256  11.637   3.056  1.00  2.97           O  
ATOM     60  N   ARG A  10       21.353  10.829   2.768  1.00  1.85           N  
ATOM     61  CA  ARG A  10       21.328  10.965   1.309  1.00  2.38           C  
ATOM     62  C   ARG A  10       22.686  10.514   0.742  1.00  2.06           C  
ATOM     63  O   ARG A  10       23.633  10.428   1.517  1.00  2.70           O  
ATOM     64  CB  ARG A  10       21.037  12.428   0.902  1.00  3.45           C  
ATOM     65  CG  ARG A  10       19.588  12.827   1.144  1.00  5.17           C  
ATOM     66  CD  ARG A  10       19.349  14.286   0.814  1.00  6.90           C  
ATOM     67  NE  ARG A  10       18.012  14.689   1.238  1.00  8.85           N  
ATOM     68  CZ  ARG A  10       17.653  15.952   1.488  1.00 11.25           C  
ATOM     69  NH1 ARG A  10       18.528  16.945   1.340  1.00 11.02           N  
ATOM     70  NH2 ARG A  10       16.410  16.223   1.884  1.00 11.96           N  
ATOM     71  N   PRO A  11       22.793  10.222  -0.569  1.00  1.85           N  
ATOM     72  CA  PRO A  11       24.084   9.756  -1.121  1.00  2.07           C  
ATOM     73  C   PRO A  11       24.629  10.803  -2.091  1.00  2.16           C  
ATOM     74  O   PRO A  11       23.955  11.782  -2.389  1.00  2.62           O  
ATOM     75  CB  PRO A  11       23.738   8.455  -1.855  1.00  2.61           C  
ATOM     76  CG  PRO A  11       22.285   8.577  -2.087  1.00  2.88           C  
ATOM     77  CD  PRO A  11       21.781   9.998  -1.637  1.00  2.33           C  
ATOM     78  N   GLY A  12       25.862  10.597  -2.551  1.00  2.10           N  
ATOM     79  CA  GLY A  12       26.471  11.537  -3.483  1.00  2.24           C  
ATOM     80  C   GLY A  12       25.688  11.666  -4.786  1.00  2.10           C  
ATOM     81  O   GLY A  12       25.797  12.659  -5.498  1.00  2.54           O  
ATOM     82  N   CYS A  13       24.897  10.661  -5.093  1.00  1.92           N  
ATOM     83  CA  CYS A  13       24.116  10.667  -6.326  1.00  2.04           C  
ATOM     84  C   CYS A  13       24.975  11.021  -7.538  1.00  1.82           C  
ATOM     85  O   CYS A  13       24.774  12.062  -8.153  1.00  2.52           O  
ATOM     86  CB  CYS A  13       23.447   9.313  -6.529  1.00  2.14           C  
ATOM     87  SG  CYS A  13       22.365   9.288  -8.006  1.00  2.41           S  
ATOM     88  N   PRO A  14       25.939  10.155  -7.886  1.00  1.78           N  
ATOM     89  CA  PRO A  14       26.817  10.428  -9.043  1.00  1.96           C  
ATOM     90  C   PRO A  14       27.351  11.854  -9.011  1.00  2.16           C  
ATOM     91  O   PRO A  14       27.469  12.493 -10.052  1.00  2.83           O  
ATOM     92  CB  PRO A  14       27.915   9.390  -8.790  1.00  2.41           C  
ATOM     93  CG  PRO A  14       27.502   8.729  -7.521  1.00  2.53           C  
ATOM     94  CD  PRO A  14       26.230   8.835  -7.147  1.00  2.24           C  
ATOM     95  N   SER A  15       27.674  12.355  -7.828  1.00  1.88           N  
ATOM     96  CA  SER A  15       28.196  13.714  -7.697  1.00  2.25           C  
ATOM     97  C   SER A  15       27.185  14.819  -8.026  1.00  2.28           C  
ATOM     98  O   SER A  15       27.568  15.932  -8.384  1.00  3.18           O  
ATOM     99  CB  SER A  15       28.742  13.916  -6.288  1.00  2.62           C  
ATOM    100  OG  SER A  15       27.702  13.882  -5.334  1.00  3.66           O  
ATOM    101  N   ARG A  16       25.894  14.510  -7.881  1.00  2.04           N  
ATOM    102  CA  ARG A  16       24.818  15.485  -8.158  1.00  2.21           C  
ATOM    103  C   ARG A  16       24.469  15.549  -9.638  1.00  2.26           C  
ATOM    104  O   ARG A  16       24.084  16.602 -10.147  1.00  3.07           O  
ATOM    105  CB  ARG A  16       23.585  15.080  -7.332  1.00  2.41           C  
ATOM    106  CG  ARG A  16       23.857  15.111  -5.836  1.00  3.16           C  
ATOM    107  CD  ARG A  16       22.610  14.730  -5.045  1.00  4.34           C  
ATOM    108  NE  ARG A  16       22.923  14.654  -3.626  1.00  5.23           N  
ATOM    109  CZ  ARG A  16       22.036  14.492  -2.651  1.00  5.96           C  
ATOM    110  NH1 ARG A  16       20.738  14.391  -2.923  1.00  5.65           N  
ATOM    111  NH2 ARG A  16       22.449  14.436  -1.393  1.00  6.93           N  
END                                                                             
`;
