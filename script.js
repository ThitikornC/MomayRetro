document.addEventListener('DOMContentLoaded', async function() {

  // ================= Date =================
 function updateDate() {
  const dateElement = document.getElementById('Date');
  const today = new Date();
  const day = String(today.getDate()).padStart(2, '0');
  const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const month = monthNames[today.getMonth()]; // เดือนเต็ม
  const year = today.getFullYear();
  dateElement.textContent = `${day} ${month} ${year}`;
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
  const totalBarText = document.getElementById('Total_Bar_Text'); // ตัวเลขแยก
  const floor1Text = document.getElementById('floor1_Text');

  const V = 400;
  const root3 = Math.sqrt(3);
  const floor1_maxA = 100;
  const floor1_maxKW = root3 * V * floor1_maxA / 1000;
  const total_maxA = 100;
  const total_maxKW = root3 * V * total_maxA / 1000;

  async function updateBarsAndKW() {
    try {
      const res = await fetch('https://api-kx4r63rdjq-an.a.run.app/daily-energy/px_dh?date=' + new Date().toISOString().split('T')[0]);
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
    mainContainer.style.boxShadow = "0 0 10px 2px #FBBF32, inset 0 0 40px 2px #F9B30F";
    glowEl.style.boxShadow = "0 0 50px 20px #FBBF32";
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
const endpoint = 'px_dh';   // <-- เปลี่ยนเป็น sensor ที่คุณใช้จริง
const pricePerUnit = 4.4;       // บาท/หน่วย

async function fetchDailyBill() {
  try {
    const today = new Date().toISOString().split('T')[0];
     const url = `https://momaybackend02-production.up.railway.app/daily-bill/${today}`;
    const res = await fetch(url);
    const json = await res.json();

    const bill = json.electricity_bill ?? 0;  // ค่าไฟฟ้าเป็นเงิน
    const units = bill / pricePerUnit;        // แปลงเป็นหน่วย

    if (dailyBillEl) {
      dailyBillEl.textContent = bill.toFixed(2) + ' THB';
    }
    if (unitEl) {
      unitEl.textContent = units.toFixed(2) + ' Unit';
    }

  } catch (err) {
    console.error('Error fetching daily bill:', err);
    if (dailyBillEl) dailyBillEl.textContent = 'Error';
    if (unitEl) unitEl.textContent = '';
  }
}

// เรียกครั้งแรก
fetchDailyBill();

// อัปเดตทุก 30 นาที
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

    const data = {
      labels,
      datasets:[{
        label:'Power',
        data:new Array(1440).fill(null),
        borderColor:'#8B4513',
        backgroundColor: gradient,
        fill:true,
        borderWidth:0.5,
        tension:0.3,
        pointRadius:0
      }]
    };

    const config = {
      type:'line',
      data,
      options:{
        responsive:true,
        maintainAspectRatio:false,
        animation:false,
        plugins:{
          legend:{display:false},
          tooltip:{
            enabled:true,
            backgroundColor:'rgba(0,0,0,0.8)',
            titleColor: '#fff', // สีดำ
            bodyColor: '#fff',
            cornerRadius:8,
            displayColors:false,
            callbacks:{
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
        scales:{
          x:{type:'category',grid:{display:false},ticks:{autoSkip:false,color:'#000',maxRotation:0,minRotation:0,callback:function(v){const l=this.getLabelForValue(v); if(!l) return ''; const [h,m]=l.split(':'); return m==='00'&&parseInt(h)%3===0?l:'';}}},
          y:{grid:{display:false},beginAtZero:true,min:0,ticks:{color:'#000'}}
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
    function changeDay(delta){
    currentDate.setDate(currentDate.getDate() + delta);
    currentDayEl.textContent = formatDate(currentDate);
  }

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
        {label:'Average', data:new Array(1440).fill(avgVal), borderColor:'#000', borderDash:[5,5], fill:false, pointRadius:0,  borderWidth: 1   // <-- กำหนดความหนาเส้น (ค่าเล็ก = บาง)
}
      ];

      chart.update();
    }

    updateChart(currentDate);

    function changeDay(delta){ currentDate.setDate(currentDate.getDate()+delta); currentDayEl.textContent=formatDate(currentDate); updateChart(currentDate); }
    prevBtn.addEventListener('click', ()=>changeDay(-1));
    nextBtn.addEventListener('click', ()=>changeDay(1));
  }

  // ================= Calendar =================
  const calendarEl = document.getElementById('calendar');
  if (calendarEl) {
    const calendar = new FullCalendar.Calendar(calendarEl, {
      initialView: 'dayGridMonth',
      locale: 'th',
      headerToolbar: {
        left: 'prev,next today',
        center: 'title',
        right: ''
      },
      events: [
        { title: 'Event 1', start: '2025-09-28' },
        { title: 'Event 2', start: '2025-09-30' }
      ],
      height: 600
    });
    calendar.render();
  }


  // ================= Weather Sukhothai =================
async function fetchCurrentWeatherSukhothai() {
  try {
    const lat = 17.0080;
    const lon = 99.8238;
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&timezone=Asia/Bangkok`;

    const res = await fetch(url);
    const data = await res.json();

    const weatherCode = data.current_weather.weathercode;
    const temp = data.current_weather.temperature;

    // ฟังก์ชันแปลงรหัสสภาพอากาศเป็น icon
    function weatherCodeToEmoji(code) {
      if (code === 0) return "☀️";
      if ([1,2,3].includes(code)) return "⛅";
      if ([45,48].includes(code)) return "🌫️";
      if ([51,53,55].includes(code)) return "🌦️";
      if ([56,57].includes(code)) return "🌧️";
      if ([61,63,65].includes(code)) return "🌧️";
      if ([66,67].includes(code)) return "🌧️❄️";
      if ([71,73,75].includes(code)) return "❄️";
      if (code === 77) return "❄️";
      if ([80,81,82].includes(code)) return "🌧️";
      if ([85,86].includes(code)) return "❄️";
      if (code === 95) return "⛈️";
      if ([96,99].includes(code)) return "⛈️❄️";
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

// เรียกครั้งแรก
fetchCurrentWeatherSukhothai();

// อัปเดตทุก 30 นาที
setInterval(fetchCurrentWeatherSukhothai, 1800000);

//calenderpopup
// เลือกไอคอน Calendar
const calendarIcon = document.querySelector("#Calendar_icon img");
const popup = document.getElementById("calendarPopup");

// กด Calendar icon → เปิด popup
calendarIcon.addEventListener("click", function() {
  popup.classList.add("active");
});

// กดพื้นหลังดำ → ปิด popup
popup.addEventListener("click", function(e) {
  if (e.target === popup) {
    popup.classList.remove("active");
  }
});


});

