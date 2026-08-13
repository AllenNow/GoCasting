// 装备型号数据 — gear_models collection
// 格式遵循 ARCHITECTURE.md AD-2 规范

const MODELS_DATA = [
  // ============================================================
  // 渔轮型号 — KISU SPECIAL 45 (CN)
  // ============================================================
  {
    series_id: 'shimano_kisu_special_45_reel_cn',
    model: '极细规格',
    model_image: '',
    category: 'reel',
    gear_ratio: 3.5,
    max_drag_kg: 20,
    weight_g: 400,
    spool_spec: '67/45',
    line_capacity_pe: '0.6-250, 0.8-200, 1-160',
    max_retrieve_cm: 77,
    handle_length_mm: 80,
    bearings: '9/1',
    price_cn: 5489,
    product_code: '044341'
  },
  {
    series_id: 'shimano_kisu_special_45_reel_cn',
    model: 'CE 极细规格',
    model_image: '',
    category: 'reel',
    gear_ratio: 3.5,
    max_drag_kg: 20,
    weight_g: 405,
    spool_spec: '67/45',
    line_capacity_pe: '0.6-250, 0.8-200, 1-160',
    max_retrieve_cm: 77,
    handle_length_mm: 80,
    bearings: '9/1',
    price_cn: 5489,
    product_code: '044358'
  },

  // ============================================================
  // 渔轮型号 — JDM Surf Leader 2025
  // ============================================================
  {
    series_id: 'shimano_surf_leader_reel_2025_jdm',
    model: '35 极细 (Gokuhoso)',
    model_image: '',
    category: 'reel',
    gear_ratio: 3.5,
    max_drag_kg: 0,
    weight_g: 455,
    spool_spec: '73.5/35',
    line_capacity_pe: '0.6-250, 0.8-200, 1-160',
    max_retrieve_cm: 83,
    handle_length_mm: 80,
    bearings: '6/1',
    price_cn: null,
    product_code: ''
  },
  {
    series_id: 'shimano_surf_leader_reel_2025_jdm',
    model: '35 细 (Hoso)',
    model_image: '',
    category: 'reel',
    gear_ratio: 3.5,
    max_drag_kg: 0,
    weight_g: 455,
    spool_spec: '73.5/35',
    line_capacity_pe: '0.8-250, 1-200, 1.2-165',
    max_retrieve_cm: 83,
    handle_length_mm: 80,
    bearings: '6/1',
    price_cn: null,
    product_code: ''
  },
  {
    series_id: 'shimano_surf_leader_reel_2025_jdm',
    model: 'SD 35 标准 (Hyoujyun)',
    model_image: '',
    category: 'reel',
    gear_ratio: 3.5,
    max_drag_kg: 20,
    weight_g: 540,
    spool_spec: '76/35',
    line_capacity_pe: '1.5-250, 2-200, 3-130',
    max_retrieve_cm: 84,
    handle_length_mm: 80,
    bearings: '6/1',
    price_cn: null,
    product_code: ''
  },

  // ============================================================
  // 渔轮型号 — JDM Kisu Special 2022
  // ============================================================
  {
    series_id: 'shimano_kisu_special_reel_2022_jdm',
    model: '45 极细 (Gokuhoso)',
    model_image: '',
    category: 'reel',
    gear_ratio: 3.5,
    max_drag_kg: 0,
    weight_g: 400,
    spool_spec: '67/45',
    line_capacity_pe: '0.6-250, 0.8-200, 1-160',
    max_retrieve_cm: 77,
    handle_length_mm: 80,
    bearings: '10/1',
    price_cn: null,
    product_code: ''
  },
  {
    series_id: 'shimano_kisu_special_reel_2022_jdm',
    model: '45 CE 极细 (CE Gokuhoso)',
    model_image: '',
    category: 'reel',
    gear_ratio: 3.5,
    max_drag_kg: 0,
    weight_g: 405,
    spool_spec: '67/45',
    line_capacity_pe: '0.6-250, 0.8-200, 1-160',
    max_retrieve_cm: 77,
    handle_length_mm: 80,
    bearings: '10/1',
    price_cn: null,
    product_code: ''
  },

  // ============================================================
  // 渔轮型号 — JDM Castizm 2019 (Daiwa)
  // ============================================================
  {
    series_id: 'daiwa_castizm_reel_2019_jdm',
    model: '25 QD',
    model_image: '',
    category: 'reel',
    gear_ratio: 4.7,
    max_drag_kg: 12,
    weight_g: 410,
    spool_spec: '-/25',
    line_capacity_pe: '1.5-200, 2-150',
    max_retrieve_cm: 94,
    handle_length_mm: 70,
    bearings: '7/1',
    price_cn: null,
    product_code: ''
  },
  {
    series_id: 'daiwa_castizm_reel_2019_jdm',
    model: '25 15PE',
    model_image: '',
    category: 'reel',
    gear_ratio: 4.7,
    max_drag_kg: 12,
    weight_g: 405,
    spool_spec: '-/25',
    line_capacity_pe: '1.5-200, 2-150',
    max_retrieve_cm: 94,
    handle_length_mm: 70,
    bearings: '7/1',
    price_cn: null,
    product_code: ''
  },

  // ============================================================
  // 渔轮型号 — JDM Activecast 2010
  // ============================================================
  {
    series_id: 'shimano_activecast_reel_2010_jdm',
    model: '1060',
    model_image: '',
    category: 'reel',
    gear_ratio: 3.8,
    max_drag_kg: 15,
    weight_g: 650,
    spool_spec: '69/35',
    line_capacity_pe: '2-225, 2.5-175, 3-140',
    max_retrieve_cm: 82,
    handle_length_mm: null,
    bearings: '5/1',
    price_cn: null,
    product_code: ''
  },
  {
    series_id: 'shimano_activecast_reel_2010_jdm',
    model: '1080',
    model_image: '',
    category: 'reel',
    gear_ratio: 3.8,
    max_drag_kg: 15,
    weight_g: 650,
    spool_spec: '69/35',
    line_capacity_pe: '2.5-225, 3-185, 4-140',
    max_retrieve_cm: 82,
    handle_length_mm: null,
    bearings: '5/1',
    price_cn: null,
    product_code: ''
  },
  {
    series_id: 'shimano_activecast_reel_2010_jdm',
    model: '1120',
    model_image: '',
    category: 'reel',
    gear_ratio: 3.8,
    max_drag_kg: 15,
    weight_g: 650,
    spool_spec: '69/35',
    line_capacity_pe: '4-200, 5-160, 6-130',
    max_retrieve_cm: 82,
    handle_length_mm: null,
    bearings: '5/1',
    price_cn: null,
    product_code: ''
  },

  // ============================================================
  // 渔轮型号 — JDM Activecast SD 2025
  // ============================================================
  {
    series_id: 'shimano_activecast_sd_reel_2025_jdm',
    model: 'SD 1080',
    model_image: '',
    category: 'reel',
    gear_ratio: 3.5,
    max_drag_kg: 20,
    weight_g: 650,
    spool_spec: '76/35',
    line_capacity_pe: '',
    max_retrieve_cm: 84,
    handle_length_mm: 85,
    bearings: '4/1',
    price_cn: null,
    product_code: ''
  },
  {
    series_id: 'shimano_activecast_sd_reel_2025_jdm',
    model: 'SD 1120',
    model_image: '',
    category: 'reel',
    gear_ratio: 3.5,
    max_drag_kg: 20,
    weight_g: 650,
    spool_spec: '76/35',
    line_capacity_pe: '',
    max_retrieve_cm: 84,
    handle_length_mm: 85,
    bearings: '4/1',
    price_cn: null,
    product_code: ''
  },

  // ============================================================
  // 渔轮型号 — JDM Spin Joy 2015
  // ============================================================
  {
    series_id: 'shimano_spin_joy_reel_2015_jdm',
    model: 'SD 35',
    model_image: '',
    category: 'reel',
    gear_ratio: 3.5,
    max_drag_kg: 20,
    weight_g: 630,
    spool_spec: '76/35',
    line_capacity_pe: '1.5-250, 2-200, 3-130',
    max_retrieve_cm: 84,
    handle_length_mm: 80,
    bearings: '4/1',
    price_cn: null,
    product_code: ''
  }
];

