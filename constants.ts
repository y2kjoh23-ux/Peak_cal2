
export const PT_RATIO = 120; // 22.9kV Standard PT Ratio (13200/110)

/**
 * 한전 표준 MOF CT 규격 리스트
 */
export const CT_VALUES = [
  5, 10, 15, 20, 30, 40, 50, 75, 100, 150, 200, 250, 300, 400, 500, 600, 750, 800
];

export const MAX_TR_MULTIPLIER = 35.7; // Estimated Max TR based on CT

/**
 * 사용자 제공 AISS 컨트롤러 표준 세팅 테이블
 * [변압기 용량 상한, 상전류, 지락전류, 시간지연]
 */
export const AISS_CONFIG_TABLE = [
  { limit: 200, phase: "5", ground: "2.5", delay: "0.5~1.0" },
  { limit: 250, phase: "10", ground: "5", delay: "0.5~1.0" },
  { limit: 500, phase: "20", ground: "10", delay: "0.5~1.0" },
  { limit: 750, phase: "30", ground: "15", delay: "0.5~1.0" },
  { limit: 1300, phase: "50", ground: "25", delay: "0.5~1.0" },
  { limit: 1800, phase: "70", ground: "35", delay: "0.5~1.0" },
  { limit: 2600, phase: "100", ground: "50", delay: "0.5~1.0" },
  { limit: 3700, phase: "140", ground: "70", delay: "0.5~1.0" },
  { limit: 5000, phase: "200", ground: "100", delay: "0.5~1.0" },
];
