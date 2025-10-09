document.addEventListener('DOMContentLoaded', async function() {

  // ================= Date =================
  function updateDate() {
    const dateElement = document.getElementById('Date');
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    dateElement.textContent = `${day}/${month}/${year}`;
  }
  updateDate();

// ================= Total Marker =================
  const totalBarContainer = document.getElementById('Total_Bar'); 
  let marker = document.createElement('div');

  function updateMarker(totalPercent) {
    const markerPosition = 182 * (totalPercent / 100);
    marker.style.top = `${182 - markerPosition}px`; 
  }

  // ================= Progress bars =================
  const floor1Bar = document.querySelector('#floor1 .progress-bar');
  const totalBar = document.querySelector('#Total_Bar .progress-bar');
  const glow = document.querySelector('.glow');
  const realtimeKWEl = document.querySelector('.Realtime_kW');
  const mainContainer = document.querySelector('.Main_Container');
  const glowEl = document.querySelector('.glow');
  const totalBarText = document.getElementById('Total_Bar_Text');
  const floor1Text = document.getElementById('floor1_Text');
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const localDate = `${yyyy}-${mm}-${dd}`;

  const V = 400;
  const root3 = Math.sqrt(3);
  const floor1_maxA = 100;
  const floor1_maxKW = root3 * V * floor1_maxA / 1000;
  const total_maxA = 100;
  const total_maxKW = root3 * V * total_maxA / 1000;

  async function updateBarsAndKW() {
    try {
const today = new Date();
const yyyy = today.getFullYear();
const mm = String(today.getMonth() + 1).padStart(2, '0');
const dd = String(today.getDate()).padStart(2, '0');
const localDate = `${yyyy}-${mm}-${dd}`;

const res = await fetch('https://api-kx4r63rdjq-an.a.run.app/daily-energy/px_dh?date=' + localDate);
      const json = await res.json();
      const data = json.data;
      const latest = data.length ? data[data.length - 1].power : 0;

      // Floor 1 Bar
      const floor1Percent = Math.min((latest / floor1_maxKW) * 100, 100);
      if(floor1Bar){
        floor1Bar.style.width = `${floor1Percent}%`;
        floor1Bar.style.backgroundColor = floor1Percent <= 50 ? '#FBBF32' : '#b82500';
      }
      if(floor1Text){
        floor1Text.textContent = `${Math.round(floor1Percent)}%`;
      }

      // Total Bar
      const totalPercent = Math.min((latest / total_maxKW) * 100, 100);
      if(totalBar){
        totalBar.style.height = `${totalPercent / 100 * 200}px`; 
        totalBar.style.backgroundColor = totalPercent <= 50 ? '#FBBF32' : '#b82500';
      }
      if(totalBarText){
        totalBarText.textContent = `${Math.round(totalPercent)}%`;
      }
      if(mainContainer && glowEl){
        if(totalPercent <= 50){
          mainContainer.style.boxShadow = "0 0 5px 2px #FBBF32, inset 0 0 20px 2px #F9B30F";
          glowEl.style.boxShadow = "0 0 6px 5px #FBBF32";
        } else {
          mainContainer.style.boxShadow = "0 0 10px 2px #b82500, inset 0 0 40px 2px #e63939";
          glowEl.style.boxShadow = "0 0 50px 20px rgba(230, 57, 57, 0.4)";
        }
      }

      // Update Marker
      updateMarker(totalPercent);

      // Glow
      if(glow){
        const intensity = totalPercent / 100;
        const glowAlpha = 0.3 + intensity * 0.7;
        const glowSize = 100 + intensity * 50;
        glow.style.transition = 'all 0.5s ease';
        glow.style.background = `radial-gradient(circle, rgba(255,200,50,${glowAlpha}) 0%, rgba(255,200,50,0) 70%)`;
        glow.style.width = `${glowSize}%`;
        glow.style.height = `${glowSize}%`;
      }

      // Realtime kW
      if(realtimeKWEl){
        realtimeKWEl.textContent = latest.toFixed(2) + ' kW';
      }

    } catch (err) {
      console.error('Error fetching power data:', err);
    }
  }

  updateBarsAndKW();
  setInterval(updateBarsAndKW, 1000);
  // ================= Daily Bill =================
  const dailyBillEl = document.getElementById('DailyBill');
  const unitEl = document.querySelector('.unit');
  const pricePerUnit = 4.4;

  async function fetchDailyBill() {
    try {
      const today = new Date().toISOString().split('T')[0];
      const url = `https://momaybackend02-production.up.railway.app/daily-bill?date=${today}`;
      const res = await fetch(url);
      const json = await res.json();

      const bill = json.electricity_bill ?? 0;
      const units = bill / pricePerUnit;

      if (dailyBillEl) dailyBillEl.textContent = bill.toFixed(2) + ' THB';
      if (unitEl) unitEl.textContent = units.toFixed(2) + ' Unit';

    } catch (err) {
      console.error('Error fetching daily bill:', err);
      if (dailyBillEl) dailyBillEl.textContent = 'Error';
      if (unitEl) unitEl.textContent = '';
    }
  }

  fetchDailyBill();
  setInterval(fetchDailyBill, 1800000);


  // ================= Chart.js =================
  const canvas = document.getElementById('EnergyChart');
  if (canvas){
    const ctx = canvas.getContext('2d');
    const labels = Array.from({ length: 1440 }, (_, i) => {
      const hour = String(Math.floor(i / 60)).padStart(2,'0');
      const min = String(i % 60).padStart(2,'0');
      return `${hour}:${min}`;
    });

    const gradient = ctx.createLinearGradient(0,0,0,400);
    gradient.addColorStop(0,'rgba(139,69,19,0.4)');
    gradient.addColorStop(0.5,'rgba(210,180,140,0.3)');
    gradient.addColorStop(1,'rgba(245,222,179,0.1)');

    const data = { labels, datasets:[{label:'Power', data:new Array(1440).fill(null), borderColor:'#8B4513', backgroundColor: gradient, fill:true, borderWidth:0.5, tension:0.3, pointRadius:0}] };
const config = {
  type: 'line',
  data,
  options: {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: true,
        backgroundColor: 'rgba(0,0,0,0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        cornerRadius: 8,
        displayColors: false,
        callbacks: {
          title: function(items){ return items[0].label; },
          label: function(item){
            const datasetLabel = item.dataset.label;
            const value = item.raw;
            if(datasetLabel==='Max') return `Max: ${value.toFixed(2)} kW`;
            else if(datasetLabel==='Average') return `Average: ${value.toFixed(2)} kW`;
            else if(datasetLabel==='Power') return value!==null ? `Power: ${value.toFixed(2)} kW` : '-';
          }
        }
      }
    },
    scales: {
      x: {
        type: 'category',
        grid: { display: false },
        ticks: {
          autoSkip: false,
          color: '#000',
          maxRotation: 0,
          minRotation: 0,
          callback: function(v){
            const l = this.getLabelForValue(v);
            if(!l) return '';
            const [h,m] = l.split(':');
            return m==='00' && parseInt(h)%3===0 ? l : '';
          }
        },
        title: {
          display: true,
          text: 'Time (HH:MM)',
          color: '#000',
          font: { size: 14, weight: 'bold' },
        }
      },
      y: {
        grid: { display: false },
        beginAtZero: true,
        min: 0,
        ticks: { color: '#000' },
        title: {
          display: true,
          text: 'Power (kW)',
          color: '#000',
          font: { size: 14, weight: 'bold' }
        }
      }
    }
  }
};
    const chart = new Chart(ctx, config);

    // ================= Date Picker =================
    const prevBtn = document.getElementById('prevDay');
    const nextBtn = document.getElementById('nextDay');
    const currentDayEl = document.getElementById('currentDay');
    let currentDate = new Date();

    function formatDate(date){
      const d=String(date.getDate()).padStart(2,'0');
      const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
      const m = monthNames[date.getMonth()];     
      const y=date.getFullYear();
      return `${d} - ${m} - ${y}`;
    }
    currentDayEl.textContent = formatDate(currentDate);

    async function fetchDailyData(date){
      const dateStr = date.toISOString().split('T')[0];
      try{
        const res = await fetch(`https://api-kx4r63rdjq-an.a.run.app/daily-energy/px_dh?date=${dateStr}`);
        const json = await res.json();
        return json.data;
      }catch(err){console.error(err); return [];}
    }

    async function updateChart(date){
      const values = await fetchDailyData(date);
      const chartData = new Array(1440).fill(null);
      values.forEach(item=>{
        const t = new Date(item.timestamp);
        const idx = t.getUTCHours()*60 + t.getUTCMinutes();
        chartData[idx] = item.power;
      });
      let maxVal=null, maxIdx=null, sum=0, count=0;
      chartData.forEach((v,i)=>{
        if(v!==null){ if(maxVal===null||v>maxVal){ maxVal=v; maxIdx=i; } sum+=v; count++; }
      });
      const avgVal = count>0?sum/count:null;

      chart.data.datasets=[
        {label:'Power', data:chartData, borderColor:'#8B4513', backgroundColor:gradient, fill:true, borderWidth:0.5, tension:0.3, pointRadius:0.1},
        {label:'Max', data:new Array(1440).fill(null).map((_,i)=>i===maxIdx?maxVal:null), borderColor:'#ff9999', pointRadius:5, pointBackgroundColor:'#ff9999', fill:false, showLine:false},
        {label:'Average', data:new Array(1440).fill(avgVal), borderColor:'#000', borderDash:[5,5], fill:false, pointRadius:0,  borderWidth: 1}
      ];
      chart.update();
    }

    function changeDay(delta){ currentDate.setDate(currentDate.getDate()+delta); currentDayEl.textContent=formatDate(currentDate); updateChart(currentDate); }
    prevBtn.addEventListener('click', ()=>changeDay(-1));
    nextBtn.addEventListener('click', ()=>changeDay(1));
    updateChart(currentDate);
  }
  // ================= FullCalendar =================
  const calendarEl = document.getElementById('calendar');
  let calendar;