module.exports = { MODELS_DATA };


// ============================================================
// 渔竿型号 — KISU SPECIAL 并继 (CN) — 完整规格（来自官网截图）
// ============================================================

const MODELS_DATA_RODS = [
  // KISU SPECIAL (并继) CN — 8 个型号
  { series_id: 'shimano_kisu_special_rod_cn', model: '405CX', model_image: null, category: 'rod', length_m: 4.05, pieces: 3, closed_length_cm: 143, weight_g: 415, tip_diameter_mm: 2.8, sinker_load: '25-35', standard_sinker: 30, reel_seat_mm: 840, carbon_percent: 100, price_cn: 11330, product_code: '255808' },
  { series_id: 'shimano_kisu_special_rod_cn', model: '405BX', model_image: null, category: 'rod', length_m: 4.05, pieces: 3, closed_length_cm: 143, weight_g: 450, tip_diameter_mm: 3.2, sinker_load: '27-35', standard_sinker: 33, reel_seat_mm: 860, carbon_percent: 100, price_cn: 11930, product_code: '255822' },
  { series_id: 'shimano_kisu_special_rod_cn', model: '405AX', model_image: null, category: 'rod', length_m: 4.05, pieces: 3, closed_length_cm: 143, weight_g: 495, tip_diameter_mm: 3.6, sinker_load: '30-40', standard_sinker: 35, reel_seat_mm: 880, carbon_percent: 100, price_cn: 12525, product_code: '255846' },
  { series_id: 'shimano_kisu_special_rod_cn', model: '405BX+', model_image: null, category: 'rod', length_m: 4.05, pieces: 3, closed_length_cm: 143, weight_g: 475, tip_diameter_mm: 3.4, sinker_load: '28-35', standard_sinker: 34, reel_seat_mm: 870, carbon_percent: 100, price_cn: 12227, product_code: '255839' },
  { series_id: 'shimano_kisu_special_rod_cn', model: '405CX+', model_image: null, category: 'rod', length_m: 4.05, pieces: 3, closed_length_cm: 143, weight_g: 435, tip_diameter_mm: 3.0, sinker_load: '26-35', standard_sinker: 31, reel_seat_mm: 850, carbon_percent: 100, price_cn: 11633, product_code: '255815' },
  { series_id: 'shimano_kisu_special_rod_cn', model: '405DX+', model_image: null, category: 'rod', length_m: 4.05, pieces: 3, closed_length_cm: 143, weight_g: 405, tip_diameter_mm: 2.7, sinker_load: '24-32', standard_sinker: 28, reel_seat_mm: 830, carbon_percent: 100, price_cn: 11154, product_code: '255792' },
  { series_id: 'shimano_kisu_special_rod_cn', model: '405EX+', model_image: null, category: 'rod', length_m: 4.05, pieces: 3, closed_length_cm: 143, weight_g: 375, tip_diameter_mm: 2.5, sinker_load: '22-30', standard_sinker: 26, reel_seat_mm: 810, carbon_percent: 100, price_cn: 10972, product_code: '255785' },
  { series_id: 'shimano_kisu_special_rod_cn', model: '405FX+', model_image: null, category: 'rod', length_m: 4.05, pieces: 3, closed_length_cm: 143, weight_g: 355, tip_diameter_mm: 2.4, sinker_load: '19-25', standard_sinker: 24, reel_seat_mm: 790, carbon_percent: 100, price_cn: 10796, product_code: '255778' },

  // ============================================================
  // 渔竿型号 — JDM Surf Lander 振出 2023 — 8 个型号
  // ============================================================
  { series_id: 'shimano_surf_lander_rod_2023_jdm', model: '405BX-T', model_image: null, category: 'rod', length_m: 4.05, pieces: 4, closed_length_cm: 117, weight_g: 465, tip_diameter_mm: 3.0, sinker_load: '27-35', standard_sinker: null, reel_seat_mm: 840, carbon_percent: 99.9, price_cn: null, product_code: '' },
  { series_id: 'shimano_surf_lander_rod_2023_jdm', model: '405CX-T', model_image: null, category: 'rod', length_m: 4.05, pieces: 4, closed_length_cm: 117, weight_g: 450, tip_diameter_mm: 2.8, sinker_load: '25-33', standard_sinker: null, reel_seat_mm: 830, carbon_percent: 99.9, price_cn: null, product_code: '' },
  { series_id: 'shimano_surf_lander_rod_2023_jdm', model: '405DX-T', model_image: null, category: 'rod', length_m: 4.05, pieces: 4, closed_length_cm: 117, weight_g: 440, tip_diameter_mm: 2.6, sinker_load: '23-30', standard_sinker: null, reel_seat_mm: 820, carbon_percent: 99.9, price_cn: null, product_code: '' },
  { series_id: 'shimano_surf_lander_rod_2023_jdm', model: '405EX-T', model_image: null, category: 'rod', length_m: 4.05, pieces: 4, closed_length_cm: 117, weight_g: 430, tip_diameter_mm: 2.4, sinker_load: '20-27', standard_sinker: null, reel_seat_mm: 810, carbon_percent: 99.9, price_cn: null, product_code: '' },
  { series_id: 'shimano_surf_lander_rod_2023_jdm', model: '425BX-T', model_image: null, category: 'rod', length_m: 4.25, pieces: 4, closed_length_cm: 124, weight_g: 480, tip_diameter_mm: 3.0, sinker_load: '27-35', standard_sinker: null, reel_seat_mm: 860, carbon_percent: 99.9, price_cn: null, product_code: '' },
  { series_id: 'shimano_surf_lander_rod_2023_jdm', model: '425CX-T', model_image: null, category: 'rod', length_m: 4.25, pieces: 4, closed_length_cm: 124, weight_g: 470, tip_diameter_mm: 2.8, sinker_load: '25-33', standard_sinker: null, reel_seat_mm: 850, carbon_percent: 99.9, price_cn: null, product_code: '' },
  { series_id: 'shimano_surf_lander_rod_2023_jdm', model: '425DX-T', model_image: null, category: 'rod', length_m: 4.25, pieces: 4, closed_length_cm: 124, weight_g: 455, tip_diameter_mm: 2.6, sinker_load: '23-30', standard_sinker: null, reel_seat_mm: 820, carbon_percent: 99.9, price_cn: null, product_code: '' },
  { series_id: 'shimano_surf_lander_rod_2023_jdm', model: '425EX-T', model_image: null, category: 'rod', length_m: 4.25, pieces: 4, closed_length_cm: 124, weight_g: 445, tip_diameter_mm: 2.4, sinker_load: '20-27', standard_sinker: null, reel_seat_mm: 810, carbon_percent: 99.9, price_cn: null, product_code: '' },

  // ============================================================
  // 渔竿型号 — JDM Surf Leader 振出 2024 — 8 个型号
  // ============================================================
  { series_id: 'shimano_surf_leader_rod_2024_jdm', model: '405BX-T', model_image: null, category: 'rod', length_m: 4.05, pieces: 4, closed_length_cm: 117, weight_g: 400, tip_diameter_mm: null, sinker_load: '27-35', standard_sinker: null, reel_seat_mm: null, carbon_percent: null, price_cn: null, product_code: '' },
  { series_id: 'shimano_surf_leader_rod_2024_jdm', model: '405CX-T', model_image: null, category: 'rod', length_m: 4.05, pieces: 4, closed_length_cm: 117, weight_g: 385, tip_diameter_mm: null, sinker_load: '25-33', standard_sinker: null, reel_seat_mm: null, carbon_percent: null, price_cn: null, product_code: '' },
  { series_id: 'shimano_surf_leader_rod_2024_jdm', model: '405DX-T', model_image: null, category: 'rod', length_m: 4.05, pieces: 4, closed_length_cm: 117, weight_g: 370, tip_diameter_mm: null, sinker_load: '23-30', standard_sinker: null, reel_seat_mm: null, carbon_percent: null, price_cn: null, product_code: '' },
  { series_id: 'shimano_surf_leader_rod_2024_jdm', model: '405EX-T', model_image: null, category: 'rod', length_m: 4.05, pieces: 4, closed_length_cm: 117, weight_g: 360, tip_diameter_mm: null, sinker_load: '20-27', standard_sinker: null, reel_seat_mm: null, carbon_percent: null, price_cn: null, product_code: '' },
  { series_id: 'shimano_surf_leader_rod_2024_jdm', model: '425BX-T', model_image: null, category: 'rod', length_m: 4.25, pieces: 4, closed_length_cm: 124, weight_g: 410, tip_diameter_mm: null, sinker_load: '27-35', standard_sinker: null, reel_seat_mm: null, carbon_percent: null, price_cn: null, product_code: '' },
  { series_id: 'shimano_surf_leader_rod_2024_jdm', model: '425CX-T', model_image: null, category: 'rod', length_m: 4.25, pieces: 4, closed_length_cm: 124, weight_g: 395, tip_diameter_mm: null, sinker_load: '25-33', standard_sinker: null, reel_seat_mm: null, carbon_percent: null, price_cn: null, product_code: '' },
  { series_id: 'shimano_surf_leader_rod_2024_jdm', model: '425DX-T', model_image: null, category: 'rod', length_m: 4.25, pieces: 4, closed_length_cm: 124, weight_g: 380, tip_diameter_mm: null, sinker_load: '23-30', standard_sinker: null, reel_seat_mm: null, carbon_percent: null, price_cn: null, product_code: '' },
  { series_id: 'shimano_surf_leader_rod_2024_jdm', model: '425EX-T', model_image: null, category: 'rod', length_m: 4.25, pieces: 4, closed_length_cm: 124, weight_g: 370, tip_diameter_mm: null, sinker_load: '20-27', standard_sinker: null, reel_seat_mm: null, carbon_percent: null, price_cn: null, product_code: '' },

  // ============================================================
  // 渔竿型号 — JDM Surf Gazer 并继 2022 — 4 个型号
  // ============================================================
  { series_id: 'shimano_surf_gazer_rod_2022_jdm', model: '405BX-T', model_image: null, category: 'rod', length_m: 4.05, pieces: 3, closed_length_cm: 143, weight_g: 365, tip_diameter_mm: 3.0, sinker_load: '27-35', standard_sinker: 30, reel_seat_mm: null, carbon_percent: 99.5, price_cn: null, product_code: '' },
  { series_id: 'shimano_surf_gazer_rod_2022_jdm', model: '405CX-T', model_image: null, category: 'rod', length_m: 4.05, pieces: 3, closed_length_cm: 143, weight_g: 355, tip_diameter_mm: 2.8, sinker_load: '25-33', standard_sinker: 27, reel_seat_mm: null, carbon_percent: 99.5, price_cn: null, product_code: '' },
  { series_id: 'shimano_surf_gazer_rod_2022_jdm', model: '405DX-T', model_image: null, category: 'rod', length_m: 4.05, pieces: 3, closed_length_cm: 143, weight_g: 345, tip_diameter_mm: 2.6, sinker_load: '23-30', standard_sinker: 25, reel_seat_mm: null, carbon_percent: 99.5, price_cn: null, product_code: '' },
  { series_id: 'shimano_surf_gazer_rod_2022_jdm', model: '405EX-T', model_image: null, category: 'rod', length_m: 4.05, pieces: 3, closed_length_cm: 143, weight_g: 335, tip_diameter_mm: 2.4, sinker_load: '20-27', standard_sinker: 23, reel_seat_mm: null, carbon_percent: 99.5, price_cn: null, product_code: '' },

  // ============================================================
  // 渔竿型号 — JDM Kisu Special 并继 2022 — 6 个型号
  // ============================================================
  { series_id: 'shimano_kisu_special_rod_2022_jdm', model: '405AX+', model_image: null, category: 'rod', length_m: 4.05, pieces: 3, closed_length_cm: null, weight_g: 280, tip_diameter_mm: null, sinker_load: '20-27', standard_sinker: null, reel_seat_mm: null, carbon_percent: 99, price_cn: null, product_code: '' },
  { series_id: 'shimano_kisu_special_rod_2022_jdm', model: '405BX+', model_image: null, category: 'rod', length_m: 4.05, pieces: 3, closed_length_cm: null, weight_g: 290, tip_diameter_mm: null, sinker_load: '23-30', standard_sinker: null, reel_seat_mm: null, carbon_percent: 99, price_cn: null, product_code: '' },
  { series_id: 'shimano_kisu_special_rod_2022_jdm', model: '405CX+', model_image: null, category: 'rod', length_m: 4.05, pieces: 3, closed_length_cm: null, weight_g: 300, tip_diameter_mm: null, sinker_load: '25-33', standard_sinker: null, reel_seat_mm: null, carbon_percent: 99, price_cn: null, product_code: '' },
  { series_id: 'shimano_kisu_special_rod_2022_jdm', model: '405DX+', model_image: null, category: 'rod', length_m: 4.05, pieces: 3, closed_length_cm: null, weight_g: 310, tip_diameter_mm: null, sinker_load: '27-33', standard_sinker: null, reel_seat_mm: null, carbon_percent: 99, price_cn: null, product_code: '' },
  { series_id: 'shimano_kisu_special_rod_2022_jdm', model: '405EX+', model_image: null, category: 'rod', length_m: 4.05, pieces: 3, closed_length_cm: null, weight_g: 320, tip_diameter_mm: null, sinker_load: '30-38', standard_sinker: null, reel_seat_mm: null, carbon_percent: 99, price_cn: null, product_code: '' },
  { series_id: 'shimano_kisu_special_rod_2022_jdm', model: '405FX+', model_image: null, category: 'rod', length_m: 4.05, pieces: 3, closed_length_cm: null, weight_g: 330, tip_diameter_mm: null, sinker_load: '33-40', standard_sinker: null, reel_seat_mm: null, carbon_percent: 99, price_cn: null, product_code: '' },

  // ============================================================
  // 渔竿型号 — JDM Cast'izm 2020 (Daiwa) — 6 个型号
  // ============================================================
  { series_id: 'daiwa_castizm_rod_2020_jdm', model: 'T18-385 V', model_image: null, category: 'rod', length_m: 3.85, pieces: 3, closed_length_cm: 141, weight_g: 290, tip_diameter_mm: 1.6, sinker_load: '8-23', standard_sinker: null, reel_seat_mm: 680, carbon_percent: 99, price_cn: null, product_code: '' },
  { series_id: 'daiwa_castizm_rod_2020_jdm', model: '20-385 R', model_image: null, category: 'rod', length_m: 3.85, pieces: 3, closed_length_cm: 136, weight_g: 300, tip_diameter_mm: 1.8, sinker_load: '10-25', standard_sinker: null, reel_seat_mm: 680, carbon_percent: 98, price_cn: null, product_code: '' },
  { series_id: 'daiwa_castizm_rod_2020_jdm', model: '23-385 R', model_image: null, category: 'rod', length_m: 3.85, pieces: 3, closed_length_cm: 136, weight_g: 320, tip_diameter_mm: 2.0, sinker_load: '10-27', standard_sinker: null, reel_seat_mm: 680, carbon_percent: 99, price_cn: null, product_code: '' },
  { series_id: 'daiwa_castizm_rod_2020_jdm', model: '30-385 R', model_image: null, category: 'rod', length_m: 3.85, pieces: 3, closed_length_cm: 136, weight_g: 345, tip_diameter_mm: 2.5, sinker_load: '15-35', standard_sinker: null, reel_seat_mm: 800, carbon_percent: 99, price_cn: null, product_code: '' },
  { series_id: 'daiwa_castizm_rod_2020_jdm', model: 'T25-405 V', model_image: null, category: 'rod', length_m: 4.05, pieces: 3, closed_length_cm: 141, weight_g: 350, tip_diameter_mm: 1.8, sinker_load: '10-30', standard_sinker: null, reel_seat_mm: 740, carbon_percent: 99, price_cn: null, product_code: '' },
  { series_id: 'daiwa_castizm_rod_2020_jdm', model: 'T25-470 V', model_image: null, category: 'rod', length_m: 4.70, pieces: 4, closed_length_cm: 132, weight_g: 390, tip_diameter_mm: 1.8, sinker_load: '10-30', standard_sinker: null, reel_seat_mm: 740, carbon_percent: 99, price_cn: null, product_code: '' }
];

