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

  // ================= Constants =================
  const V = 400;
  const root3 = Math.sqrt(3);
  const floor1_maxA = 400;
  const floor1_maxKW = root3 * V * floor1_maxA / 1000;
  const total_maxA = 400;
  const total_maxKW = root3 * V * total_maxA / 1000;

  // ================= Cache Management =================
  const cache = {
    powerData: null,
    dailyBill: null,
    weather: null,
    lastFetch: {}
  };

  const CACHE_DURATION = {
    power: 1000, // 1 วินาที
    dailyBill: 30000, // 30 วินาที
    weather: 1800000 // 30 นาที
  };

  function isCacheValid(key, duration) {
    return cache.lastFetch[key] && (Date.now() - cache.lastFetch[key] < duration);
  }

  // ================= Total Marker =================
  const totalBarContainer = document.getElementById('Total_Bar'); 
  let marker = document.createElement('div');

  function updateMarker(totalPercent) {
    const markerPosition = 182 * (totalPercent / 100);
    marker.style.top = `${182 - markerPosition}px`; 
  }

  // ================= Progress bars (Optimized) =================
  const floor1Bar = document.querySelector('#floor1 .progress-bar');
  const totalBar = document.querySelector('#Total_Bar .progress-bar');
  const glow = document.querySelector('.glow');
  const realtimeKWEl = document.querySelector('.Realtime_kW');
  const mainContainer = document.querySelector('.Main_Container');
  const glowEl = document.querySelector('.glow');
  const totalBarText = document.getElementById('Total_Bar_Text');
  const floor1Text = document.getElementById('floor1_Text');

  async function updateBarsAndKW() {
    try {
      // ใช้ cache ถ้ายังไม่หมดอายุ
      if (isCacheValid('power', CACHE_DURATION.power) && cache.powerData) {
        renderPowerData(cache.powerData);
        return;
      }

      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      const localDate = `${yyyy}-${mm}-${dd}`;

      const res = await fetch('https://api-kx4r63rdjq-an.a.run.app/daily-energy/px_pm3250?date=' + localDate);
      const json = await res.json();
      const data = json.data;
      const latest = data.length ? data[data.length - 1].power : 0;

      cache.powerData = latest;
      cache.lastFetch['power'] = Date.now();
      
      renderPowerData(latest);

    } catch (err) {
      console.error('Error fetching power data:', err);
    }
  }

  function renderPowerData(latest) {
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
  }

  updateBarsAndKW();
  setInterval(updateBarsAndKW, 1000);

  // ================= Daily Bill (Optimized) =================
  const dailyBillEl = document.getElementById('DailyBill');
  const unitEl = document.querySelector('.unit');
  const pricePerUnit = 4.4;

  async function fetchDailyBill() {
    try {
      if (isCacheValid('dailyBill', CACHE_DURATION.dailyBill) && cache.dailyBill) {
        renderDailyBill(cache.dailyBill);
        return;
      }

      const today = new Date().toISOString().split('T')[0];
      const url = `https://momaybackendhospital-production.up.railway.app/daily-bill?date=${today}`;
      const res = await fetch(url);
      const json = await res.json();

      cache.dailyBill = json.electricity_bill ?? 0;
      cache.lastFetch['dailyBill'] = Date.now();
      
      renderDailyBill(cache.dailyBill);

    } catch (err) {
      console.error('Error fetching daily bill:', err);
      if (dailyBillEl) dailyBillEl.textContent = 'Error';
      if (unitEl) unitEl.textContent = '';
    }
  }

  function renderDailyBill(bill) {
    const units = bill / pricePerUnit;
    if (dailyBillEl) dailyBillEl.textContent = bill.toFixed(2) + ' THB';
    if (unitEl) unitEl.textContent = units.toFixed(2) + ' Unit';
  }

  fetchDailyBill();
  setInterval(fetchDailyBill, 30000); // เปลี่ยนเป็น 30 วินาที

  // ================= Chart.js (Load ทันที - ไม่มี Lazy Load) =================
  let chartInitialized = false;
  let chart = null;
  let currentDate = new Date();

  function formatDateDisplay(date){
    const d=String(date.getDate()).padStart(2,'0');
    const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    const m = monthNames[date.getMonth()];     
    const y=date.getFullYear();
    return `${d} - ${m} - ${y}`;
  }

  async function fetchDailyData(date){
    const dateStr = date.toISOString().split('T')[0];
    try{
      const res = await fetch(`https://api-kx4r63rdjq-an.a.run.app/daily-energy/px_pm3250?date=${dateStr}`);
      const json = await res.json();
      return json.data;
    }catch(err){console.error(err); return [];}
  }

  async function updateChartData(date){
    if (!chart) return;
    
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

    const canvas = document.getElementById('EnergyChart');
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0,0,0,400);
    gradient.addColorStop(0,'rgba(139,69,19,0.4)');
    gradient.addColorStop(0.5,'rgba(210,180,140,0.3)');
    gradient.addColorStop(1,'rgba(245,222,179,0.1)');

    chart.data.datasets=[
      {label:'Power', data:chartData, borderColor:'#8B4513', backgroundColor:gradient, fill:true, borderWidth:0.5, tension:0.3, pointRadius:0.1},
      {label:'Max', data:new Array(1440).fill(null).map((_,i)=>i===maxIdx?maxVal:null), borderColor:'#ff9999', pointRadius:5, pointBackgroundColor:'#ff9999', fill:false, showLine:false},
      {label:'Average', data:new Array(1440).fill(avgVal), borderColor:'#000', borderDash:[5,5], fill:false, pointRadius:0,  borderWidth: 1}
    ];
    chart.update();
  }

  async function initializeChart() {
    if (chartInitialized) return;
    
    const canvas = document.getElementById('EnergyChart');
    if (!canvas) return;

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
    
    chart = new Chart(ctx, config);
    chartInitialized = true;

    // โหลดข้อมูลวันปัจจุบันทันทีหลัง chart พร้อม
    await updateChartData(currentDate);
  }

  // Initialize Date Picker และ Chart ทันที
  const prevBtn = document.getElementById('prevDay');
  const nextBtn = document.getElementById('nextDay');
  const currentDayEl = document.getElementById('currentDay');

  if (currentDayEl) {
    currentDayEl.textContent = formatDateDisplay(currentDate);
  }

  function handleDateChange(delta) {
    console.log('🔥 Date change:', delta);
    currentDate.setDate(currentDate.getDate() + delta);
    if (currentDayEl) {
      currentDayEl.textContent = formatDateDisplay(currentDate);
    }
    if (chartInitialized && chart) {
      updateChartData(currentDate);
    }
  }

  // ใช้หลายวิธีในการจับ event
  if (prevBtn) {
    console.log('✅ Prev button found', prevBtn);
    
    // Method 1: onclick property
    prevBtn.onclick = function(e) {
      e.preventDefault();
      console.log('🎯 Prev ONCLICK');
      handleDateChange(-1);
    };
    
    // Method 2: addEventListener click
    prevBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('🎯 Prev CLICK');
      handleDateChange(-1);
    }, true); // useCapture = true
    
    // Method 3: mousedown
    prevBtn.addEventListener('mousedown', (e) => {
      e.preventDefault();
      console.log('🎯 Prev MOUSEDOWN');
      handleDateChange(-1);
    });
    
    // Method 4: touchstart for mobile
    prevBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      console.log('🎯 Prev TOUCH');
      handleDateChange(-1);
    });
  } else {
    console.error('❌ prevDay button NOT found!');
  }
  
  if (nextBtn) {
    console.log('✅ Next button found', nextBtn);
    
    // Method 1: onclick property
    nextBtn.onclick = function(e) {
      e.preventDefault();
      console.log('🎯 Next ONCLICK');
      handleDateChange(1);
    };
    
    // Method 2: addEventListener click
    nextBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('🎯 Next CLICK');
      handleDateChange(1);
    }, true); // useCapture = true
    
    // Method 3: mousedown
    nextBtn.addEventListener('mousedown', (e) => {
      e.preventDefault();
      console.log('🎯 Next MOUSEDOWN');
      handleDateChange(1);
    });
    
    // Method 4: touchstart for mobile
    nextBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      console.log('🎯 Next TOUCH');
      handleDateChange(1);
    });
  } else {
    console.error('❌ nextDay button NOT found!');
  }

  // โหลด Chart ทันที
  initializeChart();