function isToday(dateStr) {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const today = `${yyyy}-${mm}-${dd}`;
  return dateStr === today;
}


  if (calendarEl) {
    calendar = new FullCalendar.Calendar(calendarEl, {
      initialView: 'dayGridMonth',
      locale: 'en',
      headerToolbar: { left: 'prev', center: 'title', right: 'next' },
      height: 600,
      dateClick: async function(info) {
        const datePopup = document.getElementById('DatePopup');
        const popupDateEl = datePopup.querySelector('.popup-date');
        const popupBillEl = document.getElementById('popup-bill');
        const popupUnitEl = document.getElementById('popup-unit');

        datePopup.style.display = 'flex';
        datePopup.classList.add('active');
        if (popupDateEl) popupDateEl.textContent = info.dateStr;

        try {
          const pricePerUnit = 4.4;
          const url = `https://momaybackend02-production.up.railway.app/daily-bill?date=${info.dateStr}`;
          const res = await fetch(url);
          const json = await res.json();
          const bill = json.electricity_bill ?? 0;
          const units = bill / pricePerUnit;

          if (popupBillEl) popupBillEl.textContent = bill.toFixed(2) + ' THB';
          if (popupUnitEl) popupUnitEl.textContent = units.toFixed(2) + ' Unit';

          if (isToday(info.dateStr)) {
            popupBillEl.parentNode.insertBefore(popupBillEl, popupUnitEl);
          }

        } catch (err) {
          console.error('Error fetching daily bill:', err);
          if (popupBillEl) popupBillEl.textContent = 'Error';
          if (popupUnitEl) popupUnitEl.textContent = '';
        }
      },
      events: async function(fetchInfo, successCallback, failureCallback) {
        try {
          const res = await fetch(`https://momaybackend02-production.up.railway.app/calendar`);
          const data = await res.json();
          const start = new Date(fetchInfo.startStr);
          const end = new Date(fetchInfo.endStr);
          const filtered = data.filter(item => {
            const d = new Date(item.start);
            return d >= start && d < end;
          });
          const styled = filtered.map(event => ({ ...event, textColor: 'black', backgroundColor: 'transparent', borderColor: 'transparent' }));
          successCallback(styled);
        } catch (err) { console.error("Error fetching calendar:", err); failureCallback(err); }
      }
    });
    calendar.render();
    setTimeout(() => { calendar.updateSize(); }, 100);
  }

  // ================= ปิด popup =================
  const datePopup = document.getElementById('DatePopup');
  const closeBtn = document.getElementById('closeDatePopup');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      datePopup.classList.remove('active');
      datePopup.style.display = 'none';
    });
  }
  if (datePopup) {
    datePopup.addEventListener('click', (e) => {
      if (e.target === datePopup) {
        datePopup.classList.remove('active');
        datePopup.style.display = 'none';
      }
    });
  }



  // ================= Weather Sukhothai =================
  async function fetchCurrentWeatherSukhothai() {
    try {
      const lat = 17.0080, lon = 99.8238;
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&timezone=Asia/Bangkok`;
      const res = await fetch(url);
      const data = await res.json();
      const weatherCode = data.current_weather.weathercode;
      const temp = data.current_weather.temperature;
      function weatherCodeToEmoji(code) {
        if (code === 0) return "☀️";
        if ([1,2,3].includes(code)) return "⛅";
        if ([45,48].includes(code)) return "🌫️";
        if ([51,53,55].includes(code)) return "🌦️";
        if ([56,57].includes(code)) return "🌧️";
        if ([61,63,65].includes(code)) return "🌧️";
        if ([66,67].includes(code)) return "🌧️";
        if ([71,73,75].includes(code)) return "🌧️";
        if (code === 77) return "❄️";
        if ([80,81,82].includes(code)) return "🌧️";
        if ([85,86].includes(code)) return "🌧️";
        if (code === 95) return "⛈️";
        if ([96,99].includes(code)) return "⛈️";
        return "🌡️";
      }
      document.getElementById('weather-city').innerText = "Sukhothai";
      document.getElementById('weather-icon').innerText = weatherCodeToEmoji(weatherCode);
      document.getElementById('weather-temp').innerText = temp.toFixed(1) + "°C";
    } catch (e) {
      console.error("Error fetching current weather:", e);
      document.getElementById('weather-city').innerText = "Sukhothai";
      document.getElementById('weather-icon').innerText = "❓";
      document.getElementById('weather-temp').innerText = "-°C";
    }
  }
  fetchCurrentWeatherSukhothai();
  setInterval(fetchCurrentWeatherSukhothai, 1800000);

  // ================= Calendar Popup =================
  const calendarIcon = document.querySelector("#Calendar_icon img");
  const popup = document.getElementById("calendarPopup");
  calendarIcon.addEventListener("click", function() { 
    popup.classList.add("active"); 
    calendar.updateSize();
  });
  popup.addEventListener("click", function(e) { 
    if (e.target === popup) popup.classList.remove("active"); 

  });
// ================= Kwang Solar Popup =================
const kwangIcon = document.getElementById("Kwang_icon");
const overlay = document.getElementById("overlay");
const kwangPopup = document.getElementById("kwangPopup");
const kwangPowerEl = document.getElementById("kwangPower");
const kwangBillEl = document.getElementById("kwangBill");
const kwangCapacityEl = document.getElementById("kwangCapacity");
const kwangMonthEl = document.getElementById("kwangMonth");

const prevBtnKwang = document.getElementById('kwangPrevDay');
const nextBtnKwang = document.getElementById('kwangNextDay');
const currentDayElKwang = document.getElementById('kwangCurrentDay');

let kwangDate = new Date();

// แปลงวันที่เป็นข้อความ
function formatDate(date){
  const d = String(date.getDate()).padStart(2,'0');
  const monthNames = ["January","February","March","April","May","June",
                      "July","August","September","October","November","December"];
  const m = monthNames[date.getMonth()];
  const y = date.getFullYear();
  return `${d} - ${m} - ${y}`;
}

// อัปเดต UI และเรียก fetch
function updateKwangDateUI() {
  currentDayElKwang.textContent = formatDate(kwangDate);
  fetchKwangData(kwangDate.toISOString().split('T')[0]);
}

// เปิด popup
kwangIcon.addEventListener("click", () => {
  kwangPopup.classList.add("active");
  kwangPopup.style.display = "flex";
  overlay.style.display = "block";   // ✅ แสดง overlay
  updateKwangDateUI();
});

// ปิด popup เมื่อคลิก overlay
overlay.addEventListener("click", () => {
  kwangPopup.style.display = "none";
  kwangPopup.classList.remove("active"); // ✅ เอา active ออกด้วย
  overlay.style.display = "none";       // ✅ ซ่อน overlay
});

// ปุ่ม prev/next
prevBtnKwang.addEventListener('click', () => {
  kwangDate.setDate(kwangDate.getDate() - 1);
  updateKwangDateUI();
});

nextBtnKwang.addEventListener('click', () => {
  kwangDate.setDate(kwangDate.getDate() + 1);
  updateKwangDateUI();
});

// กดวันที่เพื่อเลือกปฏิทินจริง
currentDayElKwang.addEventListener('click', () => {
  const tmpInput = document.createElement('input');
  tmpInput.type = 'date';
  tmpInput.value = kwangDate.toISOString().split('T')[0];
  tmpInput.style.position = 'absolute';
  tmpInput.style.opacity = 0;
  document.body.appendChild(tmpInput);
  tmpInput.focus();
  tmpInput.onchange = () => {
    kwangDate = new Date(tmpInput.value);
    updateKwangDateUI();
    document.body.removeChild(tmpInput);
  }
  tmpInput.click();
});

// fetch ข้อมูล
async function fetchKwangData(date) {
  try {
    const res = await fetch(`https://momaybackend02-production.up.railway.app/solar-size?date=${date}`);
    const json = await res.json();

    kwangPowerEl.textContent = (json.totalEnergyKwh ?? 0).toFixed(2) + " Unit";
    kwangCapacityEl.textContent = (json.solarCapacity_kW ?? 0).toFixed(2) + " kW";
    kwangBillEl.textContent = (json.savingsDay ?? 0).toFixed(2) + " THB";
    kwangMonthEl.textContent = (json.savingsMonth ?? 0).toFixed(2) + " THB";
  
  } catch (err) {
    kwangPowerEl.textContent = "- kWh";
    kwangCapacityEl.textContent = "- kW";
    kwangBillEl.textContent = "- THB";
    kwangMonthEl.textContent = "- THB";
  }
}