module.exports.MODELS_DATA_RODS = MODELS_DATA_RODS;


// ============================================================
// 渔竿型号 — SPIN POWER (并继) CN — 22 个型号（完整版+ST版）
// 完整版（带导环）
// ============================================================

const MODELS_DATA_SPIN_POWER = [
  // --- 完整版 ---
  { series_id: 'shimano_spin_power_rod_cn', model: '405BX', model_image: null, category: 'rod', length_m: 4.05, pieces: 3, closed_length_cm: 150, weight_g: 430, tip_diameter_mm: 3.0, sinker_load: '27-35', standard_sinker: 33, reel_seat_mm: 860, carbon_percent: 99.7, price_cn: 6887, product_code: '256287' },
  { series_id: 'shimano_spin_power_rod_cn', model: '425BX', model_image: null, category: 'rod', length_m: 4.25, pieces: 3, closed_length_cm: 156, weight_g: 485, tip_diameter_mm: 3.0, sinker_load: '27-35', standard_sinker: 33, reel_seat_mm: 880, carbon_percent: 99.8, price_cn: 7146, product_code: '259547' },
  { series_id: 'shimano_spin_power_rod_cn', model: '405AX', model_image: null, category: 'rod', length_m: 4.05, pieces: 3, closed_length_cm: 150, weight_g: 490, tip_diameter_mm: 3.4, sinker_load: '30-40', standard_sinker: 35, reel_seat_mm: 880, carbon_percent: 99.8, price_cn: 7091, product_code: '259523' },
  { series_id: 'shimano_spin_power_rod_cn', model: '405BX+', model_image: null, category: 'rod', length_m: 4.05, pieces: 3, closed_length_cm: 150, weight_g: 455, tip_diameter_mm: 3.2, sinker_load: '28-35', standard_sinker: 34, reel_seat_mm: 870, carbon_percent: 99.7, price_cn: 6975, product_code: '256294' },
  { series_id: 'shimano_spin_power_rod_cn', model: '405CX+', model_image: null, category: 'rod', length_m: 4.05, pieces: 3, closed_length_cm: 150, weight_g: 420, tip_diameter_mm: 2.9, sinker_load: '26-35', standard_sinker: 31, reel_seat_mm: 850, carbon_percent: 99.6, price_cn: 6805, product_code: '256270' },
  { series_id: 'shimano_spin_power_rod_cn', model: '405DX+', model_image: null, category: 'rod', length_m: 4.05, pieces: 3, closed_length_cm: 150, weight_g: 385, tip_diameter_mm: 2.6, sinker_load: '24-32', standard_sinker: 28, reel_seat_mm: 830, carbon_percent: 99.5, price_cn: 6662, product_code: '256256' },
  { series_id: 'shimano_spin_power_rod_cn', model: '385EX+', model_image: null, category: 'rod', length_m: 3.85, pieces: 3, closed_length_cm: 143, weight_g: 330, tip_diameter_mm: 2.4, sinker_load: '22-30', standard_sinker: 26, reel_seat_mm: 770, carbon_percent: 99.4, price_cn: 6238, product_code: '259493' },
  { series_id: 'shimano_spin_power_rod_cn', model: '405EX+', model_image: null, category: 'rod', length_m: 4.05, pieces: 3, closed_length_cm: 150, weight_g: 355, tip_diameter_mm: 2.4, sinker_load: '22-30', standard_sinker: 26, reel_seat_mm: 810, carbon_percent: 99.4, price_cn: 6552, product_code: '256249' },

  // --- ST版（裸竿/Strip） ---
  { series_id: 'shimano_spin_power_rod_cn', model: '385EX+(ST)', model_image: null, category: 'rod', length_m: 3.85, pieces: 3, closed_length_cm: 143, weight_g: 290, tip_diameter_mm: 2.4, sinker_load: '22-30', standard_sinker: 26, reel_seat_mm: null, carbon_percent: 99.4, price_cn: 4680, product_code: '259455' },
  { series_id: 'shimano_spin_power_rod_cn', model: '405EX+(ST)', model_image: null, category: 'rod', length_m: 4.05, pieces: 3, closed_length_cm: 150, weight_g: 315, tip_diameter_mm: 2.4, sinker_load: '22-30', standard_sinker: 26, reel_seat_mm: null, carbon_percent: 99.4, price_cn: 4735, product_code: '256188' },
  { series_id: 'shimano_spin_power_rod_cn', model: '385CX', model_image: null, category: 'rod', length_m: 3.85, pieces: 3, closed_length_cm: 143, weight_g: 370, tip_diameter_mm: 2.8, sinker_load: '25-35', standard_sinker: 30, reel_seat_mm: 800, carbon_percent: 99.6, price_cn: 6464, product_code: '259509' },
  { series_id: 'shimano_spin_power_rod_cn', model: '405CX', model_image: null, category: 'rod', length_m: 4.05, pieces: 3, closed_length_cm: 150, weight_g: 395, tip_diameter_mm: 2.8, sinker_load: '25-35', standard_sinker: 30, reel_seat_mm: 840, carbon_percent: 99.6, price_cn: 6722, product_code: '256263' },
  { series_id: 'shimano_spin_power_rod_cn', model: '425CX', model_image: null, category: 'rod', length_m: 4.25, pieces: 3, closed_length_cm: 156, weight_g: 445, tip_diameter_mm: 2.8, sinker_load: '25-35', standard_sinker: 30, reel_seat_mm: 860, carbon_percent: 99.7, price_cn: 6805, product_code: '259530' },
  { series_id: 'shimano_spin_power_rod_cn', model: '385BX', model_image: null, category: 'rod', length_m: 3.85, pieces: 3, closed_length_cm: 143, weight_g: 400, tip_diameter_mm: 3.0, sinker_load: '27-35', standard_sinker: 33, reel_seat_mm: 820, carbon_percent: 99.7, price_cn: 6689, product_code: '259516' },

  // --- ST版（裸竿/Strip）续 ---
  { series_id: 'shimano_spin_power_rod_cn', model: '385CX(ST)', model_image: null, category: 'rod', length_m: 3.85, pieces: 3, closed_length_cm: 143, weight_g: 330, tip_diameter_mm: 2.8, sinker_load: '25-35', standard_sinker: 30, reel_seat_mm: null, carbon_percent: 99.6, price_cn: 4735, product_code: '259462' },
  { series_id: 'shimano_spin_power_rod_cn', model: '405CX(ST)', model_image: null, category: 'rod', length_m: 4.05, pieces: 3, closed_length_cm: 150, weight_g: 355, tip_diameter_mm: 2.8, sinker_load: '25-35', standard_sinker: 30, reel_seat_mm: null, carbon_percent: 99.6, price_cn: 4906, product_code: '256201' },
  { series_id: 'shimano_spin_power_rod_cn', model: '385BX(ST)', model_image: null, category: 'rod', length_m: 3.85, pieces: 3, closed_length_cm: 143, weight_g: 355, tip_diameter_mm: 3.0, sinker_load: '27-35', standard_sinker: 33, reel_seat_mm: null, carbon_percent: 99.7, price_cn: 4906, product_code: '259479' },
  { series_id: 'shimano_spin_power_rod_cn', model: '405BX(ST)', model_image: null, category: 'rod', length_m: 4.05, pieces: 3, closed_length_cm: 150, weight_g: 390, tip_diameter_mm: 3.0, sinker_load: '27-35', standard_sinker: 33, reel_seat_mm: null, carbon_percent: 99.7, price_cn: 5076, product_code: '256225' },
  { series_id: 'shimano_spin_power_rod_cn', model: '405AX(ST)', model_image: null, category: 'rod', length_m: 4.05, pieces: 3, closed_length_cm: 150, weight_g: 445, tip_diameter_mm: 3.4, sinker_load: '30-40', standard_sinker: 35, reel_seat_mm: null, carbon_percent: 99.8, price_cn: 5357, product_code: '259486' },
  { series_id: 'shimano_spin_power_rod_cn', model: '405BX+(ST)', model_image: null, category: 'rod', length_m: 4.05, pieces: 3, closed_length_cm: 150, weight_g: 415, tip_diameter_mm: 3.2, sinker_load: '28-35', standard_sinker: 34, reel_seat_mm: null, carbon_percent: 99.7, price_cn: 5159, product_code: '256232' },
  { series_id: 'shimano_spin_power_rod_cn', model: '405CX+(ST)', model_image: null, category: 'rod', length_m: 4.05, pieces: 3, closed_length_cm: 150, weight_g: 380, tip_diameter_mm: 2.9, sinker_load: '26-35', standard_sinker: 31, reel_seat_mm: null, carbon_percent: 99.6, price_cn: 4988, product_code: '256218' },
  { series_id: 'shimano_spin_power_rod_cn', model: '405DX+(ST)', model_image: null, category: 'rod', length_m: 4.05, pieces: 3, closed_length_cm: 150, weight_g: 345, tip_diameter_mm: 2.6, sinker_load: '24-32', standard_sinker: 28, reel_seat_mm: null, carbon_percent: 99.5, price_cn: 4851, product_code: '256195' }
];