// ================= FullCalendar (Cache Monthly API) ================
let calendar = null;
let eventCache = {}; // key: "YYYY-MM" => events array

async function fetchEvents(year, month) {
  const key = `${year}-${String(month).padStart(2, "0")}`;

  if (eventCache[key]) return eventCache[key];

  try {
    const url = `https://momaybackendhospital-production.up.railway.app/calendar?year=${year}&month=${month}`;
    const res = await fetch(url);
    const data = await res.json();

    eventCache[key] = data.map(e => ({
      ...e,
      textColor: 'black',
      backgroundColor: 'transparent',
      borderColor: 'transparent'
    }));

    return eventCache[key];
  } catch (err) {
    console.error("Error loading events:", err);
    eventCache[key] = [];
    return [];
  }
}

async function preloadInitialMonths() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  await fetchEvents(currentYear, currentMonth);

  let prevYear = currentYear;
  let prevMonth = currentMonth - 1;
  if (prevMonth === 0) { prevMonth = 12; prevYear--; }

  await fetchEvents(prevYear, prevMonth);
}

async function initializeCalendar() {
  const calendarEl = document.getElementById("calendar");
  if (!calendarEl) return;

  await preloadInitialMonths();

  calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: "dayGridMonth",
    locale: "en",
    height: 600,
    headerToolbar: { left: "prev", center: "title", right: "next" },

    events: async function(fetchInfo, successCallback) {
      const year = fetchInfo.view.currentStart.getFullYear();
      const month = fetchInfo.view.currentStart.getMonth() + 1;

      const events = await fetchEvents(year, month);
      successCallback(events);
    },

    dateClick: async function(info) {
      const pricePerUnit = 4.4;
      const datePopup = document.getElementById("DatePopup");
      const popupDateEl = datePopup?.querySelector(".popup-date");
      const popupBillEl = document.getElementById("popup-bill");
      const popupUnitEl = document.getElementById("popup-unit");

      datePopup.style.display = "flex";
      datePopup.classList.add("active");
      popupDateEl.textContent = info.dateStr;

      try {
        const res = await fetch(`https://momaybackendhospital-production.up.railway.app/daily-bill?date=${info.dateStr}`);
        const json = await res.json();
        const bill = json.electricity_bill ?? 0;
        const unit = bill / pricePerUnit;

        popupBillEl.textContent = `${bill.toFixed(2)} THB`;
        popupUnitEl.textContent = `${unit.toFixed(2)} Unit`;
      } catch (err) {
        popupBillEl.textContent = "Error";
        popupUnitEl.textContent = "";
      }
    }
  });

  calendar.render();
}

