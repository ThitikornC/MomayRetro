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
  marker.className = 'total-marker';
  totalBarContainer.appendChild(marker);

  function updateMarker(totalPercent) {
    const markerPosition = 182 * (totalPercent / 100);
    marker.style.top = `${182 - markerPosition}px`; 
  }

  // ================= Progress bars =================
  const floor1Bar = document.querySelector('#floor1 .progress-bar');
  const totalBar = document.querySelector('#Total_Bar .progress-bar');
  const glow = document.querySelector('.glow');
  const realtimeKWEl = document.querySelector('.Realtime_kW');

  const V = 400;
  const root3 = Math.sqrt(3);
  const floor1_maxA = 20;
  const floor1_maxKW = root3 * V * floor1_maxA / 1000;
  const total_maxA = 20;
  const total_maxKW = root3 * V * total_maxA / 1000;

  async function updateBarsAndKW() {
    try {
      const res = await fetch('https://api-kx4r63rdjq-an.a.run.app/daily-energy/px_pm3250?date=' + new Date().toISOString().split('T')[0]);
      const json = await res.json();
      const data = json.data;
      const latest = data.length ? data[data.length - 1].power : 0;

      // Floor 1 Bar
      const floor1Percent = Math.min((latest / floor1_maxKW) * 100, 100);
      if(floor1Bar){
        floor1Bar.style.width = `${floor1Percent}%`;
        floor1Bar.style.backgroundColor = floor1Percent <= 50 ? '#3a6b35' : '#b82500';
      }

      // Total Bar
      const totalPercent = Math.min((latest / total_maxKW) * 100, 100);
      if(totalBar){
        totalBar.style.height = `${totalPercent / 100 * 182}px`;
        totalBar.style.backgroundColor = totalPercent <= 50 ? '#3a6b35' : '#b82500';
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
            titleColor:'#fff',
            bodyColor:'#fff',
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
          x:{type:'category',grid:{display:false},ticks:{autoSkip:false,color:'#fff',maxRotation:0,minRotation:0,callback:function(v){const l=this.getLabelForValue(v); if(!l) return ''; const [h,m]=l.split(':'); return m==='00'&&parseInt(h)%3===0?l:'';}}},
          y:{grid:{display:false},beginAtZero:true,min:0,ticks:{color:'#fff'}}
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
      const m=String(date.getMonth()+1).padStart(2,'0');
      const y=date.getFullYear();
      return `${d} - ${m} - ${y}`;
    }
    currentDayEl.textContent = formatDate(currentDate);

    async function fetchDailyData(date){
      const dateStr = date.toISOString().split('T')[0];
      try{
        const res = await fetch(`https://api-kx4r63rdjq-an.a.run.app/daily-energy/px_pm3250?date=${dateStr}`);
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
        {label:'Max', data:new Array(1440).fill(null).map((_,i)=>i===maxIdx?maxVal:null), borderColor:'red', pointRadius:5, pointBackgroundColor:'red', fill:false, showLine:false},
        {label:'Average', data:new Array(1440).fill(avgVal), borderColor:'#FFD700', borderDash:[5,5], fill:false, pointRadius:0}
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
  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'dayGridMonth',
    locale: 'th', // ใช้ภาษาไทย
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
});