module.exports.MODELS_DATA_SPIN_POWER = MODELS_DATA_SPIN_POWER;


// ============================================================
// 渔竿型号 — AXELSPIN TYPE R/F (CN) — 8 个型号
// ============================================================

const MODELS_DATA_AXELSPIN = [
  // Type-F（先调子）
  { series_id: 'shimano_axelspin_rod_cn', model: 'Type-F 405CX', model_image: null, category: 'rod', length_m: 4.05, pieces: 3, closed_length_cm: 150, weight_g: 425, tip_diameter_mm: 2.8, sinker_load: '25-35', standard_sinker: 30, reel_seat_mm: 840, carbon_percent: 99.6, price_cn: 4058, product_code: '254856' },
  { series_id: 'shimano_axelspin_rod_cn', model: 'Type-F 405BX', model_image: null, category: 'rod', length_m: 4.05, pieces: 3, closed_length_cm: 150, weight_g: 470, tip_diameter_mm: 3.0, sinker_load: '27-35', standard_sinker: 33, reel_seat_mm: 860, carbon_percent: 99.7, price_cn: 4173, product_code: '254870' },
  { series_id: 'shimano_axelspin_rod_cn', model: 'Type-F 405CX+', model_image: null, category: 'rod', length_m: 4.05, pieces: 3, closed_length_cm: 150, weight_g: 450, tip_diameter_mm: 2.9, sinker_load: '26-35', standard_sinker: 31, reel_seat_mm: 850, carbon_percent: 99.7, price_cn: 4118, product_code: '254863' },
  { series_id: 'shimano_axelspin_rod_cn', model: 'Type-F 405DX+', model_image: null, category: 'rod', length_m: 4.05, pieces: 3, closed_length_cm: 150, weight_g: 400, tip_diameter_mm: 2.6, sinker_load: '24-32', standard_sinker: 28, reel_seat_mm: 830, carbon_percent: 99.6, price_cn: 3997, product_code: '254849' },
  // Type-R（胴调子）
  { series_id: 'shimano_axelspin_rod_cn', model: 'Type-R 405CX', model_image: null, category: 'rod', length_m: 4.05, pieces: 3, closed_length_cm: 150, weight_g: 415, tip_diameter_mm: 2.8, sinker_load: '25-35', standard_sinker: 30, reel_seat_mm: 840, carbon_percent: 99.6, price_cn: 4058, product_code: '254894' },
  { series_id: 'shimano_axelspin_rod_cn', model: 'Type-R 405BX', model_image: null, category: 'rod', length_m: 4.05, pieces: 3, closed_length_cm: 150, weight_g: 460, tip_diameter_mm: 3.0, sinker_load: '27-35', standard_sinker: 33, reel_seat_mm: 860, carbon_percent: 99.7, price_cn: 4173, product_code: '254917' },
  { series_id: 'shimano_axelspin_rod_cn', model: 'Type-R 405CX+', model_image: null, category: 'rod', length_m: 4.05, pieces: 3, closed_length_cm: 150, weight_g: 440, tip_diameter_mm: 2.9, sinker_load: '26-35', standard_sinker: 31, reel_seat_mm: 850, carbon_percent: 99.6, price_cn: 4118, product_code: '254900' },
  { series_id: 'shimano_axelspin_rod_cn', model: 'Type-R 405DX+', model_image: null, category: 'rod', length_m: 4.05, pieces: 3, closed_length_cm: 150, weight_g: 390, tip_diameter_mm: 2.6, sinker_load: '24-32', standard_sinker: 28, reel_seat_mm: 830, carbon_percent: 99.6, price_cn: 3997, product_code: '254887' }
];

