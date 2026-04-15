const BRANDS = [
  '拓竹 (Bambu Lab)',
  'Kexcelled',
  'Polymaker',
  'Panchorma',
  'Polylite',
  '彩多屋',
  'eSUN 易生',
  '三绿 (SUNLU)',
  'Sailner',
  '余兄弟',
  '蓝竹科技',
  '优线三维',
  '瓦力增材',
  '三慈',
  '方途',
  '大简',
  '没毛病 Bye hassle',
  'JAYO',
  'R3D',
  '魔创 (McCreate)',
  '爱丽兹',
  '易型',
  '爱乐酷',
  '维籁增材',
  '新森',
  '3Dhojor',
  '频妙',
  '叁生万物',
  '海螺号',
  '彩格',
  '七彩蚕',
  '科雷迪',
  '创想三维',
  '天瑞'
];

const MATERIAL_TYPES = [
  'PLA',
  'PLA+',
  'PLA+2.0',
  'PETG',
  'ABS',
  'ASA',
  'ASA-CF',
  'TPU',
  'TPE',
  'PA',
  'PC',
  'PET',
  'PPA',
  'PAHT',
  '碳纤维',
  '玻璃纤维'
];

const SERIES_OPTIONS = [
  'Silk',
  'Matte',
  'Basic',
  'Lite',
  'Sparkle',
  'Translucent',
  'Rapid',
  'GF',
  'CF',
  'HF'
];

const SUPPLIERS = [
  '拼多多',
  '京东',
  '淘宝',
  '抖音',
  '小红书',
  '其他'
];

const SORT_FIELDS = [
  { label: '默认排序', value: 'default' },
  { label: '材料类型', value: 'materialType' },
  { label: '品牌', value: 'brand' },
  { label: '购入日期', value: 'date' },
  { label: '购入单价', value: 'price' },
  { label: '剩余重量', value: 'remain' }
];

const SORT_ORDERS = [
  { label: '升序', value: 'asc' },
  { label: '降序', value: 'desc' }
];

const COLOR_SWATCHES = [
  '#ffffff',
  '#111827',
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#06b6d4',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#6b7280',
  '#a16207'
];

module.exports = {
  BRANDS,
  MATERIAL_TYPES,
  SERIES_OPTIONS,
  SUPPLIERS,
  SORT_FIELDS,
  SORT_ORDERS,
  COLOR_SWATCHES
};