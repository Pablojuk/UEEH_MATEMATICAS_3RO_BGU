-- Provisioning Unit 7 Activities & Private Grading Configurations
DO $$
DECLARE
  v_gam_id UUID;
  v_class_id UUID;
  v_gam_config JSONB;
  v_class_config JSONB;
BEGIN
  -- 1. Upsert Gamificación Activity
  INSERT INTO public.activities (
    activity_key,
    class_section_id,
    academic_term_id,
    title,
    activity_type,
    attempt_policy,
    unit_number,
    max_score,
    minimum_score,
    is_active,
    opens_at,
    due_at,
    display_order,
    source_path
  ) VALUES (
    'u7-binomial-gam-01',
    'd9603077-3914-491d-898b-d6d0fc93e574',
    '04bd8f4f-44e4-4e9b-90e9-88d46e57f1af',
    'Gamificación: Frogger 1981 (Distribución Binomial)',
    'gamification',
    'gamification_unlimited',
    7,
    10.00,
    1.00,
    true,
    '2026-08-29 00:00:00-05',
    '2026-09-15 23:59:59-05',
    1,
    'topics/unit7-binomial/gamificacion.html'
  )
  ON CONFLICT (activity_key) DO UPDATE SET
    title = EXCLUDED.title,
    activity_type = EXCLUDED.activity_type,
    attempt_policy = EXCLUDED.attempt_policy,
    unit_number = EXCLUDED.unit_number,
    max_score = EXCLUDED.max_score,
    minimum_score = EXCLUDED.minimum_score,
    is_active = EXCLUDED.is_active,
    opens_at = EXCLUDED.opens_at,
    due_at = EXCLUDED.due_at,
    display_order = EXCLUDED.display_order,
    source_path = EXCLUDED.source_path
  RETURNING id INTO v_gam_id;

  -- 2. Upsert Trabajo en Clase Activity
  INSERT INTO public.activities (
    activity_key,
    class_section_id,
    academic_term_id,
    title,
    activity_type,
    attempt_policy,
    unit_number,
    max_score,
    minimum_score,
    is_active,
    opens_at,
    due_at,
    display_order,
    source_path
  ) VALUES (
    'u7-binomial-class-01',
    'd9603077-3914-491d-898b-d6d0fc93e574',
    '04bd8f4f-44e4-4e9b-90e9-88d46e57f1af',
    'Trabajo en Clase: Distribución Binomial',
    'classwork',
    'classwork_limited',
    7,
    10.00,
    1.00,
    true,
    '2026-08-29 00:00:00-05',
    '2026-09-15 23:59:59-05',
    2,
    'topics/unit7-binomial/deber.html'
  )
  ON CONFLICT (activity_key) DO UPDATE SET
    title = EXCLUDED.title,
    activity_type = EXCLUDED.activity_type,
    attempt_policy = EXCLUDED.attempt_policy,
    unit_number = EXCLUDED.unit_number,
    max_score = EXCLUDED.max_score,
    minimum_score = EXCLUDED.minimum_score,
    is_active = EXCLUDED.is_active,
    opens_at = EXCLUDED.opens_at,
    due_at = EXCLUDED.due_at,
    display_order = EXCLUDED.display_order,
    source_path = EXCLUDED.source_path
  RETURNING id INTO v_class_id;

  -- 3. Prepare Private Grading Configuration for Gamificación
  v_gam_config := $JSON$
  {
    "exercises": {
      "level01-q01": {
        "type": "mcq",
        "correctIndex": 0,
        "solution_html": "Identificamos los parámetros: \\( n=10, p=0.7, q=0.3, k=5 \\).<br>1. Coeficiente: \\( \\binom{10}{5} = \\frac{10!}{5!5!} = 252 \\).<br>2. Potencias: \\( (0.7)^5 = 0.16807 \\), \\( (0.3)^5 = 0.00243 \\).<br>3. Multiplicación: \\( P(X=5) = 252 \\times 0.16807 \\times 0.00243 \\approx 0.1029 \\) (\\( 10.29\\% \\))."
      },
      "level01-q02": {
        "type": "mcq",
        "correctIndex": 0,
        "solution_html": "Identificamos \\( n=8, p=0.8, q=0.2 \\).<br>1. \\( P(X=0) = \\binom{8}{0} (0.8)^0 (0.2)^8 = 1 \\times 1 \\times 0.00000256 = 0.00000256 \\).<br>2. \\( P(X=1) = \\binom{8}{1} (0.8)^1 (0.2)^7 = 8 \\times 0.8 \\times 0.0000128 = 0.00008192 \\).<br>3. Suma: \\( P(X \\le 1) = 0.00000256 + 0.00008192 = 0.00008448 \\approx 0.000084 \\)."
      },
      "level01-q03": {
        "type": "mcq",
        "correctIndex": 0,
        "solution_html": "Identificamos \\( n=6, p=0.8, q=1 - 0.8 = 0.2 \\).<br>1. Esperanza: \\( E(X) = n \\cdot p = 6 \\times 0.8 = 4.8 \\).<br>2. Varianza: \\( \\operatorname{Var}(X) = n \\cdot p \\cdot q = 6 \\times 0.8 \\times 0.2 = 0.96 \\)."
      },
      "level01-q04": {
        "type": "mcq",
        "correctIndex": 0,
        "solution_html": "Identificamos \\( n=5, p=0.6, q=0.4 \\).<br>1. \\( P(X=4) = \\binom{5}{4}(0.6)^4(0.4)^1 = 5 \\times 0.1296 \\times 0.4 = 0.2592 \\).<br>2. \\( P(X=5) = \\binom{5}{5}(0.6)^5(0.4)^0 = 1 \\times 0.07776 \\times 1 = 0.07776 \\).<br>3. Suma: \\( P(X \\ge 4) = 0.2592 + 0.07776 = 0.33696 \\approx 0.3370 \\) (\\( 33.70\\% \\))."
      },
      "level01-q05": {
        "type": "mcq",
        "correctIndex": 0,
        "solution_html": "Cada pregunta tiene 4 alternativas: \\( p = \\frac{1}{4} = 0.25 \\), \\( q = 0.75 \\), \\( n=6, k=2 \\).<br>1. \\( \\binom{6}{2} = 15 \\).<br>2. \\( (0.25)^2 = 0.0625 \\), \\( (0.75)^4 = 0.31640625 \\).<br>3. \\( P(X=2) = 15 \\times 0.0625 \\times 0.31640625 = 0.29663 \\approx 0.2966 \\) (\\( 29.66\\% \\))."
      },
      "level01-q06": {
        "type": "mcq",
        "correctIndex": 0,
        "solution_html": "Tenemos \\( E(X) = n p = 18 \\) y \\( \\operatorname{Var}(X) = n p q = 4.8 \\).<br>1. Cociente: \\( \\frac{\\operatorname{Var}(X)}{E(X)} = \\frac{n p q}{n p} = q = \\frac{4.8}{18} = \\frac{4}{15} \\approx 0.2667 \\).<br>2. Probabilidad de éxito: \\( p = 1 - q = 1 - \\frac{4}{15} = \\frac{11}{15} \\approx 0.7333 \\).<br>3. Número de ensayos: \\( n = \\frac{E(X)}{p} = \\frac{18}{11/15} = \\frac{270}{11} \\approx 24.55 \\)."
      }
    }
  }
  $JSON$::jsonb;

  -- 4. Prepare Private Grading Configuration for Trabajo en Clase
  v_class_config := $JSON$
  {
    "exercises": {
      "initial-q01": { "type": "mcq", "correctIndex": 0, "solution_html": "\\[ P(X=3) = \\binom{5}{3}(0.5)^3(0.5)^2 = 10 \\cdot (0.5)^5 = 10 \\cdot 0.03125 = 0.3125 = \\frac{5}{16} \\]" },
      "initial-q02": { "type": "input", "acceptedAnswers": ["0.3164", "0.31640625", "0.316", "81/256", "0,3164", "0,31640625"], "solution_html": "\\[ P(X=0) = \\binom{4}{0}(0.25)^0(0.75)^4 = (0.75)^4 = \\frac{81}{256} \\approx 0.3164 \\]" },
      "initial-q03": { "type": "mcq", "correctIndex": 0, "solution_html": "\\[ P(X=5) = \\binom{10}{5}(0.5)^5(0.5)^5 = 252 \\cdot (0.5)^{10} = \\frac{252}{1024} = \\frac{63}{256} \\approx 0.2461 \\]" },
      "initial-q04": { "type": "fill", "blanks": [{ "accepted": ["3.6", "3,6", "18/5"] }, { "accepted": ["1.44", "1,44", "36/25"] }], "solution_html": "\\[ E(X) = n \\cdot p = 6 \\cdot 0.6 = 3.6 \\] \\[ Var(X) = n \\cdot p \\cdot q = 6 \\cdot 0.6 \\cdot 0.4 = 1.44 \\]" },
      "initial-q05": { "type": "order", "correctOrder": ["s1", "s2", "s3", "s4"], "solution_html": "\\[ P(X \\le 1) = P(X=0) + P(X=1) \\] \\[ P(X=0) = (0.7)^8 \\approx 0.0576, \\quad P(X=1) = 8(0.3)(0.7)^7 \\approx 0.1977 \\] \\[ P(X \\le 1) = 0.057648 + 0.197650 = 0.255298 \\approx 0.2553 \\]" },
      "initial-q06": { "type": "mcq", "correctIndex": 0, "solution_html": "\\[ P(X \\ge 4) = P(X=4) + P(X=5) \\] \\[ P(X=4) = \\binom{5}{4}(0.8)^4(0.2)^1 = 5(0.4096)(0.2) = 0.4096 \\] \\[ P(X=5) = \\binom{5}{5}(0.8)^5 = 0.32768 \\] \\[ P(X \\ge 4) = 0.4096 + 0.32768 = 0.73728 \\approx 0.7373 \\]" },
      "initial-q07": { "type": "mcq", "correctIndex": 0, "solution_html": "En el examen: \\( n = 5 \\), \\( p = 1/4 = 0.25 \\), \\( q = 0.75 \\). Acertar 2 preguntas:\n\\[ P(X=2) = \\binom{5}{2}(0.25)^2(0.75)^3 = 10(0.0625)(0.421875) = \\frac{135}{512} \\approx 0.2637 \\]" },
      "initial-q08": { "type": "fill", "blanks": [{ "accepted": ["20"] }, { "accepted": ["0.6", "0,6", "3/5"] }], "solution_html": "\\[ \\frac{Var(X)}{E(X)} = \\frac{n \\cdot p \\cdot q}{n \\cdot p} = q = \\frac{4.8}{12} = 0.4 \\implies p = 1 - 0.4 = 0.6 \\] \\[ E(X) = n \\cdot p = 12 \\implies n(0.6) = 12 \\implies n = 20 \\]" },
      "initial-q09": { "type": "input", "acceptedAnswers": ["0.015625", "0.0156", "1/64", "0,015625", "0,0156"], "solution_html": "\\[ P(X=0) = (0.5)^7 = \\frac{1}{128}, \\quad P(X=7) = (0.5)^7 = \\frac{1}{128} \\] \\[ P(X=0) + P(X=7) = \\frac{1}{128} + \\frac{1}{128} = \\frac{2}{128} = \\frac{1}{64} = 0.015625 \\]" },
      "initial-q10": { "type": "mcq", "correctIndex": 0, "solution_html": "Defectuosos \\( p = 0.05 \\), \\( q = 0.95 \\), \\( n = 20 \\):\n\\[ P(X=0) = \\binom{20}{0}(0.05)^0(0.95)^{20} = (0.95)^{20} \\approx 0.3585 \\]" },
      "initial-q11": { "type": "mcq", "correctIndex": 0, "solution_html": "\\[ P(X=4) = \\binom{9}{4}(0.4)^4(0.6)^5 = 126 \\cdot (0.0256) \\cdot (0.07776) \\approx 0.2508 \\]" },
      "initial-q12": { "type": "input", "acceptedAnswers": ["1.732", "1.73", "sqrt(3)", "\\sqrt{3}", "1,732", "1,73"], "solution_html": "\\[ \\sigma = \\sqrt{n \\cdot p \\cdot q} = \\sqrt{16 \\cdot 0.25 \\cdot 0.75} = \\sqrt{4 \\cdot 0.75} = \\sqrt{3} \\approx 1.732 \\]" },
      "initial-q13": { "type": "mcq", "correctIndex": 0, "solution_html": "Falso: Una condición intrínseca del experimento binomial es que el número de ensayos \\( n \\) es constante y fijado previamente." },
      "initial-q14": { "type": "mcq", "correctIndex": 0, "solution_html": "Verdadero: Los ensayos deben ser estocásticamente independientes entre sí para que la probabilidad \\( p \\) no varíe." },
      "initial-q15": { "type": "mcq", "correctIndex": 0, "solution_html": "Verdadero: La suma de todas las probabilidades de la función de masa abarca todo el espacio muestral: \\( \\sum_{k=0}^n P(X=k) = 1 \\)." },
      "initial-q16": { "type": "mcq", "correctIndex": 0, "solution_html": "Falso: El parámetro \\( p \\) es la probabilidad propia de cada ensayo y no depende de cuántos ensayos \\( n \\) se realicen." },
      "initial-q17": { "type": "mcq", "correctIndex": 0, "solution_html": "Banano: \\( n = 15, p = 0.08, q = 0.92 \\).\n\\[ P(X \\le 2) = P(0) + P(1) + P(2) \\]\n\\[ P(0) = (0.92)^{15} \\approx 0.2863 \\]\n\\[ P(1) = 15(0.08)(0.92)^{14} \\approx 0.3734 \\]\n\\[ P(2) = 105(0.08)^2(0.92)^{13} \\approx 0.2273 \\]\n\\[ P(X \\le 2) = 0.2863 + 0.3734 + 0.2273 = 0.8870 \\text{ (88.70\\%)} \\]" },
      "initial-q18": { "type": "fill", "blanks": [{ "accepted": ["23", "23.0"] }, { "accepted": ["0.1244", "0.124", "12.44%", "0,1244", "0,124"] }], "solution_html": "Maíz: \\( n = 25, p = 0.92 \\).\n\\[ E(X) = n \\cdot p = 25 \\cdot 0.92 = 23 \\text{ semillas} \\]\n\\[ P(X = 25) = (0.92)^{25} \\approx 0.1244 \\text{ (12.44\\%)} \\]" },
      "initial-q19": { "type": "order", "correctOrder": ["r1", "r2", "r3", "r4"], "solution_html": "Para \\( X \\sim B(4, 0.5) \\):\n1. \\( P(X=k) = \\binom{4}{k} \\frac{1}{16} \\).\n2. Probabilidades: \\( 1/16, 4/16, 6/16, 4/16, 1/16 \\).\n3. Suma ponderada: \\( E(X) = 0(1/16) + 1(4/16) + 2(6/16) + 3(4/16) + 4(1/16) \\).\n4. \\( E(X) = \\frac{0 + 4 + 12 + 12 + 4}{16} = \\frac{32}{16} = 2 \\), coincidiendo con \\( n p = 4(0.5) = 2 \\)." },
      "initial-q20": { "type": "input", "acceptedAnswers": ["0.186624", "0.1866", "0.187", "0,186624", "0,1866"], "solution_html": "Relación de recurrencia: \\( P(X=k+1) = P(X=k) \\cdot \\frac{n-k}{k+1} \\cdot \\frac{p}{q} \\).\nPara \\( k=0, n=6, p=0.4, q=0.6 \\):\n\\[ P(X=1) = P(X=0) \\cdot \\frac{6-0}{0+1} \\cdot \\frac{0.4}{0.6} = 0.046656 \\cdot 6 \\cdot \\frac{2}{3} = 0.046656 \\cdot 4 = 0.186624 \\]" }
    },
    "recoveryExercises": {
      "recovery-r01": { "type": "fill", "blanks": [{ "accepted": ["12"] }, { "accepted": ["0.5", "0,5", "1/2"] }], "solution_html": "En 12 lanzamientos de una moneda equilibrada, el número de repeticiones es \\( n = 12 \\) y la probabilidad de cara es \\( p = 0.5 \\)." },
      "recovery-r02": { "type": "input", "acceptedAnswers": ["0.25", "0,25", "1/4"], "solution_html": "\\[ q = 1 - p = 1 - 0.75 = 0.25 \\]" },
      "recovery-r03": { "type": "input", "acceptedAnswers": ["6", "6.0", "6,0"], "solution_html": "\\[ E(X) = n \\cdot p = 30 \\cdot 0.2 = 6 \\]" },
      "recovery-r04": { "type": "input", "acceptedAnswers": ["5", "5.0", "5,0"], "solution_html": "\\[ Var(X) = n \\cdot p \\cdot q = 20 \\cdot 0.5 \\cdot 0.5 = 5 \\]" },
      "recovery-r05": { "type": "input", "acceptedAnswers": ["4.8", "4,8", "24/5"], "solution_html": "\\[ \\sigma = \\sqrt{n \\cdot p \\cdot q} = \\sqrt{100 \\cdot 0.36 \\cdot 0.64} = \\sqrt{23.04} = 4.8 \\]" },
      "recovery-r06": { "type": "mcq", "correctIndex": 0, "solution_html": "\\[ P(X=0) = (1-p)^n = (0.8)^3 = 0.512 \\]" },
      "recovery-r07": { "type": "mcq", "correctIndex": 0, "solution_html": "\\[ P(X=4) = p^n = (0.5)^4 = 0.0625 = \\frac{1}{16} \\]" },
      "recovery-r08": { "type": "order", "correctOrder": ["o1", "o2", "o3", "o4"], "solution_html": "Para \\( X \\sim B(3, 0.5) \\):\n\\[ P(X=1) = \\binom{3}{1} (0.5)^1 (0.5)^2 = 3 \\cdot 0.5 \\cdot 0.25 = 0.375 \\]" },
      "recovery-r09": { "type": "fill", "blanks": [{ "accepted": ["k"] }, { "accepted": ["n-k", "n - k"] }], "solution_html": "Fórmula binomial: \\[ P(X=k) = \\binom{n}{k} p^k q^{n-k} \\]" },
      "recovery-r10": { "type": "input", "acceptedAnswers": ["8", "8.0", "8,0"], "solution_html": "\\[ E(X) = n \\cdot p = 10 \\cdot 0.8 = 8 \\text{ pacientes} \\]" }
    }
  }
  $JSON$::jsonb;

  -- 5. Upsert Private Grading Config for Gamificación
  INSERT INTO private.activity_grading_configs (
    activity_id,
    grader_type,
    config
  ) VALUES (
    v_gam_id,
    'exercise_set',
    v_gam_config
  )
  ON CONFLICT (activity_id) DO UPDATE SET
    grader_type = EXCLUDED.grader_type,
    config = EXCLUDED.config;

  -- 6. Upsert Private Grading Config for Trabajo en Clase
  INSERT INTO private.activity_grading_configs (
    activity_id,
    grader_type,
    config
  ) VALUES (
    v_class_id,
    'exercise_set',
    v_class_config
  )
  ON CONFLICT (activity_id) DO UPDATE SET
    grader_type = EXCLUDED.grader_type,
    config = EXCLUDED.config;

END $$;