module.exports.MODELS_DATA_AXELSPIN = MODELS_DATA_AXELSPIN;


// ============================================================
// 渔轮型号 — FLIEGEN (CN) — 3 个型号
// ============================================================

const MODELS_DATA_FLIEGEN = [
  { series_id: 'shimano_fliegen_reel_cn', model: '35 极细规格', model_image: '', category: 'reel', gear_ratio: 3.5, max_drag_kg: 20, weight_g: 460, spool_spec: '73.5/35', line_capacity_nylon: '0.6-300, 0.8-250, 1-200', line_capacity_pe: '0.6-250, 0.8-200, 1-160', max_retrieve_cm: 83, handle_length_mm: 80, bearings: '8/1', price_cn: 3392, product_code: '047243' },
  { series_id: 'shimano_fliegen_reel_cn', model: '35 细线规格', model_image: '', category: 'reel', gear_ratio: 3.5, max_drag_kg: 20, weight_g: 460, spool_spec: '73.5/35', line_capacity_nylon: '1.2-250, 1.5-200, 2-150', line_capacity_pe: '0.8-250, 1-200, 1.2-165', max_retrieve_cm: 83, handle_length_mm: 80, bearings: '8/1', price_cn: 3392, product_code: '047250' },
  { series_id: 'shimano_fliegen_reel_cn', model: 'SD 35 标准规格', model_image: '', category: 'reel', gear_ratio: 3.5, max_drag_kg: 18, weight_g: 510, spool_spec: '76/35', line_capacity_nylon: '2-300, 3-200, 4-150', line_capacity_pe: '1.5-250, 2-200, 3-130', max_retrieve_cm: 84, handle_length_mm: 80, bearings: '8/1', price_cn: 3497, product_code: '047267' }
];