initializeCalendar();

// Calendar Popup
const calendarIcon = document.querySelector("#Calendar_icon img");
const popup = document.getElementById("calendarPopup");

if (calendarIcon && popup) {
  calendarIcon.addEventListener("click", () => {
    popup.classList.add("active");
    calendar?.updateSize();
  });
  popup.addEventListener("click", e => {
    if (e.target === popup) popup.classList.remove("active");
  });
}


  // ================= Weather Sukhothai (Optimized) =================
  async function fetchCurrentWeatherSukhothai() {
    try {
      if (isCacheValid('weather', CACHE_DURATION.weather) && cache.weather) {
        renderWeather(cache.weather);
        return;
      }

      const lat = 17.0080, lon = 99.8238;
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&timezone=Asia/Bangkok`;
      const res = await fetch(url);
      const data = await res.json();
      
      cache.weather = data.current_weather;
      cache.lastFetch['weather'] = Date.now();
      
      renderWeather(data.current_weather);

    } catch (e) {
      console.error("Error fetching current weather:", e);
      document.getElementById('weather-city').innerText = "Sukhothai";
      document.getElementById('weather-icon').innerText = "❓";
      document.getElementById('weather-temp').innerText = "-°C";
    }
  }

  function renderWeather(weather) {
    const weatherCode = weather.weathercode;
    const temp = weather.temperature;
    
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
  }

  fetchCurrentWeatherSukhothai();
  setInterval(fetchCurrentWeatherSukhothai, 1800000);

  // ================= Kwang Solar Popup =================
  const kwangIcon = document.getElementById("Kwang_icon");
  const overlay = document.getElementById("overlay");
  const kwangPopup = document.getElementById("kwangPopup");
  const kwangPowerEl = document.getElementById("kwangPower");
  const kwangBillEl = document.getElementById("kwangBill");
  const kwangCapacityEl = document.getElementById("kwangCapacity");
  const kwangMonthEl = document.getElementById("kwangMonth");
  const kwangnigtEl = document.getElementById("kwangnight");
  const TOTEl = document.getElementById("kwangTOTEL");
  const kwangPeakEl = document.getElementById("kwangPeak");
  const kwangTOTdayBill = document.getElementById("kwangTOTBill");

  const prevBtnKwang = document.getElementById('kwangPrevDay');
  const nextBtnKwang = document.getElementById('kwangNextDay');
  const currentDayElKwang = document.getElementById('kwangCurrentDay');


  let kwangDate = new Date();

  function formatDate(date) {
    const d = String(date.getDate()).padStart(2, '0');
    const monthNames = [
      "January","February","March","April","May","June",
      "July","August","September","October","November","December"
    ];
    const m = monthNames[date.getMonth()];
    const y = date.getFullYear();
    return `${d} - ${m} - ${y}`;
  }

  function updateKwangDateUI() {
    if (currentDayElKwang) {
      currentDayElKwang.textContent = formatDate(kwangDate);
    }
    fetchKwangData(kwangDate.toISOString().split('T')[0]);
  }

  if (kwangIcon && kwangPopup && overlay) {
    kwangIcon.addEventListener("click", () => {
      kwangPopup.classList.add("active");
      kwangPopup.style.display = "flex";
      overlay.style.display = "block";
      updateKwangDateUI();
    });

    overlay.addEventListener("click", () => {
      kwangPopup.style.display = "none";
      kwangPopup.classList.remove("active");
      overlay.style.display = "none";
    });
  }

  if (prevBtnKwang) {
    prevBtnKwang.addEventListener('click', () => {
      kwangDate.setDate(kwangDate.getDate() - 1);
      updateKwangDateUI();
    });
  }

  if (nextBtnKwang) {
    nextBtnKwang.addEventListener('click', () => {
      kwangDate.setDate(kwangDate.getDate() + 1);
      updateKwangDateUI();
    });
  }

  if (currentDayElKwang) {
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
      };

      tmpInput.click();
    });
  }

  async function fetchKwangData(date) {
    try {
      const res = await fetch(`https://momaybackendhospital-production.up.railway.app/solar-size?date=${date}`);
      const json = await res.json();

      if (kwangPowerEl) kwangPowerEl.textContent = (json.dayEnergy ?? 0).toFixed(2) + " Unit";
      if (kwangCapacityEl) kwangCapacityEl.textContent = (json.solarCapacity_kW ?? 0).toFixed(2) + " kW";
if (kwangBillEl) 
  kwangBillEl.textContent = (json.savingsDay ?? 0)
    .toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " THB";     
if (kwangMonthEl) 
  kwangMonthEl.textContent = (json.savingsMonth ?? 0)
    .toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " THB";     
     if (kwangnigtEl) kwangnigtEl.textContent = (json.nightEnergy ?? 0).toFixed(2) + " Unit";
      if (TOTEl) TOTEl.textContent = (json.totalEnergyKwh ?? 0).toFixed(2) + " Unit";
      if (kwangPeakEl) kwangPeakEl.textContent = (json.peakPowerDay ?? 0).toFixed(2) + " kW";
      if (kwangTOTdayBill) kwangTOTdayBill.textContent = (json.totalCost ?? 0).toFixed(2) + " THB";


    } catch (err) {
      if (kwangPowerEl) kwangPowerEl.textContent = "- Unit";
      if (kwangCapacityEl) kwangCapacityEl.textContent = "- kW";
      if (kwangBillEl) kwangBillEl.textContent = "- THB";
      if (kwangMonthEl) kwangMonthEl.textContent = "- THB";
      if (kwangnigtEl) kwangnigtEl.textContent = "- Unit";
      if (TOTEl) TOTEl.textContent = "- Unit";
      if (kwangPeakEl) kwangPeakEl.textContent = "- kW";
      if (kwangTOTdayBill) kwangTOTdayBill.textContent = "- THB";

      console.error("Fetch Kwang Data Error:", err);
    }
  }

  // ================= Daily Diff =================
  const dailyYesterdayEl = document.getElementById("dailyYesterday");
  const dailyDayBeforeEl = document.getElementById("dailyDayBefore");
  const dailyDiffEl = document.getElementById("dailyDiffValue");
  const dailyPopupEl = document.getElementById('dailyPopup');
  const overlayEl = document.getElementById('overlay');

  async function fetchDailyDiff() {
    try {
      const res = await fetch('https://momaybackendhospital-production.up.railway.app/daily-diff');
      const json = await res.json();
      return json;
    } catch (err) {
      console.error("Error fetching daily diff:", err);
      return null;
    }
  }

  function formatDateDMY(dateStr) {
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  async function updateDailyDiff() {
    const data = await fetchDailyDiff();
    if (!data) return;

    if (document.getElementById("yesterdayDate") && dailyYesterdayEl) {
      document.getElementById("yesterdayDate").innerHTML = `
        <strong>${formatDateDMY(data.yesterday.date)}</strong>
      `;
      dailyYesterdayEl.innerHTML = `
        ${data.yesterday.energy_kwh.toFixed(2)} Unit<br>
        ${data.yesterday.electricity_bill.toFixed(2)} THB.
      `;
    }

    if (document.getElementById("dayBeforeDate") && dailyDayBeforeEl) {
      document.getElementById("dayBeforeDate").innerHTML = `
        <strong>${formatDateDMY(data.dayBefore.date)}</strong>
      `;
      dailyDayBeforeEl.innerHTML = `
        ${data.dayBefore.energy_kwh.toFixed(2)} Unit<br>
        ${data.dayBefore.electricity_bill.toFixed(2)} THB.
      `;
    }

    if (dailyDiffEl) {
      const bill = data.diff.electricity_bill;

      const arrowUp = `<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                         <path d="M12 2L5 10h14L12 2z" fill="red"/>
                       </svg>`;
      const arrowDown = `<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                           <path d="M12 22l7-8H5l7 8z" fill="green"/>
                         </svg>`;

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

    if (dailyPopupEl && overlayEl) {
      dailyPopupEl.style.display = 'block';
      overlayEl.style.display = 'block';
    }
  }

  async function showDailyPopup() {
    if (dailyPopupEl && overlayEl) {
      overlayEl.style.display = 'block';
      dailyPopupEl.style.display = 'block';

      dailyPopupEl.classList.add('show-popup');
      dailyPopupEl.classList.remove('hide-popup');

      if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200]);
      }

      await updateDailyDiff();
    }
  }

  function hideDailyPopup() {
    if (dailyPopupEl && overlayEl) {
      dailyPopupEl.style.display = 'none';
      overlayEl.style.display = 'none';
    }
  }

  if (overlayEl) overlayEl.addEventListener('click', hideDailyPopup);

  showDailyPopup();

