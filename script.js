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
  const floor1_maxA = 100;
  const floor1_maxKW = root3 * V * floor1_maxA / 1000;
  const total_maxA = 100;
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

      const res = await fetch('https://api-kx4r63rdjq-an.a.run.app/daily-energy/px_dh?date=' + localDate);
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
      const url = `https://momaybackend02-production.up.railway.app/daily-bill?date=${today}`;
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

  // ================= Chart.js (Lazy Load) =================
  let chartInitialized = false;
  let chart = null;

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

  // Lazy load chart เมื่อ scroll ใกล้
  const chartContainer = document.querySelector('.Realtime_Container');
  if (chartContainer) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          initializeChart();
          observer.disconnect();
        }
      });
    }, { rootMargin: '200px' });
    
    observer.observe(chartContainer);
  }

  // ================= FullCalendar (Lazy Load) =================
  let calendarInitialized = false;
  let calendar = null;

  function isToday(dateStr) {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const today = `${yyyy}-${mm}-${dd}`;
    return dateStr === today;
  }

  async function initializeCalendar() {
    if (calendarInitialized) return;
    
    const calendarEl = document.getElementById('calendar');
    if (!calendarEl) return;

    calendar = new FullCalendar.Calendar(calendarEl, {
      initialView: 'dayGridMonth',
      locale: 'en',
      headerToolbar: { left: 'prev', center: 'title', right: 'next' },
      height: 600,
      dateClick: async function(info) {
        const datePopup = document.getElementById('DatePopup');
        const popupDateEl = datePopup?.querySelector('.popup-date');
        const popupBillEl = document.getElementById('popup-bill');
        const popupUnitEl = document.getElementById('popup-unit');

        if (datePopup) {
          datePopup.style.display = 'flex';
          datePopup.classList.add('active');
        }
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

          if (isToday(info.dateStr) && popupBillEl && popupUnitEl) {
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
    calendarInitialized = true;
  }

  // ================= ปิด popup =================
  const datePopup = document.getElementById('DatePopup');
  const closeBtn = document.getElementById('closeDatePopup');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      if (datePopup) {
        datePopup.classList.remove('active');
        datePopup.style.display = 'none';
      }
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

  // ================= Calendar Popup =================
  const calendarIcon = document.querySelector("#Calendar_icon img");
  const popup = document.getElementById("calendarPopup");
  if (calendarIcon && popup) {
    calendarIcon.addEventListener("click", function() { 
      popup.classList.add("active");
      initializeCalendar().then(() => {
        if (calendar) calendar.updateSize();
      });
    });
    popup.addEventListener("click", function(e) { 
      if (e.target === popup) popup.classList.remove("active"); 
    });
  }

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
      const res = await fetch(`https://momaybackend02-production.up.railway.app/solar-size?date=${date}`);
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
      const res = await fetch('https://momaybackend02-production.up.railway.app/daily-diff');
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

  // ================= Simple Notification System =================
const API_BASE = 'https://momaybackend02-production.up.railway.app';
const bellIcon = document.getElementById('Bell_icon');
const bellBadge = document.getElementById('bellBadge');
const notificationPopup = document.getElementById('notificationPopup');
const notificationItems = document.getElementById('notificationItems');

// เก็บ notifications ใน memory
let notifications = [];

// เปิด/ปิด popup
if (bellIcon && notificationPopup) {
  bellIcon.addEventListener('click', () => {
    const isHidden = notificationPopup.style.display === 'none' || !notificationPopup.style.display;
    notificationPopup.style.display = isHidden ? 'block' : 'none';
    
    if (isHidden) {
      renderNotifications();
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

// โหลด notifications จาก server
async function loadNotifications() {
  try {
    const res = await fetch(`${API_BASE}/api/notifications?limit=50`);
    const data = await res.json();
    
    // เรียงจากใหม่ไปเก่า
    notifications = data.sort((a, b) => 
      new Date(b.timestamp) - new Date(a.timestamp)
    );
    
    updateBadge();
    renderNotifications();
    
  } catch (err) {
    console.error('Load notifications failed:', err);
    notifications = [];
  }
}

// แสดง notifications ใน popup
function renderNotifications() {
  if (!notificationItems) return;
  
  if (notifications.length === 0) {
    notificationItems.innerHTML = `
      <div style="text-align:center; padding:30px; color:#999;">
        <p style="font-size:24px; margin-bottom:10px;">🔔</p>
        <p>ไม่มีการแจ้งเตือน</p>
      </div>
    `;
    return;
  }
  
  notificationItems.innerHTML = '';
  
  notifications.forEach((notif, index) => {
    const div = document.createElement('div');
    div.className = 'notification-item';
    div.style.cssText = `
      padding: 15px;
      border-bottom: 1px solid #f0f0f0;
      background: ${notif.read ? '#fff' : '#f8f9ff'};
      transition: background 0.2s;
    `;
    
    const time = new Date(notif.timestamp);
    const timeStr = time.toLocaleString('th-TH', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    div.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:5px;">
        <strong style="color:#333; font-size:14px;">${notif.title}</strong>
        <button class="delete-btn" data-index="${index}" 
                style="background:none; border:none; color:#999; cursor:pointer; font-size:18px; padding:0; width:20px; height:20px;">
          ×
        </button>
      </div>
      <p style="color:#666; font-size:13px; margin:5px 0;">${notif.message}</p>
      <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px;">
        <small style="color:#999; font-size:11px;">${timeStr}</small>
        ${!notif.read ? '<span style="color:#667eea; font-size:11px; font-weight:600;">● ใหม่</span>' : ''}
      </div>
    `;
    
    div.addEventListener('mouseenter', () => {
      div.style.background = '#f5f5f5';
    });
    
    div.addEventListener('mouseleave', () => {
      div.style.background = notif.read ? '#fff' : '#f8f9ff';
    });
    
    notificationItems.appendChild(div);
  });
  
  // ปุ่มลบ
  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const index = parseInt(btn.dataset.index);
      deleteNotification(index);
    });
  });
}

// ลบ notification
function deleteNotification(index) {
  notifications.splice(index, 1);
  updateBadge();
  renderNotifications();
}

// อัปเดต badge
function updateBadge() {
  if (!bellBadge) return;
  
  const unreadCount = notifications.filter(n => !n.read).length;
  bellBadge.textContent = unreadCount;
  bellBadge.style.display = unreadCount > 0 ? 'block' : 'none';
}

// เพิ่ม notification ใหม่จาก server (real-time)
function addNotification(title, message) {
  const newNotif = {
    title: title,
    message: message,
    timestamp: new Date().toISOString(),
    read: false,
    _id: Date.now().toString()
  };
  
  notifications.unshift(newNotif); // เพิ่มที่ด้านบน
  updateBadge();
  
  // แสดง browser notification
  if (Notification.permission === 'granted') {
    new Notification(title, {
      body: message,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-72.png'
    });
  }
}

// Service Worker message listener
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', (event) => {
    const { title, body } = event.data;
    addNotification(title, body);
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

        const res = await fetch(`https://momaybackend02-production.up.railway.app/solar-size?date=${apiDate}`);
        if (!res.ok) throw new Error("Network response was not ok");
        const json = await res.json();

        const energyRes = await fetch(`https://api-kx4r63rdjq-an.a.run.app/daily-energy/px_dh?date=${apiDate}`);
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