// ================= Daily Diff =================
const dailyYesterdayEl = document.getElementById("dailyYesterday");
const dailyDayBeforeEl = document.getElementById("dailyDayBefore");
const dailyDiffEl = document.getElementById("dailyDiffValue");
const dailyPopupEl = document.getElementById('dailyPopup');
const overlayEl = document.getElementById('overlay');

// ฟังก์ชัน fetch ข้อมูล
async function fetchDailyDiff() {
  try {
    const res = await fetch('https://momaybackend02-production.up.railway.app/daily-diff');
    const json = await res.json();
    return json;
  } catch (err) {
    console.error("Error fetching daily diff:", err);
    return null;
  }
}

// ฟังก์ชันแปลงวันที่เป็น dd/mm/yyyy
function formatDateDMY(dateStr) {
  const date = new Date(dateStr);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0'); // เดือนเริ่มจาก 0
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

// ฟังก์ชันอัปเดต popup
async function updateDailyDiff() {
  const data = await fetchDailyDiff();
  if (!data) return;

// Yesterday
if (document.getElementById("yesterdayDate") && dailyYesterdayEl) {
  document.getElementById("yesterdayDate").innerHTML = `
    <strong>${formatDateDMY(data.yesterday.date)}</strong>
  `;
  dailyYesterdayEl.innerHTML = `
    ${data.yesterday.energy_kwh.toFixed(2)} Unit<br>
    ${data.yesterday.electricity_bill.toFixed(2)} THB.
  `;
}

// Day Before
if (document.getElementById("dayBeforeDate") && dailyDayBeforeEl) {
  document.getElementById("dayBeforeDate").innerHTML = `
    <strong>${formatDateDMY(data.dayBefore.date)}</strong>
  `;
  dailyDayBeforeEl.innerHTML = `
    ${data.dayBefore.energy_kwh.toFixed(2)} Unit<br>
    ${data.dayBefore.electricity_bill.toFixed(2)} THB.
  `;
}

// Diff
if (dailyDiffEl) {
  const bill = data.diff.electricity_bill;

  // ลูกศร SVG
  const arrowUp = `<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                     <path d="M12 2L5 10h14L12 2z" fill="red"/>
                   </svg>`;
  const arrowDown = `<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                       <path d="M12 22l7-8H5l7 8z" fill="green"/>
                     </svg>`;

  // กำหนดสีตัวเลข
  const color = bill < 0 ? 'red' : 'green';
  const arrow = bill < 0 ? arrowUp : arrowDown;

  dailyDiffEl.innerHTML = `
    <div style="text-align:center; display:inline-flex; align-items:center; gap:6px;">
      <span>Daily Bill Change: </span>
      <span style="color:${color}; font-weight:bold;">
        ${Math.abs(bill).toFixed(2)}฿
      </span>
      <span class="arrow">${arrow}</span>
    </div>
  `;
}




  // แสดง popup
  if (dailyPopupEl && overlayEl) {
    dailyPopupEl.style.display = 'block';
    overlayEl.style.display = 'block';
  }
}

// ฟังก์ชันเปิด popup
function showDailyPopup() {
  if (dailyPopupEl && overlayEl) {
    dailyPopupEl.style.display = 'block';
    overlayEl.style.display = 'block';
    updateDailyDiff();
  }
}

// ฟังก์ชันปิด popup
function hideDailyPopup() {
  if (dailyPopupEl && overlayEl) {
    dailyPopupEl.style.display = 'none';
    overlayEl.style.display = 'none';
  }
}

// คลิก overlay ปิด popup
if (overlayEl) overlayEl.addEventListener('click', hideDailyPopup);

// เรียก popup ทุกครั้งที่โหลดหน้า
showDailyPopup();
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
  // หยุด browser จากการเด้งอัตโนมัติ
  e.preventDefault();
  deferredPrompt = e;

  // รอ user action (เช่น click) ถึงเรียก prompt()
  // ตัวอย่าง: prompt หลัง 1 วินาทีแบบ user gesture จับง่าย
  setTimeout(() => {
    if (deferredPrompt) {
      // ต้องใช้ user gesture ที่จริงจัง เช่น click event
      // prompt() เรียกตรง ๆ หลัง timeout โดยไม่มี gesture จะไม่ขึ้นบน Chrome Desktop/Mobile
      console.log('Ready to prompt user');
    }
  }, 1000);
});