// ================= Notification System (Updated) =================
const API_BASE = 'https://momaybackendhospital-production.up.railway.app';
const bellIcon = document.getElementById('Bell_icon');
const bellBadge = document.getElementById('bellBadge');
const notificationPopup = document.getElementById('notificationPopup');
const notificationItems = document.getElementById('notificationItems');

let notifications = [];
let currentFilter = 'all'; // 'all', 'peak', 'daily_diff', 'test'

// เปิด/ปิด popup
if (bellIcon && notificationPopup) {
  bellIcon.addEventListener('click', () => {
    const isHidden = notificationPopup.style.display === 'none' || !notificationPopup.style.display;
    notificationPopup.style.display = isHidden ? 'block' : 'none';
    
    if (isHidden) {
      loadNotifications();
    }
  });
}

// ปิด popup เมื่อคลิกข้างนอก
document.addEventListener('click', (e) => {
  if (bellIcon && notificationPopup && 
      !bellIcon.contains(e.target) && 
      !notificationPopup.contains(e.target)) {
    notificationPopup.style.display = 'none';
  }
});

// โหลด notifications จาก API
async function loadNotifications() {
  try {
    const res = await fetch(`${API_BASE}/api/notifications/all?limit=50`);
    const data = await res.json();
    
    if (data.success) {
      notifications = data.data || [];
      updateBadge(data.unreadCount || 0);
      renderNotifications();
    }
    
  } catch (err) {
    console.error('Load notifications failed:', err);
    notifications = [];
    renderError();
  }
}