module.exports.MODELS_DATA_FLIEGEN = MODELS_DATA_FLIEGEN;


// ============================================================
// 渔竿型号 — SURF LANDER (并继) CN — 8 个型号
// ============================================================

const MODELS_DATA_SURF_LANDER_JOINT = [
  { series_id: 'shimano_surf_lander_joint_rod_cn', model: '385EX', model_image: null, category: 'rod', length_m: 3.87, pieces: 3, closed_length_cm: 136.6, weight_g: 335, tip_diameter_mm: 2.5, sinker_load: '20-30', standard_sinker: 25, reel_seat_mm: 740, carbon_percent: 99.4, price_cn: 2533, product_code: '244925' },
  { series_id: 'shimano_surf_lander_joint_rod_cn', model: '405EX', model_image: null, category: 'rod', length_m: 4.07, pieces: 3, closed_length_cm: 143.1, weight_g: 365, tip_diameter_mm: 2.4, sinker_load: '20-30', standard_sinker: 25, reel_seat_mm: 780, carbon_percent: 99.5, price_cn: 2588, product_code: '244949' },
  { series_id: 'shimano_surf_lander_joint_rod_cn', model: '385DX', model_image: null, category: 'rod', length_m: 3.87, pieces: 3, closed_length_cm: 136.6, weight_g: 365, tip_diameter_mm: 2.8, sinker_load: '23-30', standard_sinker: 27, reel_seat_mm: 760, carbon_percent: 99.4, price_cn: 2643, product_code: '244932' },
  { series_id: 'shimano_surf_lander_joint_rod_cn', model: '405DX', model_image: null, category: 'rod', length_m: 4.07, pieces: 3, closed_length_cm: 143.1, weight_g: 400, tip_diameter_mm: 2.7, sinker_load: '23-30', standard_sinker: 27, reel_seat_mm: 800, carbon_percent: 99.5, price_cn: 2698, product_code: '244956' },
  { series_id: 'shimano_surf_lander_joint_rod_cn', model: '405CX', model_image: null, category: 'rod', length_m: 4.07, pieces: 3, closed_length_cm: 143.1, weight_g: 425, tip_diameter_mm: 3.0, sinker_load: '25-35', standard_sinker: 30, reel_seat_mm: 820, carbon_percent: 99.6, price_cn: 2753, product_code: '244963' },
  { series_id: 'shimano_surf_lander_joint_rod_cn', model: '425CX', model_image: null, category: 'rod', length_m: 4.27, pieces: 3, closed_length_cm: 150.1, weight_g: 465, tip_diameter_mm: 3.0, sinker_load: '25-35', standard_sinker: 30, reel_seat_mm: 840, carbon_percent: 99.6, price_cn: 2863, product_code: '244987' },
  { series_id: 'shimano_surf_lander_joint_rod_cn', model: '405BX', model_image: null, category: 'rod', length_m: 4.07, pieces: 3, closed_length_cm: 143.1, weight_g: 455, tip_diameter_mm: 3.2, sinker_load: '27-35', standard_sinker: 33, reel_seat_mm: 840, carbon_percent: 99.6, price_cn: 2863, product_code: '244970' },
  { series_id: 'shimano_surf_lander_joint_rod_cn', model: '425BX', model_image: null, category: 'rod', length_m: 4.27, pieces: 3, closed_length_cm: 150.1, weight_g: 500, tip_diameter_mm: 3.2, sinker_load: '27-35', standard_sinker: 33, reel_seat_mm: 860, carbon_percent: 99.6, price_cn: 2918, product_code: '244994' }
];

module.exports.MODELS_DATA_SURF_LANDER_JOINT = MODELS_DATA_SURF_LANDER_JOINT;


// ============================================================
// 渔竿型号 — SURF LANDER (振出) CN — 8 个型号
// 注：450 TL 型号为 5 节振出，4.50m，收竿 103cm
// ============================================================

const MODELS_DATA_SURF_LANDER_TELE = [
  { series_id: 'shimano_surf_lander_tele_rod_cn', model: '405DX-T',  model_image: null, category: 'rod', length_m: 4.05, pieces: 4, closed_length_cm: 117, weight_g: 425, tip_diameter_mm: 2.6, sinker_load: '23-30', standard_sinker: 27, reel_seat_mm: 800, carbon_percent: 99.9, price_cn: 2423, product_code: '260529' },
  { series_id: 'shimano_surf_lander_tele_rod_cn', model: '425DX-T',  model_image: null, category: 'rod', length_m: 4.26, pieces: 4, closed_length_cm: 124, weight_g: 455, tip_diameter_mm: 2.6, sinker_load: '23-30', standard_sinker: 27, reel_seat_mm: 820, carbon_percent: 99.9, price_cn: 2478, product_code: '260536' },
  { series_id: 'shimano_surf_lander_tele_rod_cn', model: '450DX-TL', model_image: null, category: 'rod', length_m: 4.50, pieces: 5, closed_length_cm: 103, weight_g: 430, tip_diameter_mm: 2.4, sinker_load: '23-30', standard_sinker: 27, reel_seat_mm: 620, carbon_percent: 99.8, price_cn: 2533, product_code: '260581' },
  { series_id: 'shimano_surf_lander_tele_rod_cn', model: '405CX-T',  model_image: null, category: 'rod', length_m: 4.05, pieces: 4, closed_length_cm: 117, weight_g: 445, tip_diameter_mm: 2.8, sinker_load: '25-35', standard_sinker: 30, reel_seat_mm: 820, carbon_percent: 99.9, price_cn: 2478, product_code: '260543' },
  { series_id: 'shimano_surf_lander_tele_rod_cn', model: '425CX-T',  model_image: null, category: 'rod', length_m: 4.26, pieces: 4, closed_length_cm: 124, weight_g: 475, tip_diameter_mm: 2.8, sinker_load: '25-35', standard_sinker: 30, reel_seat_mm: 840, carbon_percent: 99.9, price_cn: 2533, product_code: '260550' },
  { series_id: 'shimano_surf_lander_tele_rod_cn', model: '450CX-TL', model_image: null, category: 'rod', length_m: 4.50, pieces: 5, closed_length_cm: 103, weight_g: 465, tip_diameter_mm: 2.5, sinker_load: '25-35', standard_sinker: 30, reel_seat_mm: 640, carbon_percent: 99.8, price_cn: 2588, product_code: '260598' },
  { series_id: 'shimano_surf_lander_tele_rod_cn', model: '405BX-T',  model_image: null, category: 'rod', length_m: 4.05, pieces: 4, closed_length_cm: 117, weight_g: 465, tip_diameter_mm: 3.0, sinker_load: '27-35', standard_sinker: 33, reel_seat_mm: 840, carbon_percent: 99.9, price_cn: 2533, product_code: '260567' },
  { series_id: 'shimano_surf_lander_tele_rod_cn', model: '425BX-T',  model_image: null, category: 'rod', length_m: 4.26, pieces: 4, closed_length_cm: 124, weight_g: 500, tip_diameter_mm: 3.0, sinker_load: '27-35', standard_sinker: 33, reel_seat_mm: 860, carbon_percent: 99.9, price_cn: 2588, product_code: '260574' }
];

