-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRACIÓN DE APROVISIONAMIENTO: UNIDAD 8 - DISTRIBUCIÓN NORMAL
-- Actividades: Gamificación (Bomberman Z-Gauss 3D) y Trabajo en Clase
-- Pautas Privadas y Política de Promedio Oficial (recovery_policy = 'average')
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_gam_id UUID;
  v_class_id UUID;
  v_section_id UUID := 'd9603077-3914-491d-898b-d6d0fc93e574';
  v_term_id UUID := '04bd8f4f-44e4-4e9b-90e9-88d46e57f1af';
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
    'u8-normal-gam-01',
    v_section_id,
    v_term_id,
    'Gamificación: Bomberman Z-Gauss 3D (Distribución Normal)',
    'gamification',
    'gamification_unlimited',
    8,
    10.00,
    1.00,
    false, -- Conservada inactiva hasta configuración docente
    '2026-10-26 00:00:00-05',
    '2026-11-15 23:59:59-05',
    1,
    'topics/unit8-normal/gamificacion.html'
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
    'u8-normal-class-01',
    v_section_id,
    v_term_id,
    'Trabajo en Clase: Distribución Normal',
    'classwork',
    'classwork_limited',
    8,
    10.00,
    1.00,
    false, -- Conservada inactiva hasta configuración docente
    '2026-10-26 00:00:00-05',
    '2026-11-15 23:59:59-05',
    2,
    'topics/unit8-normal/deber.html'
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

  -- 3. Configuración Privada para Gamificación
  v_gam_config := $JSON$
{
  "exercises": {
    "level01-q01": {
      "type": "mcq",
      "correctOptionKey": "opt-a",
      "correct_option": "opt-a",
      "solution_html": "Identificamos \\(\\mu = 50\\), \\(\\sigma = 8\\) y \\(x = 62\\). Aplicamos la fórmula de estandarización:\n        \\[ z = \\frac{x - \\mu}{\\sigma} = \\frac{62 - 50}{8} = \\frac{12}{8} = \\mathbf{1.5} \\]"
    },
    "level01-q02": {
      "type": "mcq",
      "correctOptionKey": "opt-a",
      "correct_option": "opt-a",
      "solution_html": "Identificamos \\(\\mu = 30\\), \\(\\sigma = 5\\) y \\(x = 22.5\\). Sustituimos en la fórmula:\n        \\[ z = \\frac{x - \\mu}{\\sigma} = \\frac{22.5 - 30}{5} = \\frac{-7.5}{5} = \\mathbf{-1.5} \\]"
    },
    "level01-q03": {
      "type": "mcq",
      "correctOptionKey": "opt-a",
      "correct_option": "opt-a",
      "solution_html": "Con \\(\\mu = 8\\), \\(\\sigma = 0.5\\) y \\(x = 8.75\\), estandarizamos:\n        \\[ z = \\frac{8.75 - 8}{0.5} = \\frac{0.75}{0.5} = \\mathbf{1.5} \\]"
    },
    "level01-q04": {
      "type": "mcq",
      "correctOptionKey": "opt-a",
      "correct_option": "opt-a",
      "solution_html": "1) Estandarizamos el límite \\(x = 115\\) con \\(\\mu = 100\\) y \\(\\sigma = 15\\):\n        \\[ z = \\frac{115 - 100}{15} = \\frac{15}{15} = 1 \\]\n        2) Buscamos el área a la izquierda en la tabla:\n        \\[ P(X < 115) = P(Z < 1) = \\Phi(1) = \\mathbf{0.8413} \\;\\;(84.13\\%) \\]"
    },
    "level01-q05": {
      "type": "mcq",
      "correctOptionKey": "opt-a",
      "correct_option": "opt-a",
      "solution_html": "1) Estandarizamos ambos límites con \\(\\mu = 100\\) y \\(\\sigma = 15\\):\n        \\[ z_a = \\frac{85 - 100}{15} = -1, \\qquad z_b = \\frac{115 - 100}{15} = 1 \\]\n        2) Restamos las probabilidades acumuladas usando \\(\\Phi(1) = 0.8413\\) y \\(\\Phi(-1) = 1 - 0.8413 = 0.1587\\):\n        \\[ P(85 < X < 115) = \\Phi(1) - \\Phi(-1) = 0.8413 - 0.1587 = \\mathbf{0.6826} \\;\\;(68.26\\%) \\]"
    },
    "level01-q06": {
      "type": "mcq",
      "correctOptionKey": "opt-a",
      "correct_option": "opt-a",
      "solution_html": "1) Estandarizamos \\(x = 62\\) con \\(\\mu = 50\\) y \\(\\sigma = 8\\):\n        \\[ z = \\frac{62 - 50}{8} = \\frac{12}{8} = 1.5 \\]\n        2) Como es cola derecha, aplicamos el complemento con \\(\\Phi(1.5) = 0.9332\\):\n        \\[ P(X > 62) = P(Z > 1.5) = 1 - \\Phi(1.5) = 1 - 0.9332 = \\mathbf{0.0668} \\;\\;(6.68\\%) \\]"
    }
  }
}
$JSON$::jsonb;

  -- 4. Configuración Privada para Trabajo en Clase (con recovery_policy = 'average')
  v_class_config := $JSON$
{
  "recovery_policy": "average",
  "exercises": {
    "initial-q01": {
      "type": "input",
      "mode": "input",
      "solution_html": "Identificamos \\(\\mu = 50\\), \\(\\sigma = 8\\) y \\(x = 62\\). Aplicamos la fórmula de estandarización:\n        \\[ z = \\frac{x - \\mu}{\\sigma} = \\frac{62 - 50}{8} = \\frac{12}{8} = \\mathbf{1.5} \\]",
      "acceptedAnswers": [
        "1.5",
        "+1.5",
        "1.50",
        "3/2",
        "z=1.5"
      ],
      "accepted_answers": [
        "1.5",
        "+1.5",
        "1.50",
        "3/2",
        "z=1.5"
      ],
      "numericTarget": 1.5,
      "numericTolerance": 0.001
    },
    "initial-q02": {
      "type": "input",
      "mode": "input",
      "solution_html": "Identificamos \\(\\mu = 120\\), \\(\\sigma = 15\\) y \\(x = 90\\). Sustituimos:\n        \\[ z = \\frac{x - \\mu}{\\sigma} = \\frac{90 - 120}{15} = \\frac{-30}{15} = \\mathbf{-2} \\]",
      "acceptedAnswers": [
        "-2",
        "-2.0",
        "-2.00",
        "z=-2"
      ],
      "accepted_answers": [
        "-2",
        "-2.0",
        "-2.00",
        "z=-2"
      ],
      "numericTarget": -2,
      "numericTolerance": 0.001
    },
    "initial-q03": {
      "type": "input",
      "mode": "input",
      "solution_html": "Con \\(\\mu = 30\\), \\(\\sigma = 5\\) y \\(x = 22.5\\), estandarizamos:\n        \\[ z = \\frac{22.5 - 30}{5} = \\frac{-7.5}{5} = \\mathbf{-1.5} \\]",
      "acceptedAnswers": [
        "-1.5",
        "-1.50",
        "-3/2",
        "z=-1.5"
      ],
      "accepted_answers": [
        "-1.5",
        "-1.50",
        "-3/2",
        "z=-1.5"
      ],
      "numericTarget": -1.5,
      "numericTolerance": 0.001
    },
    "initial-q04": {
      "type": "input",
      "mode": "input",
      "solution_html": "Con \\(\\mu = 500\\), \\(\\sigma = 100\\) y \\(x = 730\\), calculamos:\n        \\[ z = \\frac{730 - 500}{100} = \\frac{230}{100} = \\mathbf{2.3} \\]",
      "acceptedAnswers": [
        "2.3",
        "+2.3",
        "2.30",
        "23/10",
        "z=2.3"
      ],
      "accepted_answers": [
        "2.3",
        "+2.3",
        "2.30",
        "23/10",
        "z=2.3"
      ],
      "numericTarget": 2.3,
      "numericTolerance": 0.001
    },
    "initial-q05": {
      "type": "input",
      "mode": "input",
      "solution_html": "Con \\(\\mu = 8\\), \\(\\sigma = 0.5\\) y \\(x = 8.75\\):\n        \\[ z = \\frac{8.75 - 8}{0.5} = \\frac{0.75}{0.5} = \\mathbf{1.5} \\]",
      "acceptedAnswers": [
        "1.5",
        "+1.5",
        "1.50",
        "3/2",
        "z=1.5"
      ],
      "accepted_answers": [
        "1.5",
        "+1.5",
        "1.50",
        "3/2",
        "z=1.5"
      ],
      "numericTarget": 1.5,
      "numericTolerance": 0.001
    },
    "initial-q06": {
      "type": "input",
      "mode": "input",
      "solution_html": "Usamos la relación inversa (des-estandarización) con \\(\\mu = 200\\), \\(\\sigma = 25\\) y \\(z = -1.6\\):\n        \\[ x = \\mu + z\\sigma = 200 + (-1.6)(25) = 200 - 40 = \\mathbf{160} \\]",
      "acceptedAnswers": [
        "160",
        "160.0",
        "x=160"
      ],
      "accepted_answers": [
        "160",
        "160.0",
        "x=160"
      ],
      "numericTarget": 160,
      "numericTolerance": 0.001
    },
    "initial-q07": {
      "type": "mcq",
      "mode": "mcq",
      "solution_html": "Estandarizamos \\(x = 115\\) en \\(X \\sim N(100, 15)\\):\n        \\[ z = \\frac{115 - 100}{15} = 1 \\implies P(X < 115) = \\Phi(1) = \\mathbf{0.8413} \\;\\;(84.13\\%) \\]",
      "correctOptionKey": "opt-a",
      "correct_option": "opt-a"
    },
    "initial-q08": {
      "type": "mcq",
      "mode": "mcq",
      "solution_html": "Estandarizamos \\(x = 130\\) en \\(X \\sim N(100, 15)\\):\n        \\[ z = \\frac{130 - 100}{15} = 2 \\implies P(X > 130) = 1 - \\Phi(2) = 1 - 0.9772 = \\mathbf{0.0228} \\;\\;(2.28\\%) \\]",
      "correctOptionKey": "opt-b",
      "correct_option": "opt-b"
    },
    "initial-q09": {
      "type": "mcq",
      "mode": "mcq",
      "solution_html": "Estandarizamos ambos extremos en \\(X \\sim N(100, 15)\\):\n        \\[ z_a = \\frac{85 - 100}{15} = -1, \\quad z_b = \\frac{115 - 100}{15} = 1 \\]\n        \\[ P(85 < X < 115) = \\Phi(1) - \\Phi(-1) = 0.8413 - (1 - 0.8413) = 0.8413 - 0.1587 = \\mathbf{0.6826} \\;\\;(68.26\\%) \\]",
      "correctOptionKey": "opt-c",
      "correct_option": "opt-c"
    },
    "initial-q10": {
      "type": "mcq",
      "mode": "mcq",
      "solution_html": "Estandarizamos \\(x = 42\\) en \\(X \\sim N(50, 8)\\):\n        \\[ z = \\frac{42 - 50}{8} = -1 \\implies P(X < 42) = \\Phi(-1) = 1 - \\Phi(1) = 1 - 0.8413 = \\mathbf{0.1587} \\;\\;(15.87\\%) \\]",
      "correctOptionKey": "opt-d",
      "correct_option": "opt-d"
    },
    "initial-q11": {
      "type": "mcq",
      "mode": "mcq",
      "solution_html": "Estandarizamos \\(x = 62\\) en \\(X \\sim N(50, 8)\\):\n        \\[ z = \\frac{62 - 50}{8} = 1.5 \\implies P(X > 62) = 1 - \\Phi(1.5) = 1 - 0.9332 = \\mathbf{0.0668} \\;\\;(6.68\\%) \\]",
      "correctOptionKey": "opt-a",
      "correct_option": "opt-a"
    },
    "initial-q12": {
      "type": "fill",
      "mode": "fill",
      "solution_html": "En \\(X \\sim N(50, 8)\\) para \\(P(46 < X < 62)\\):\n        \\[ z_a = \\frac{46 - 50}{8} = \\mathbf{-0.5}, \\qquad z_b = \\frac{62 - 50}{8} = \\mathbf{1.5} \\]\n        Con \\(\\Phi(1.5) = 0.9332\\) y \\(\\Phi(-0.5) = 1 - \\Phi(0.5) = 1 - 0.6915 = 0.3085\\):\n        \\[ P(46 < X < 62) = 0.9332 - 0.3085 = \\mathbf{0.6247} \\]",
      "blanks": [
        {
          "accepted": [
            "-0.5",
            "-0.50",
            "-1/2"
          ],
          "numericTarget": -0.5,
          "numericTolerance": 0.001
        },
        {
          "accepted": [
            "1.5",
            "+1.5",
            "1.50",
            "3/2"
          ],
          "numericTarget": 1.5,
          "numericTolerance": 0.001
        },
        {
          "accepted": [
            "0.6247",
            "62.47%"
          ],
          "numericTarget": 0.6247,
          "numericTolerance": 0.0005
        }
      ]
    },
    "initial-q13": {
      "type": "mcq",
      "mode": "mcq",
      "solution_html": "<strong>13 es Verdadero:</strong> la curva normal es simétrica respecto al eje vertical \\(x = \\mu\\), donde coinciden media, mediana y moda.<br>\n        <strong>14 es Falso:</strong> en toda variable aleatoria continua la probabilidad de un punto exacto es cero, \\(P(X = \\mu) = 0\\) (lo que vale \\(0.5\\) es el área acumulada \\(P(X \\le \\mu)\\)).",
      "correctOptionKey": "opt-v1",
      "correct_option": "opt-v1"
    },
    "initial-q14": {
      "type": "mcq",
      "mode": "mcq",
      "solution_html": "<strong>15 es Falso:</strong> \\(\\sigma\\) mide la dispersión; si \\(\\sigma\\) aumenta con \\(\\mu\\) fija, los datos se dispersan más y la campana se vuelve <em>más baja y más ancha</em>.<br>\n        <strong>16 es Verdadero:</strong> por la simetría de \\(Z \\sim N(0,1)\\) respecto a \\(0\\) y como el área total es \\(1\\), siempre se cumple \\(\\Phi(-z) = 1 - \\Phi(z)\\).",
      "correctOptionKey": "opt-f2",
      "correct_option": "opt-f2"
    },
    "initial-q15": {
      "type": "fill",
      "mode": "fill",
      "solution_html": "<strong>Problema 17:</strong> El intervalo \\((50, 90)\\) contiene por completo al intervalo \\((60, 80)\\), por lo que encierra <strong>mayor</strong> área bajo la curva.<br>\n        Comprobación con \\(X \\sim N(70, 10)\\):\n        \\[ z_a = \\frac{50 - 70}{10} = -2, \\quad z_b = \\frac{90 - 70}{10} = 2 \\]\n        \\[ P(50 < X < 90) = \\Phi(2) - \\Phi(-2) = 0.9772 - (1 - 0.9772) = 0.9772 - 0.0228 = \\mathbf{0.9544} \\;\\;(95.44\\% > 68.26\\%) \\]",
      "blanks": [
        {
          "accepted": [
            "mayor",
            "mas grande",
            "más grande",
            "superior"
          ]
        },
        {
          "accepted": [
            "0.9544",
            "95.44%"
          ],
          "numericTarget": 0.9544,
          "numericTolerance": 0.0005
        }
      ]
    },
    "initial-q16": {
      "type": "fill",
      "mode": "fill",
      "solution_html": "<strong>Problema 18:</strong> Con \\(X \\sim N(500, 4)\\):<br>\n        a) \\(P(X < 492)\\): \\(z = \\frac{492 - 500}{4} = -2 \\implies \\Phi(-2) = 1 - 0.9772 = \\mathbf{0.0228}\\).<br>\n        b) \\(P(X > 506)\\): \\(z = \\frac{506 - 500}{4} = 1.5 \\implies 1 - \\Phi(1.5) = 1 - 0.9332 = \\mathbf{0.0668}\\).<br>\n        c) \\(P(496 < X < 508)\\): \\(z_a = \\frac{496 - 500}{4} = -1\\) y \\(z_b = \\frac{508 - 500}{4} = 2\\):\n        \\[ \\Phi(2) - \\Phi(-1) = 0.9772 - 0.1587 = \\mathbf{0.8185} \\]",
      "blanks": [
        {
          "accepted": [
            "0.0228",
            "2.28%"
          ],
          "numericTarget": 0.0228,
          "numericTolerance": 0.0005
        },
        {
          "accepted": [
            "0.0668",
            "6.68%"
          ],
          "numericTarget": 0.0668,
          "numericTolerance": 0.0005
        },
        {
          "accepted": [
            "0.8185",
            "81.85%"
          ],
          "numericTarget": 0.8185,
          "numericTolerance": 0.0005
        }
      ]
    },
    "initial-q17": {
      "type": "fill",
      "mode": "fill",
      "solution_html": "<strong>Problema 19:</strong> Con \\(X \\sim N(3.2, 0.5)\\):<br>\n        a) \\(P(X < 2.5)\\): \\(z = \\frac{2.5 - 3.2}{0.5} = -1.4 \\implies \\Phi(-1.4) = 1 - \\Phi(1.4) = 1 - 0.9192 = \\mathbf{0.0808}\\).<br>\n        b) \\(P(2.5 < X < 4.0)\\): \\(z_a = -1.4\\) y \\(z_b = \\frac{4.0 - 3.2}{0.5} = 1.6\\):\n        \\[ \\Phi(1.6) - \\Phi(-1.4) = 0.9452 - 0.0808 = \\mathbf{0.8644} \\]",
      "blanks": [
        {
          "accepted": [
            "0.0808",
            "8.08%"
          ],
          "numericTarget": 0.0808,
          "numericTolerance": 0.0005
        },
        {
          "accepted": [
            "0.8644",
            "86.44%"
          ],
          "numericTarget": 0.8644,
          "numericTolerance": 0.0005
        }
      ]
    },
    "initial-q18": {
      "type": "fill",
      "mode": "fill",
      "solution_html": "<strong>Problema 20:</strong> Con \\(X \\sim N(750, 100)\\):<br>\n        a) \\(P(X \\ge 900)\\): \\(z = \\frac{900 - 750}{100} = 1.5 \\implies 1 - \\Phi(1.5) = 1 - 0.9332 = \\mathbf{0.0668}\\).<br>\n        b) Para estar en el \\(10\\%\\) superior se cumple \\(P(X \\le x) = 0.90\\). En la tabla, \\(\\Phi(1.28) = 0.8997 \\approx 0.90\\), luego \\(z \\approx 1.28\\):\n        \\[ x = \\mu + z\\sigma = 750 + 1.28(100) = \\mathbf{878}\\text{ puntos.} \\]",
      "blanks": [
        {
          "accepted": [
            "0.0668",
            "6.68%"
          ],
          "numericTarget": 0.0668,
          "numericTolerance": 0.0005
        },
        {
          "accepted": [
            "878",
            "878.0",
            "878.2"
          ],
          "numericTarget": 878,
          "numericTolerance": 0.3
        }
      ]
    },
    "initial-q19": {
      "type": "fill",
      "mode": "fill",
      "solution_html": "<strong>Reto 1 (Simetría e intervalos centrales):</strong><br>\n        a) Como \\(P(-z < Z < z) = \\Phi(z) - \\Phi(-z)\\) y \\(\\Phi(-z) = 1 - \\Phi(z)\\), resulta:\n        \\[ \\Phi(z) - (1 - \\Phi(z)) = 2\\Phi(z) - 1 \\]\n        b) Con \\(\\Phi(1.96) = 0.9750\\): \\(P(-1.96 < Z < 1.96) = 2(0.9750) - 1 = \\mathbf{0.95}\\).<br>\n        c) Para \\(2\\Phi(k) - 1 = 0.99 \\implies \\Phi(k) = 0.9950\\). En la tabla, \\(\\Phi(2.58) = 0.9951\\) (y \\(\\Phi(2.57) = 0.9949\\)), por lo que \\(k \\approx \\mathbf{2.58}\\).",
      "blanks": [
        {
          "accepted": [
            "0.95",
            "0.9500",
            "95%"
          ],
          "numericTarget": 0.95,
          "numericTolerance": 0.0005
        },
        {
          "accepted": [
            "2.58",
            "2.57",
            "2.575"
          ],
          "numericTarget": 2.58,
          "numericTolerance": 0.015
        }
      ]
    },
    "initial-q20": {
      "type": "fill",
      "mode": "fill",
      "solution_html": "<strong>Reto 2:</strong> Con \\(X \\sim N(\\mu, 0.2)\\) y \\(P(X < 9.6) = 0.0228\\):<br>\n        a) Como \\(\\Phi(-2) = 1 - 0.9772 = 0.0228\\), tenemos \\(z = -2\\):\n        \\[ \\frac{9.6 - \\mu}{0.2} = -2 \\implies 9.6 - \\mu = -0.4 \\implies \\mu = \\mathbf{10.0\\text{ mm}} \\]\n        b) Con \\(\\mu = 10\\) y \\(\\sigma = 0.2\\): \\(P(9.7 < X < 10.3) = P(-1.5 < Z < 1.5) = 2\\Phi(1.5) - 1 = 2(0.9332) - 1 = \\mathbf{0.8664}\\).<br>\n        c) Si \\(\\sigma\\) se reduce a \\(0.1\\text{ mm}\\): \\(P(9.7 < X < 10.3) = P(-3 < Z < 3) = 2\\Phi(3) - 1 = 2(0.9987) - 1 = \\mathbf{0.9974}\\) (mayor precisión industrial).<br><br>\n        <strong>Reto 3:</strong> Para \\(X_1 \\sim N(70,10)\\) y \\(X_2 \\sim N(70,20)\\):<br>\n        a-b) \\(P(60 < X_1 < 80)\\) y \\(P(50 < X_2 < 90)\\) abarcan exactamente \\(\\mu \\pm 1\\sigma\\) (\\(-1 < Z < 1\\)), dando ambas \\(0.6826\\).<br>\n        c) En cambio, \\(P(60 < X_2 < 80)\\) equivale a \\(z = \\frac{\\pm 10}{20} = \\pm 0.5\\):\n        \\[ P(-0.5 < Z < 0.5) = 2\\Phi(0.5) - 1 = 2(0.6915) - 1 = \\mathbf{0.3830} \\]",
      "blanks": [
        {
          "accepted": [
            "10",
            "10.0",
            "10.00"
          ],
          "numericTarget": 10,
          "numericTolerance": 0.001
        },
        {
          "accepted": [
            "0.8664",
            "86.64%"
          ],
          "numericTarget": 0.8664,
          "numericTolerance": 0.0005
        },
        {
          "accepted": [
            "0.9974",
            "99.74%",
            "0.997"
          ],
          "numericTarget": 0.9974,
          "numericTolerance": 0.0005
        },
        {
          "accepted": [
            "0.383",
            "0.3830",
            "0.3829",
            "38.30%"
          ],
          "numericTarget": 0.383,
          "numericTolerance": 0.0005
        }
      ]
    }
  },
  "recoveryExercises": {
    "recovery-r01": {
      "type": "input",
      "mode": "input",
      "solution_html": "Aplicamos \\(z = \\frac{x - \\mu}{\\sigma}\\) con \\(\\mu = 40\\), \\(\\sigma = 5\\) y \\(x = 50\\):\n        \\[ z = \\frac{50 - 40}{5} = \\frac{10}{5} = \\mathbf{2} \\]",
      "acceptedAnswers": [
        "2",
        "+2",
        "2.0",
        "2.00",
        "z=2"
      ],
      "accepted_answers": [
        "2",
        "+2",
        "2.0",
        "2.00",
        "z=2"
      ],
      "numericTarget": 2,
      "numericTolerance": 0.001
    },
    "recovery-r02": {
      "type": "input",
      "mode": "input",
      "solution_html": "Aplicamos \\(z = \\frac{x - \\mu}{\\sigma}\\) con \\(\\mu = 80\\), \\(\\sigma = 10\\) y \\(x = 65\\):\n        \\[ z = \\frac{65 - 80}{10} = \\frac{-15}{10} = \\mathbf{-1.5} \\]",
      "acceptedAnswers": [
        "-1.5",
        "-1.50",
        "-3/2",
        "z=-1.5"
      ],
      "accepted_answers": [
        "-1.5",
        "-1.50",
        "-3/2",
        "z=-1.5"
      ],
      "numericTarget": -1.5,
      "numericTolerance": 0.001
    },
    "recovery-r03": {
      "type": "input",
      "mode": "input",
      "solution_html": "Des-estandarizamos con \\(x = \\mu + z\\sigma\\), donde \\(\\mu = 100\\), \\(\\sigma = 20\\) y \\(z = 1.5\\):\n        \\[ x = 100 + 1.5(20) = 100 + 30 = \\mathbf{130} \\]",
      "acceptedAnswers": [
        "130",
        "130.0",
        "x=130"
      ],
      "accepted_answers": [
        "130",
        "130.0",
        "x=130"
      ],
      "numericTarget": 130,
      "numericTolerance": 0.001
    },
    "recovery-r04": {
      "type": "mcq",
      "mode": "mcq",
      "solution_html": "Estandarizamos \\(x = 65\\) en \\(X \\sim N(60, 5)\\):\n        \\[ z = \\frac{65 - 60}{5} = 1 \\implies P(X < 65) = \\Phi(1) = \\mathbf{0.8413} \\]",
      "correctOptionKey": "opt-a",
      "correct_option": "opt-a"
    },
    "recovery-r05": {
      "type": "mcq",
      "mode": "mcq",
      "solution_html": "Estandarizamos \\(x = 70\\) en \\(X \\sim N(60, 5)\\):\n        \\[ z = \\frac{70 - 60}{5} = 2 \\implies P(X > 70) = 1 - \\Phi(2) = 1 - 0.9772 = \\mathbf{0.0228} \\]",
      "correctOptionKey": "opt-b",
      "correct_option": "opt-b"
    },
    "recovery-r06": {
      "type": "order",
      "mode": "order",
      "solution_html": "Para un intervalo simétrico primero estandarizamos ambos límites (\\(z_a = -1, z_b = 1\\)), luego buscamos \\(\\Phi(1) = 0.8413\\), calculamos \\(\\Phi(-1) = 1 - 0.8413 = 0.1587\\) y finalmente restamos \\(\\Phi(1) - \\Phi(-1) = 0.6826\\).",
      "correctOrder": [
        "s1",
        "s2",
        "s3",
        "s4"
      ]
    },
    "recovery-r07": {
      "type": "mcq",
      "mode": "mcq",
      "solution_html": "El área total bajo la curva normal es \\(1\\), y por ser simétrica respecto a la media \\(\\mu\\), a cada lado queda exactamente la mitad del área: \\(P(X \\le \\mu) = \\mathbf{0.5}\\).",
      "correctOptionKey": "opt-c",
      "correct_option": "opt-c"
    },
    "recovery-r08": {
      "type": "fill",
      "mode": "fill",
      "solution_html": "Con \\(X \\sim N(250, 10)\\) para \\(P(X < 235)\\):\n        \\[ z = \\frac{235 - 250}{10} = \\mathbf{-1.5} \\]\n        \\[ P(X < 235) = \\Phi(-1.5) = 1 - \\Phi(1.5) = 1 - 0.9332 = \\mathbf{0.0668} \\]",
      "blanks": [
        {
          "accepted": [
            "-1.5",
            "-1.50"
          ],
          "numericTarget": -1.5,
          "numericTolerance": 0.001
        },
        {
          "accepted": [
            "0.0668",
            "6.68%"
          ],
          "numericTarget": 0.0668,
          "numericTolerance": 0.0005
        }
      ]
    },
    "recovery-r09": {
      "type": "fill",
      "mode": "fill",
      "solution_html": "Para quedar en el \\(10\\%\\) superior se requiere acumular \\(0.90\\) a la izquierda: \\(\\Phi(z) = 0.90 \\implies z \\approx \\mathbf{1.28}\\).<br>\n        Des-estandarizando en \\(X \\sim N(70, 10)\\):\n        \\[ x = 70 + 1.28(10) = \\mathbf{82.8}\\text{ puntos.} \\]",
      "blanks": [
        {
          "accepted": [
            "1.28"
          ],
          "numericTarget": 1.28,
          "numericTolerance": 0.01
        },
        {
          "accepted": [
            "82.8",
            "82.80"
          ],
          "numericTarget": 82.8,
          "numericTolerance": 0.1
        }
      ]
    },
    "recovery-r10": {
      "type": "fill",
      "mode": "fill",
      "solution_html": "El intervalo \\((10, 30)\\) en \\(X \\sim N(20, 5)\\) corresponde a \\(20 \\pm 10 = \\mu \\pm 2\\sigma\\), por lo que \\(k = \\mathbf{2}\\).<br>\n        Usando la fórmula demostrada en el Reto 1:\n        \\[ P(-2 < Z < 2) = 2\\Phi(2) - 1 = 2(0.9772) - 1 = \\mathbf{0.9544} \\]",
      "blanks": [
        {
          "accepted": [
            "2",
            "+2",
            "2.0"
          ],
          "numericTarget": 2,
          "numericTolerance": 0.001
        },
        {
          "accepted": [
            "0.9544",
            "95.44%"
          ],
          "numericTarget": 0.9544,
          "numericTolerance": 0.0005
        }
      ]
    }
  }
}
$JSON$::jsonb;

  -- 5. Upsert en private.activity_grading_configs para Gamificación
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
    config = EXCLUDED.config,
    updated_at = now();

  -- 6. Upsert en private.activity_grading_configs para Trabajo en Clase
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
    config = EXCLUDED.config,
    updated_at = now();

END $$;