// แสดง notifications ใน popup
// แทนที่ส่วน renderNotifications() ใน frontend script

function renderNotifications() {
  if (!notificationItems) return;
  
  if (notifications.length === 0) {
    notificationItems.innerHTML = `
      <div style="text-align:center; padding:30px; color:#999;">
        <p style="font-size:24px; margin-bottom:10px;">🔔</p>
        <p>No Notifications</p>
      </div>
    `;
    return;
  }
  
  notificationItems.innerHTML = '';
  
  // Header
  const header = document.createElement('div');
header.style.cssText = `
  padding: 15px;
  border: 6px solid #74640a;         /* ขอบเข้มแบบ Meter */
  border-radius: 10px;               /* ขอบมน */
  background: linear-gradient(
    180deg,
    #f8f6f0 0%,
    #fffef8 45%,
    #fff8e8 55%,
    #f5f0e5 100%
  );                                  /* Gradient แทน background-image */
  box-shadow:
    inset 0 0 5px rgba(0,0,0,0.15),
    1px 1px 0 #000,
    -4px 3px #3b3305,
    0 0 12px rgba(255, 230, 160, 0.55); /* เงา inset + เงาขอบนอก */
  text-align: center;
  font-weight: bold;
  color: #2c1810;                     /* สีดำแบบ Meter */
  font-family: 'Roboto', sans-serif;  /* ใช้ Roboto */
`;


  header.innerHTML = '<strong style="font-size:16px; color:#fff;">Notification</strong>';
  
  notificationItems.appendChild(header);
  
  // แสดง notifications
  notifications.forEach(notif => {
    const div = document.createElement('div');
    div.className = 'notification-item';
    div.style.cssText = `
      padding: 15px;
      margin-bottom: 1px;
      border-bottom: 1px solid #f0f0f0;
      background: ${notif.read ? '#fff' : '#f8f9ff'};
      transition: background 0.2s;
      cursor: pointer;
      border-radius: 5px; 
    `;

    // Format timestamp
    const time = new Date(notif.timestamp);
    const day = String(time.getUTCDate()).padStart(2, '0');
    const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const month = monthNames[time.getUTCMonth()];
    const year = time.getUTCFullYear();
    const hours = String(time.getUTCHours()).padStart(2, '0');
    const minutes = String(time.getUTCMinutes()).padStart(2, '0');
    const timeStr = `${day} ${month} ${year} ${hours}:${minutes}`;
    
    // สร้าง content ตาม type
    let detailsHTML = '';
    
    if (notif.type === 'peak' && notif.power) {
      detailsHTML = `
        <div style="background:#fff3cd; padding:8px; border-radius:5px; margin-top:5px;">
          <strong style="color:#856404;">Peak Power: ${notif.power.toFixed(2)} kW</strong>
        </div>
      `;
    } else if (notif.type === 'daily_diff' && notif.diff) {
      const isIncrease = notif.diff.electricity_bill < 0;
      const color = isIncrease ? '#d9534f' : '#5cb85c';
      const arrow = isIncrease ? '↑' : '↓';
      
      detailsHTML = `
        <div style="background:#f0f0f0; padding:8px; border-radius:5px; margin-top:5px; font-size:12px;">
          <div style="margin-bottom:5px;">
            <span style="color:#666;">Yesterday:</span> 
            <strong>${notif.yesterday?.energy_kwh.toFixed(2) || '-'} Unit</strong>
          </div>
          <div style="margin-bottom:5px;">
            <span style="color:#666;">Day Before:</span> 
            <strong>${notif.dayBefore?.energy_kwh.toFixed(2) || '-'} Unit</strong>
          </div>
          <div style="color:${color}; font-weight:bold;">
            ${arrow} ${Math.abs(notif.diff.electricity_bill).toFixed(2)} THB
          </div>
        </div>
      `;
    } else if (notif.type === 'daily_bill' && notif.energy_kwh !== undefined) {
      const units = notif.energy_kwh || 0;
      const bill = notif.electricity_bill || 0;
      const date = notif.date || '-';
      
      detailsHTML = `
        <div style="background:#d4edda; padding:10px; border-radius:5px; margin-top:5px;">
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; font-size:13px;">
            <div>
              <div style="color:#666; margin-bottom:3px;">Date:</div>
              <strong style="color:#155724;">${date}</strong>
            </div>
            <div>
              <div style="color:#666; margin-bottom:3px;">Energy:</div>
              <strong style="color:#155724;">${units.toFixed(2)} Unit</strong>
            </div>
          </div>
          <div style="margin-top:8px; padding-top:8px; border-top:1px solid #c3e6cb;">
            <div style="color:#666; font-size:12px;">Total Bill:</div>
            <strong style="color:#155724; font-size:16px;">${bill.toFixed(2)} THB</strong>
          </div>
          ${notif.samples ? `<div style="font-size:11px; color:#999; margin-top:5px;">${notif.samples} samples</div>` : ''}
        </div>
      `;
    }
    
    div.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:5px;">
        <div style="display:flex; align-items:center; gap:5px;">
          <strong style="color:#333; font-size:14px;">${notif.title}</strong>
        </div>
        ${!notif.read ? '<span style="width:8px; height:8px; background:#667eea; border-radius:50%; display:block;"></span>' : ''}
      </div>
      <p style="color:#666; font-size:13px; margin:5px 0 5px 0;">${notif.body}</p>
      ${detailsHTML}
      <div style="margin-top:8px;">
        <small style="color:#999; font-size:11px;">${timeStr}</small>
      </div>
    `;
    
    // Click เพื่อ mark as read
    div.addEventListener('click', async () => {
      if (!notif.read) {
        await markAsRead(notif.type, notif._id);
      }
    });
    
    div.addEventListener('mouseenter', () => {
      div.style.background = '#f5f5f5';
    });
    
    div.addEventListener('mouseleave', () => {
      div.style.background = notif.read ? '#fff' : '#f8f9ff';
    });
    
    notificationItems.appendChild(div);
  });
}

// แสดง error
function renderError() {
  if (!notificationItems) return;
  
  notificationItems.innerHTML = `
    <div style="text-align:center; padding:30px; color:#d9534f;">
      <p style="font-size:24px; margin-bottom:10px;">⚠️</p>
      <p>เกิดข้อผิดพลาดในการโหลดข้อมูล</p>
      <button onclick="loadNotifications()" style="margin-top:10px; padding:8px 16px; background:#667eea; color:white; border:none; border-radius:5px; cursor:pointer;">
        ลองใหม่
      </button>
    </div>
  `;
}

// Mark as read (single)
async function markAsRead(type, id) {
  try {
    const res = await fetch(`${API_BASE}/api/notifications/mark-read`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, ids: [id] })
    });
    
    if (res.ok) {
      // อัปเดต local state
      const notif = notifications.find(n => n._id === id);
      if (notif) notif.read = true;
      
      // Re-render
      await loadNotifications();
    }
  } catch (err) {
    console.error('Mark as read failed:', err);
  }
}

// Mark all as read
async function markAllAsRead() {
  try {
    const res = await fetch(`${API_BASE}/api/notifications/mark-all-read`, {
      method: 'PATCH'
    });
    
    if (res.ok) {
      await loadNotifications();
    }
  } catch (err) {
    console.error('Mark all as read failed:', err);
  }
}

// อัปเดต badge และสั่น bell icon
function updateBadge(count) {
  if (!bellBadge || !bellIcon) return;
  
  // ซ่อน badge เสมอ
  bellBadge.style.display = 'none';
  
  // ถ้ามี notification ใหม่ ให้สั่น bell icon
  if (count > 0) {
    shakeBellIcon();
  }
}

// ฟังก์ชันสั่น bell icon
function shakeBellIcon() {
  if (!bellIcon) return;
  
  // เพิ่ม CSS animation
  bellIcon.style.animation = 'shake 0.5s';
  bellIcon.style.animationIterationCount = '3';
  
  // ลบ animation หลังจากเสร็จ
  setTimeout(() => {
    bellIcon.style.animation = '';
  }, 1500);
}

// เพิ่ม CSS keyframes สำหรับ shake animation
if (!document.getElementById('bell-shake-style')) {
  const style = document.createElement('style');
  style.id = 'bell-shake-style';
  style.textContent = `
    @keyframes shake {
      0%, 100% { transform: rotate(0deg); }
      10%, 30%, 50%, 70%, 90% { transform: rotate(-10deg); }
      20%, 40%, 60%, 80% { transform: rotate(10deg); }
    }
    
    @keyframes shake-loop {
      0%, 100% { transform: rotate(0deg); }
      10% { transform: rotate(-15deg); }
      20% { transform: rotate(15deg); }
      30% { transform: rotate(-15deg); }
      40% { transform: rotate(15deg); }
      50% { transform: rotate(0deg); }
    }
  `;
  document.head.appendChild(style);
}
function startLoopShake() {
  setInterval(() => {
    shakeBellIcon();
    setTimeout(() => shakeCalendarIcon(), 500);
    setTimeout(() => shakeKwangIcon(), 1000);
  }, 10000); // สั่นทุก 10 วินาที
}

// เริ่มสั่น loop
startLoopShake();

// Service Worker message listener (สำหรับ real-time notification)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', (event) => {
    const { title, body } = event.data;
    
    // แสดง browser notification
    if (Notification.permission === 'granted') {
      new Notification(title, {
        body: body,
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-72.png'
      });
    }
    
    // สั่น bell icon
    shakeBellIcon();
    
    // โหลด notifications ใหม่
    loadNotifications();
  });
}


// เพิ่มใน frontend script (หลังจากส่วน bell icon shake)

// ================= Shake Calendar & Kwang Icons =================

// ฟังก์ชันสั่น Calendar icon
function shakeCalendarIcon() {
  const calendarIcon = document.querySelector("#Calendar_icon img");
  if (!calendarIcon) return;
  
  calendarIcon.style.animation = 'shake 0.5s';
  calendarIcon.style.animationIterationCount = '3';
  
  setTimeout(() => {
    calendarIcon.style.animation = '';
  }, 1500);
}

// ฟังก์ชันสั่น Kwang icon
function shakeKwangIcon() {
  const kwangIcon = document.querySelector("#Kwang_icon img");
  if (!kwangIcon) return;
  
  kwangIcon.style.animation = 'shake 0.5s';
  kwangIcon.style.animationIterationCount = '3';
  
  setTimeout(() => {
    kwangIcon.style.animation = '';
  }, 1500);
}

// เรียกใช้ทดสอบ (สั่นทุก 10 วินาที)
// setInterval(() => {
//   shakeCalendarIcon();
//   setTimeout(() => shakeKwangIcon(), 500); // สั่นทีละอัน
// }, 10000);

// หรือสั่นเมื่อมี event เฉพาะ เช่น:
// - Calendar icon สั่นเมื่อมี daily_diff notification
// - Kwang icon สั่นเมื่อมี daily_bill notification

// อัปเดตฟังก์ชัน updateBadge เพื่อสั่น icon ตาม type
function updateBadgeWithShake(count, latestType) {
  if (!bellBadge || !bellIcon) return;
  
  bellBadge.style.display = 'none';
  
  if (count > 0) {
    shakeBellIcon();
    
    if (latestType === 'daily_diff') {
      setTimeout(() => shakeCalendarIcon(), 300);
    } else if (latestType === 'daily_bill') {
      setTimeout(() => shakeKwangIcon(), 300);
    } else if (latestType === 'peak') {
      // สั่นทั้ง 3 icon เมื่อเป็น peak notification
      setTimeout(() => shakeCalendarIcon(), 300);
      setTimeout(() => shakeKwangIcon(), 600);
    }
  }
}

// อัปเดตฟังก์ชัน loadNotifications เพื่อส่ง type ล่าสุด
async function loadNotifications() {
  try {
    const res = await fetch(`${API_BASE}/api/notifications/all?limit=50`);
    const data = await res.json();
    
    if (data.success) {
      notifications = data.data || [];
      
      // หา notification ล่าสุดที่ยังไม่อ่าน
      const latestUnread = notifications.find(n => !n.read);
      const latestType = latestUnread ? latestUnread.type : null;
      
      updateBadgeWithShake(data.unreadCount || 0, latestType);
      renderNotifications();
    }
    
  } catch (err) {
    console.error('Load notifications failed:', err);
    notifications = [];
    renderError();
  }
}

// Service Worker message listener (อัปเดตเพื่อสั่น icon ตาม type)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', (event) => {
    const { title, body, type } = event.data;
    
    if (Notification.permission === 'granted') {
      new Notification(title, {
        body: body,
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-72.png'
      });
    }
    
    shakeBellIcon();
    
    if (type === 'daily_diff') {
      setTimeout(() => shakeCalendarIcon(), 300);
    } else if (type === 'daily_bill') {
      setTimeout(() => shakeKwangIcon(), 300);
    } else if (type === 'peak') {
      // สั่นทั้ง 3 icon เมื่อเป็น peak notification
      setTimeout(() => shakeCalendarIcon(), 300);
      setTimeout(() => shakeKwangIcon(), 600);
    }
    
    loadNotifications();
  });
}

// โหลด notifications ตอนเริ่มต้น
loadNotifications();

// Refresh ทุก 30 วินาที
setInterval(loadNotifications, 30000);

// ขอ permission สำหรับ notification
if ('Notification' in window && Notification.permission === 'default') {
  Notification.requestPermission();
}

// ขอ permission สำหรับ notification
if ('Notification' in window && Notification.permission === 'default') {
  Notification.requestPermission();
}
  // ================= Report Generation =================
  const generateReportBtn = document.getElementById("generateReport");
  if (generateReportBtn) {
    generateReportBtn.addEventListener("click", async () => {
      try {
        const currentDayElKwang = document.getElementById('kwangCurrentDay');
        if (!currentDayElKwang) return;
        
        const rawDate = currentDayElKwang.textContent.trim(); 
        const [dayStr, monthStr, yearStr] = rawDate.split(' - ');
        const monthNames = ["January","February","March","April","May","June",
                            "July","August","September","October","November","December"];
        const month = String(monthNames.indexOf(monthStr) + 1).padStart(2,'0');
        const day = dayStr.padStart(2,'0');
        const year = yearStr;
        const apiDate = `${year}-${month}-${day}`;

        const res = await fetch(`https://momaybackendhospital-production.up.railway.app/solar-size?date=${apiDate}`);
        if (!res.ok) throw new Error("Network response was not ok");
        const json = await res.json();

        const energyRes = await fetch(`https://api-kx4r63rdjq-an.a.run.app/daily-energy/px_pm3250?date=${apiDate}`);
        const energyJson = await energyRes.json();
        const energyData = energyJson.data || [];

        const wrapper = document.getElementById("reportWrapper");
        if (!wrapper) return;

        document.getElementById("kwangDateReport").textContent = rawDate;
        document.getElementById("kwangPowerReport").textContent = (json.dayEnergy ?? 0).toFixed(2) + " Unit";
        document.getElementById("kwangCapacityReport").textContent = (json.solarCapacity_kW ?? 0).toFixed(2) + " kW";
        document.getElementById("kwangBillReport").textContent = (json.savingsDay ?? 0).toFixed(2) + " THB";
document.getElementById("kwangMonthReport").textContent = 
  (json.savingsMonth ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " THB";

        const tbody = document.querySelector("#kwangHourlyTable tbody");
        if (tbody) {
          tbody.innerHTML = "";
          if (json.hourly && json.hourly.length > 0) {
            json.hourly.forEach(hourData => {
              const tr = document.createElement("tr");
              tr.innerHTML = `<td>${hourData.hour}</td><td>${hourData.energy_kwh}</td>`;
              tbody.appendChild(tr);
            });
          } else {
            tbody.innerHTML = '<tr><td colspan="2">No data</td></tr>';
          }
        }

        const reportCanvas = document.getElementById('EnergyChartReport');
        if (reportCanvas) {
          const reportCtx = reportCanvas.getContext('2d');
          
          if (window.reportChart) {
            window.reportChart.destroy();
          }

          const labels = Array.from({ length: 1440 }, (_, i) => {
            const hour = String(Math.floor(i / 60)).padStart(2,'0');
            const min = String(i % 60).padStart(2,'0');
            return `${hour}:${min}`;
          });

          const chartData = new Array(1440).fill(null);
          energyData.forEach(item => {
            const t = new Date(item.timestamp);
            const idx = t.getUTCHours() * 60 + t.getUTCMinutes();
            chartData[idx] = item.power;
          });

          let maxVal = null, maxIdx = null, sum = 0, count = 0;
          chartData.forEach((v, i) => {
            if (v !== null) {
              if (maxVal === null || v > maxVal) {
                maxVal = v;
                maxIdx = i;
              }
              sum += v;
              count++;
            }
          });
          const avgVal = count > 0 ? sum / count : null;

          const gradient = reportCtx.createLinearGradient(0, 0, 0, 300);
          gradient.addColorStop(0, 'rgba(139,69,19,0.4)');
          gradient.addColorStop(0.5, 'rgba(210,180,140,0.3)');
          gradient.addColorStop(1, 'rgba(245,222,179,0.1)');

          window.reportChart = new Chart(reportCtx, {
            type: 'line',
            data: {
              labels,
              datasets: [
                {
                  label: 'Power',
                  data: chartData,
                  borderColor: '#8B4513',
                  backgroundColor: gradient,
                  fill: true,
                  borderWidth: 0.5,
                  tension: 0.3,
                  pointRadius: 0.1
                },
                {
                  label: 'Max',
                  data: new Array(1440).fill(null).map((_, i) => i === maxIdx ? maxVal : null),
                  borderColor: '#ff9999',
                  pointRadius: 5,
                  pointBackgroundColor: '#ff9999',
                  fill: false,
                  showLine: false
                },
                {
                  label: 'Average',
                  data: new Array(1440).fill(avgVal),
                  borderColor: '#000',
                  borderDash: [5, 5],
                  fill: false,
                  pointRadius: 0,
                  borderWidth: 1
                }
              ]
            },
            options: {
              responsive: true,
              maintainAspectRatio: true,
              animation: false,
              plugins: {
                legend: { display: true },
                tooltip: { enabled: false }
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
                    callback: function(v) {
                      const l = this.getLabelForValue(v);
                      if (!l) return '';
                      const [h, m] = l.split(':');
                      return m === '00' && parseInt(h) % 3 === 0 ? l : '';
                    }
                  },
                  title: {
                    display: true,
                    text: 'Time (HH:MM)',
                    color: '#000',
                    font: { size: 12, weight: 'bold' }
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
                    font: { size: 12, weight: 'bold' }
                  }
                }
              }
            }
          });
        }

        wrapper.style.opacity = 1;
        wrapper.style.position = 'absolute';
        wrapper.style.left = '-9999px';
        wrapper.style.top = '0';
        wrapper.style.visibility = 'visible';

        setTimeout(() => {
          html2canvas(wrapper, { scale: 2, useCORS: true }).then(canvas => {
            canvas.toBlob(blob => {
              const file = new File([blob], `KwangReport-${apiDate}.png`, { type: 'image/png' });

              if (navigator.canShare && navigator.canShare({ files: [file] })) {
                navigator.share({
                  title: 'Kwang Solar Report',
                  text: `รายงานพลังงานวันที่ ${rawDate}`,
                  files: [file],
                }).catch(err => {
                  console.error('Share failed:', err);
                  const link = document.createElement("a");
                  link.href = URL.createObjectURL(blob);
                  link.download = `KwangReport-${apiDate}.png`;
                  link.click();
                  URL.revokeObjectURL(link.href);
                });
              } else {
                const link = document.createElement("a");
                link.href = URL.createObjectURL(blob);
                link.download = `KwangReport-${apiDate}.png`;
                link.click();
                URL.revokeObjectURL(link.href);
              }

              wrapper.style.opacity = 0;
              wrapper.style.left = '-9999px';
            });
          });
        }, 500);

      } catch (err) {
        console.error("Generate report failed:", err);
        alert("ไม่สามารถสร้างรายงานได้ ลองใหม่อีกครั้ง");
      }
    });
  }

  // ================= Info Icon Toggle =================
  const infoIcon = document.getElementById('info_icon');
  const mainConInfo = document.getElementById('maincon_info');

  if (infoIcon && mainConInfo) {
    infoIcon.addEventListener('click', () => {
      if (mainConInfo.style.display === 'none' || mainConInfo.style.display === '') {
        mainConInfo.style.display = 'block';
        setTimeout(() => {
          mainConInfo.style.opacity = '1';
        }, 10);
      } else {
        mainConInfo.style.opacity = '0';
        setTimeout(() => {
          mainConInfo.style.display = 'none';
        }, 400);
      }
    });
  }

});