module.exports.MODELS_DATA_SURF_LANDER_TELE = MODELS_DATA_SURF_LANDER_TELE;


// ============================================================
// 渔竿型号 — SURF GAZER (并继) CN — 5 个型号
// 数据来源：禧玛诺官网产品规格表
// ============================================================

const MODELS_DATA_SURF_GAZER_CN = [
  { series_id: 'shimano_surf_gazer_rod_cn', model: '25-405', model_image: null, category: 'rod', length_m: 4.05, pieces: 3, closed_length_cm: 142.4, weight_g: 355, tip_diameter_mm: 2.6, sinker_load: '20-30', standard_sinker: 25, reel_seat_mm: 720, carbon_percent: 99.5, price_cn: 1551, product_code: '274762' },
  { series_id: 'shimano_surf_gazer_rod_cn', model: '27-405', model_image: null, category: 'rod', length_m: 4.05, pieces: 3, closed_length_cm: 142.4, weight_g: 388, tip_diameter_mm: 2.8, sinker_load: '23-30', standard_sinker: 27, reel_seat_mm: 740, carbon_percent: 99.6, price_cn: 1646, product_code: '274779' },
  { series_id: 'shimano_surf_gazer_rod_cn', model: '30-405', model_image: null, category: 'rod', length_m: 4.05, pieces: 3, closed_length_cm: 142.4, weight_g: 410, tip_diameter_mm: 3.0, sinker_load: '25-35', standard_sinker: 30, reel_seat_mm: 760, carbon_percent: 99.6, price_cn: 1742, product_code: '274786' },
  { series_id: 'shimano_surf_gazer_rod_cn', model: '33-425', model_image: null, category: 'rod', length_m: 4.25, pieces: 3, closed_length_cm: 149.4, weight_g: 477, tip_diameter_mm: 3.2, sinker_load: '27-35', standard_sinker: 33, reel_seat_mm: 800, carbon_percent: 99.6, price_cn: 1838, product_code: '274793' },
  { series_id: 'shimano_surf_gazer_rod_cn', model: '33-450', model_image: null, category: 'rod', length_m: 4.50, pieces: 3, closed_length_cm: 157.9, weight_g: 465, tip_diameter_mm: 3.2, sinker_load: '27-35', standard_sinker: 33, reel_seat_mm: 820, carbon_percent: 99.2, price_cn: 1933, product_code: '274809' }
];

module.exports.MODELS_DATA_SURF_GAZER_CN = MODELS_DATA_SURF_GAZER_CN;


// ============================================================
// 渔竿型号 — SURF CHASER (振出) CN — 9 个型号
// 数据来源：禧玛诺官网产品规格表
// ============================================================

const MODELS_DATA_SURF_CHASER_CN = [
  { series_id: 'shimano_surf_chaser_rod_cn', model: '25-405T', model_image: null, category: 'rod', length_m: 4.07, pieces: 4, closed_length_cm: 115, weight_g: 395, tip_diameter_mm: 2.4, sinker_load: '20-30', standard_sinker: 25, reel_seat_mm: 700, carbon_percent: 99.8, price_cn: 1239, product_code: '272652' },
  { series_id: 'shimano_surf_chaser_rod_cn', model: '27-405T', model_image: null, category: 'rod', length_m: 4.07, pieces: 4, closed_length_cm: 115, weight_g: 430, tip_diameter_mm: 2.5, sinker_load: '23-30', standard_sinker: 27, reel_seat_mm: 700, carbon_percent: 99.8, price_cn: 1260, product_code: '272669' },
  { series_id: 'shimano_surf_chaser_rod_cn', model: '27-425T', model_image: null, category: 'rod', length_m: 4.28, pieces: 4, closed_length_cm: 121, weight_g: 435, tip_diameter_mm: 2.6, sinker_load: '23-30', standard_sinker: 27, reel_seat_mm: 720, carbon_percent: 99.8, price_cn: 1281, product_code: '272676' },
  { series_id: 'shimano_surf_chaser_rod_cn', model: '30-405T', model_image: null, category: 'rod', length_m: 4.07, pieces: 4, closed_length_cm: 115, weight_g: 460, tip_diameter_mm: 2.8, sinker_load: '25-35', standard_sinker: 30, reel_seat_mm: 700, carbon_percent: 99.8, price_cn: 1313, product_code: '272683' },
  { series_id: 'shimano_surf_chaser_rod_cn', model: '30-425T', model_image: null, category: 'rod', length_m: 4.28, pieces: 4, closed_length_cm: 121, weight_g: 470, tip_diameter_mm: 2.8, sinker_load: '25-35', standard_sinker: 30, reel_seat_mm: 720, carbon_percent: 99.8, price_cn: 1334, product_code: '272690' },
  { series_id: 'shimano_surf_chaser_rod_cn', model: '30-450T', model_image: null, category: 'rod', length_m: 4.52, pieces: 5, closed_length_cm: 105, weight_g: 475, tip_diameter_mm: 2.5, sinker_load: '25-35', standard_sinker: 30, reel_seat_mm: 740, carbon_percent: 99.8, price_cn: 1365, product_code: '272706' },
  { series_id: 'shimano_surf_chaser_rod_cn', model: '33-405T', model_image: null, category: 'rod', length_m: 4.07, pieces: 4, closed_length_cm: 115, weight_g: 500, tip_diameter_mm: 3.0, sinker_load: '27-35', standard_sinker: 33, reel_seat_mm: 700, carbon_percent: 99.8, price_cn: 1365, product_code: '272713' },
  { series_id: 'shimano_surf_chaser_rod_cn', model: '33-425T', model_image: null, category: 'rod', length_m: 4.28, pieces: 4, closed_length_cm: 121, weight_g: 505, tip_diameter_mm: 3.0, sinker_load: '27-35', standard_sinker: 33, reel_seat_mm: 720, carbon_percent: 99.8, price_cn: 1386, product_code: '272720' },
  { series_id: 'shimano_surf_chaser_rod_cn', model: '33-450T', model_image: null, category: 'rod', length_m: 4.52, pieces: 5, closed_length_cm: 105, weight_g: 530, tip_diameter_mm: 2.8, sinker_load: '27-35', standard_sinker: 33, reel_seat_mm: 740, carbon_percent: 99.8, price_cn: 1418, product_code: '272737' }
];

