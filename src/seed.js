/*
 * Datos de ejemplo (mock ORT · Adm. de Empresas), basados en el `base` de renderVals()
 * en Cursada.dc.html. Editá este archivo y volvé a correr `npm run build:app` para
 * cambiar la semilla con la que arranca la app la primera vez.
 *
 * Fechas: la agenda/calendario semilla están fechados en ago–dic 2026, coherente con
 * el "hoy" real usado por la app (agosto de 2026). agenda.materiaCod se resuelve a un
 * materiaId real en el primer arranque (ver runtime.js seedIfEmpty()).
 *
 * Notas de materia: a diferencia del mock original (que guardaba `parciales` como un
 * array de números sueltos en la materia), acá cada nota vive en el campo `nota` de
 * la evaluación (agenda) a la que corresponde — así se puede ver/editar de qué
 * evaluación puntual salió cada nota. Los VALORES de nota son los mismos que traía el
 * mock; lo que cambió es dónde viven. Para las materias donde el mock sólo daba los
 * números sin nombre de evaluación (todas menos Contabilidad II), se inventaron
 * títulos y fechas razonables para poder colgar esos números de un registro real.
 */

const CURSADA_SEED = {
  // Semestre semilla al que se asignan todas las materias de ejemplo. Cambiá
  // el nombre acá si querés que el primer arranque arranque con otro rótulo
  // (no hace falta fecha ni formato particular — es texto libre, igual que
  // cualquier semestre que cree un usuario real desde la app).
  semestre: { nombre: '2026 · Segundo semestre' },
  materias: [
    { cod: 'CON-201', nombre: 'Contabilidad II', doc: 'Prof. Martín Sosa', colorId: 'azul', creditos: 8, salon: 'Edificio Central · Aula 402', bloques: [{ dia: 1, ini: 18, fin: 20 }, { dia: 3, ini: 18, fin: 20 }], esc: { tipo: 'puntos', total: 100, aprob: 60 }, estado: 'cursando' },
    { cod: 'ECO-110', nombre: 'Microeconomía', doc: 'Prof. Lucía Ferreira', colorId: 'coral', creditos: 6, salon: 'Edificio Cuareim · Aula 210', bloques: [{ dia: 2, ini: 19, fin: 21 }, { dia: 4, ini: 19, fin: 21 }], esc: { tipo: 'nota', total: 12, aprob: 6 }, estado: 'cursando' },
    { cod: 'DER-140', nombre: 'Derecho Comercial', doc: 'Dr. Andrés Bermúdez', colorId: 'violeta', creditos: 6, salon: 'Edificio Central · Aula 118', bloques: [{ dia: 2, ini: 17, fin: 19 }], esc: { tipo: 'nota', total: 12, aprob: 3 }, estado: 'cursando' },
    { cod: 'MKT-230', nombre: 'Marketing Estratégico', doc: 'Prof. Valeria Ríos', colorId: 'turquesa', creditos: 8, salon: 'Edificio Pocitos · Aula 305', bloques: [{ dia: 3, ini: 20, fin: 22 }, { dia: 5, ini: 20, fin: 22 }], esc: { tipo: 'pct', total: 100, aprob: 80 }, estado: 'cursando' },
    { cod: 'EST-120', nombre: 'Estadística Aplicada', doc: 'Prof. Gonzalo Pérez', colorId: 'amarillo', creditos: 6, salon: 'Edificio Central · Aula 402', bloques: [{ dia: 1, ini: 20, fin: 22 }], esc: { tipo: 'puntos', total: 60, aprob: 30 }, estado: 'cursando' },
    { cod: 'ADM-150', nombre: 'Comportamiento Organizacional', doc: 'Prof. Silvana Núñez', colorId: 'indigo', creditos: 4, salon: 'Edificio Cuareim · Aula 007', bloques: [{ dia: 6, ini: 9, fin: 12 }], esc: { tipo: 'nota', total: 12, aprob: 3 }, estado: 'aprobada' },
    { cod: 'FIN-260', nombre: 'Finanzas Corporativas', doc: 'Prof. Diego Lamas', colorId: 'rosa', creditos: 8, salon: '', bloques: [], esc: { tipo: 'puntos', total: 100, aprob: 50 }, estado: 'pendiente' }
  ],

  // materiaCod: null => evento sin materia (no debería pasar en agenda; usar personal[] para eso)
  // nota: null/ausente => todavía no calificada (se ve en Detalle como "pendiente")
  agenda: [
    { materiaCod: 'EST-120', tipo: 'Tarea', titulo: 'Ejercicios de probabilidad · cap. 4', fecha: '2026-08-28', hora: '23:59', hecho: false },
    { materiaCod: 'CON-201', tipo: 'Parcial', titulo: 'Parcial 1 · unidades 1 a 4', fecha: '2026-09-02', hora: '18:00', hecho: false, nota: 82 },
    { materiaCod: 'MKT-230', tipo: 'Entrega', titulo: 'Entrega TP investigación de mercado', fecha: '2026-09-03', hora: '23:59', hecho: false },
    { materiaCod: 'ECO-110', tipo: 'Tarea', titulo: 'Ejercicios cap. 5 · elasticidad', fecha: '2026-09-07', hora: '19:00', hecho: false },
    { materiaCod: 'DER-140', tipo: 'Presentación', titulo: 'Presentación grupal · fallo Cousa', fecha: '2026-09-08', hora: '18:00', hecho: false },
    { materiaCod: 'EST-120', tipo: 'Parcial', titulo: 'Parcial 2 · inferencia estadística', fecha: '2026-09-10', hora: '20:00', hecho: false, nota: 30 },
    { materiaCod: 'CON-201', tipo: 'Entrega', titulo: 'Trabajo práctico · estados contables', fecha: '2026-09-14', hora: '23:59', hecho: false },
    { materiaCod: 'ECO-110', tipo: 'Parcial', titulo: 'Parcial 2 · microeconomía aplicada', fecha: '2026-09-18', hora: '19:00', hecho: false, nota: 3 },
    { materiaCod: 'DER-140', tipo: 'Final', titulo: 'Final · Derecho Comercial', fecha: '2026-09-24', hora: '19:00', hecho: false },
    { materiaCod: 'MKT-230', tipo: 'Parcial', titulo: 'Parcial 2 · Marketing Estratégico', fecha: '2026-09-29', hora: '20:00', hecho: false, nota: 88 },
    { materiaCod: 'CON-201', tipo: 'Parcial', titulo: 'Parcial 2 · unidades 5 a 8', fecha: '2026-10-07', hora: '18:00', hecho: false, nota: 58 },
    { materiaCod: 'CON-201', tipo: 'Tarea', titulo: 'Ejercicios de conciliación bancaria', fecha: '2026-08-24', hora: '23:59', hecho: true },
    { materiaCod: 'CON-201', tipo: 'Final', titulo: 'Examen final', fecha: '2026-12-04', hora: '19:00', hecho: false },
    { materiaCod: 'ECO-110', tipo: 'Parcial', titulo: 'Parcial 1 · oferta y demanda', fecha: '2026-08-19', hora: '19:00', hecho: true, nota: 4 },
    { materiaCod: 'DER-140', tipo: 'Parcial', titulo: 'Parcial 1 · contratos', fecha: '2026-08-20', hora: '17:00', hecho: true, nota: 5 },
    { materiaCod: 'DER-140', tipo: 'Parcial', titulo: 'Parcial 2 · sociedades comerciales', fecha: '2026-09-15', hora: '17:00', hecho: false, nota: 6 },
    { materiaCod: 'MKT-230', tipo: 'Parcial', titulo: 'Parcial 1 · Marketing Estratégico', fecha: '2026-08-21', hora: '20:00', hecho: true, nota: 92 },
    { materiaCod: 'EST-120', tipo: 'Parcial', titulo: 'Parcial 1 · probabilidad', fecha: '2026-08-17', hora: '20:00', hecho: true, nota: 32 },
    { materiaCod: 'ADM-150', tipo: 'Parcial', titulo: 'Parcial único', fecha: '2026-08-08', hora: '09:00', hecho: true, nota: 11 }
  ],

  personal: [
    { titulo: 'Cena en casa de mis viejos', fecha: '2026-09-04', hora: '20:30', todoElDia: false },
    { titulo: 'Gimnasio', fecha: '2026-09-14', hora: '07:00', todoElDia: false },
    { titulo: 'Médico', fecha: '2026-09-16', hora: '15:30', todoElDia: false },
    { titulo: 'Cumple de Sofi', fecha: '2026-09-22', hora: '', todoElDia: true }
  ]
};

if (typeof module !== 'undefined') module.exports = CURSADA_SEED;