// เมื่อ user ติดตั้งแล้ว
window.addEventListener('appinstalled', () => {
  console.log('PWA installed!');
});
/*
  // ================= Daily Popup Capture =================
  const downloadBtn = document.getElementById('downloadBtn');
  const dailyPopupForCapture = document.getElementById('dailyPopup');

  downloadBtn.addEventListener('click', async () => {
    const originalDisplay = dailyPopupForCapture.style.display;
    dailyPopupForCapture.style.display = 'flex';
    dailyPopupForCapture.style.position = 'absolute';
    dailyPopupForCapture.style.zIndex = 9999;

    try {
      const dataUrl = await domtoimage.toPng(dailyPopupForCapture, {
        width: dailyPopupForCapture.offsetWidth,
        height: dailyPopupForCapture.offsetHeight,
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left'
        },
        filter: (node) => node.id !== 'shareBtn' // ไม่ capture ปุ่ม Share
      });

      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = 'daily_summary.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (err) {
      console.error('Capture failed:', err);
      alert('Failed to capture image.');
    } finally {
      dailyPopupForCapture.style.display = originalDisplay;
    }
    console.log(domtoimage);
  });
*/
if ('serviceWorker' in navigator && 'PushManager' in window) {
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('/service-worker.js');
      console.log('✅ Service Worker registered', reg);

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.warn('❌ Notification permission denied');
        return;
      }

      const subscribeOptions = {
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          'BB2fZ3NOzkWDKOi8H5jhbwICDTv760wIB6ZD2PwmXcUA_B5QXkXtely4b4JZ5v5b88VX1jKa7kRfr94nxqiksqY'
        )
      };
      const subscription = await reg.pushManager.subscribe(subscribeOptions);

      await fetch('https://momaybackend02-production.up.railway.app/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription)
      });

      console.log('✅ Push registered');

    } catch (err) {
      console.error('❌ Error registering push', err);
    }
  });
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)));
}


});


