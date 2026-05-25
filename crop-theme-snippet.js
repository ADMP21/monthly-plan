// ── Crop theme map ──────────────────────────────────────────
// เพิ่ม snippet นี้ใน app.js ในส่วนที่จัดการ crop-tab click
// ให้เรียก setCropTheme(cropName) ทุกครั้งที่ switch tab

const CROP_THEME_MAP = {
  'ข้าวโพดฝักอ่อน': 'corn',
  'ถั่วแระ':         'edamame',
  'ถั่วพุ่ม':        'bush',
  'ถั่วแขก':         'longbean',
};

function setCropTheme(cropName) {
  const key = CROP_THEME_MAP[cropName] || 'corn';
  document.documentElement.dataset.crop = key;
}

// ── ตัวอย่างการใช้งาน ────────────────────────────────────────
// หา event listener ของ .crop-tab ใน app.js แล้วเพิ่มบรรทัดนี้:
//
//   document.querySelectorAll('.crop-tab').forEach(tab => {
//     tab.addEventListener('click', () => {
//       const cropName = tab.dataset.crop;   // ค่าจาก data-crop attribute ใน HTML
//       setCropTheme(cropName);
//       // ... โค้ดเดิมของคุณ (switch tab active, load data ฯลฯ)
//     });
//   });
//
// หรือถ้ามี activeCrop variable อยู่แล้ว แค่เพิ่ม:
//   setCropTheme(activeCrop);
// ในทุกที่ที่ activeCrop เปลี่ยน