module.exports.MODELS_DATA_SURF_CHASER_CN = MODELS_DATA_SURF_CHASER_CN;


// ============================================================
// 渔竿型号 — SPINJOY (振出) CN — 15 个型号
// 数据来源：禧玛诺官网产品规格表
// 注：butt_diameter_mm 为元径（竿尾直径），SPINJOY 特有字段
// ============================================================

const MODELS_DATA_SPINJOY_CN = [
  { series_id: 'shimano_spinjoy_rod_cn', model: '275HX-T', model_image: null, category: 'rod', length_m: 2.75, pieces: 3, closed_length_cm: 101.5, weight_g: 175, tip_diameter_mm: 1.9, butt_diameter_mm: 18.6, sinker_load: '10-20', standard_sinker: null, reel_seat_mm: null, carbon_percent: 67.1, price_cn: 630,  product_code: '' },
  { series_id: 'shimano_spinjoy_rod_cn', model: '300HX-T', model_image: null, category: 'rod', length_m: 3.00, pieces: 4, closed_length_cm: 86.5,  weight_g: 205, tip_diameter_mm: 1.9, butt_diameter_mm: 20.6, sinker_load: '10-20', standard_sinker: null, reel_seat_mm: null, carbon_percent: 65.0, price_cn: 725,  product_code: '' },
  { series_id: 'shimano_spinjoy_rod_cn', model: '330HX-T', model_image: null, category: 'rod', length_m: 3.30, pieces: 4, closed_length_cm: 94.0,  weight_g: 230, tip_diameter_mm: 1.9, butt_diameter_mm: 21.0, sinker_load: '10-20', standard_sinker: null, reel_seat_mm: null, carbon_percent: 66.9, price_cn: 756,  product_code: '' },
  { series_id: 'shimano_spinjoy_rod_cn', model: '360HX-T', model_image: null, category: 'rod', length_m: 3.60, pieces: 4, closed_length_cm: 101.5, weight_g: 260, tip_diameter_mm: 1.9, butt_diameter_mm: 21.2, sinker_load: '10-20', standard_sinker: null, reel_seat_mm: null, carbon_percent: 69.5, price_cn: 788,  product_code: '' },
  { series_id: 'shimano_spinjoy_rod_cn', model: '390HX-T', model_image: null, category: 'rod', length_m: 3.90, pieces: 4, closed_length_cm: 109.0, weight_g: 295, tip_diameter_mm: 1.9, butt_diameter_mm: 21.4, sinker_load: '10-20', standard_sinker: null, reel_seat_mm: null, carbon_percent: 71.8, price_cn: 798,  product_code: '' },
  { series_id: 'shimano_spinjoy_rod_cn', model: '360GX-T', model_image: null, category: 'rod', length_m: 3.60, pieces: 4, closed_length_cm: 103.0, weight_g: 270, tip_diameter_mm: 2.1, butt_diameter_mm: 21.4, sinker_load: '15-23', standard_sinker: null, reel_seat_mm: null, carbon_percent: 86.3, price_cn: 809,  product_code: '' },
  { series_id: 'shimano_spinjoy_rod_cn', model: '360FX-T', model_image: null, category: 'rod', length_m: 3.60, pieces: 4, closed_length_cm: 103.0, weight_g: 285, tip_diameter_mm: 2.2, butt_diameter_mm: 21.6, sinker_load: '18-25', standard_sinker: null, reel_seat_mm: null, carbon_percent: 87.9, price_cn: 830,  product_code: '' },
  { series_id: 'shimano_spinjoy_rod_cn', model: '405FX-T', model_image: null, category: 'rod', length_m: 4.05, pieces: 4, closed_length_cm: 114.0, weight_g: 355, tip_diameter_mm: 2.2, butt_diameter_mm: 21.8, sinker_load: '18-25', standard_sinker: null, reel_seat_mm: null, carbon_percent: 88.8, price_cn: 840,  product_code: '' },
  { series_id: 'shimano_spinjoy_rod_cn', model: '405EX-T', model_image: null, category: 'rod', length_m: 4.05, pieces: 4, closed_length_cm: 114.0, weight_g: 375, tip_diameter_mm: 2.3, butt_diameter_mm: 22.8, sinker_load: '20-30', standard_sinker: null, reel_seat_mm: null, carbon_percent: 89.5, price_cn: 840,  product_code: '' },
  { series_id: 'shimano_spinjoy_rod_cn', model: '425EX-T', model_image: null, category: 'rod', length_m: 4.25, pieces: 4, closed_length_cm: 119.0, weight_g: 405, tip_diameter_mm: 2.3, butt_diameter_mm: 23.0, sinker_load: '20-30', standard_sinker: null, reel_seat_mm: null, carbon_percent: 89.9, price_cn: 861,  product_code: '' },
  { series_id: 'shimano_spinjoy_rod_cn', model: '405DX-T', model_image: null, category: 'rod', length_m: 4.05, pieces: 4, closed_length_cm: 114.0, weight_g: 400, tip_diameter_mm: 2.4, butt_diameter_mm: 23.0, sinker_load: '23-30', standard_sinker: null, reel_seat_mm: null, carbon_percent: 90.2, price_cn: 861,  product_code: '' },
  { series_id: 'shimano_spinjoy_rod_cn', model: '425DX-T', model_image: null, category: 'rod', length_m: 4.25, pieces: 4, closed_length_cm: 119.0, weight_g: 430, tip_diameter_mm: 2.4, butt_diameter_mm: 23.2, sinker_load: '23-30', standard_sinker: null, reel_seat_mm: null, carbon_percent: 90.7, price_cn: 903,  product_code: '' },
  { series_id: 'shimano_spinjoy_rod_cn', model: '450DX-T', model_image: null, category: 'rod', length_m: 4.50, pieces: 5, closed_length_cm: 104.0, weight_g: 455, tip_diameter_mm: 2.2, butt_diameter_mm: 23.4, sinker_load: '23-30', standard_sinker: null, reel_seat_mm: null, carbon_percent: 91.5, price_cn: 966,  product_code: '' },
  { series_id: 'shimano_spinjoy_rod_cn', model: '405CX-T', model_image: null, category: 'rod', length_m: 4.05, pieces: 4, closed_length_cm: 114.0, weight_g: 425, tip_diameter_mm: 2.6, butt_diameter_mm: 23.2, sinker_load: '25-35', standard_sinker: null, reel_seat_mm: null, carbon_percent: 91.0, price_cn: 903,  product_code: '' },
  { series_id: 'shimano_spinjoy_rod_cn', model: '425CX-T', model_image: null, category: 'rod', length_m: 4.25, pieces: 4, closed_length_cm: 119.0, weight_g: 460, tip_diameter_mm: 2.6, butt_diameter_mm: 23.2, sinker_load: '25-35', standard_sinker: null, reel_seat_mm: null, carbon_percent: 91.5, price_cn: 935,  product_code: '' },
];

module.exports.MODELS_DATA_SPINJOY_CN = MODELS_DATA_SPINJOY_CN;
