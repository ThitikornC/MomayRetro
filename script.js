// ================= Date =================
function updateDate() {
  const dateElement = document.getElementById('Date');
  const today = new Date();
  const day = String(today.getDate()).padStart(2, '0');
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const year = today.getFullYear();
  dateElement.textContent = `${day}/${month}/${year}`;
}
const totalBarContainer = document.getElementById('Total_Bar'); // container ของ totalBar
let marker = document.createElement('div');
marker.className = 'total-marker';
totalBarContainer.appendChild(marker);

function updateMarker(totalPercent) {
  // totalBar สูงสุด 182px
  const markerPosition = 182 * (totalPercent / 100);
  marker.style.top = `${182 - markerPosition}px`; // เพราะ bar นับจากล่าง
}

document.addEventListener('DOMContentLoaded', () => {
  updateDate();

  // ================= Progress bars =================
  const floor1Bar = document.querySelector('#floor1 .progress-bar');
  const totalBar = document.querySelector('#Total_Bar .progress-bar');
  const glow = document.querySelector('.glow');
  const realtimeKWEl = document.querySelector('.Realtime_kW'); // สำหรับตัวเลข kW realtime

  const V = 400;           // แรงดันแต่ละชั้น
  const root3 = Math.sqrt(3);
  const floor1_maxA = 20; // สมมุติชั้น1
  const floor1_maxKW = root3 * V * floor1_maxA / 1000; // แปลงเป็น kW
  const total_maxA = 20;  // รวมทุกชั้น
  const total_maxKW = root3 * V * total_maxA / 1000;

  async function updateBarsAndKW() {
    try {
      const res = await fetch('https://api-kx4r63rdjq-an.a.run.app/daily-energy/px_pm3250?date=' + new Date().toISOString().split('T')[0]);
      const json = await res.json();
      const data = json.data;
      const latest = data.length ? data[data.length - 1].power : 0;

      // ================= Floor 1 Bar (แนวนอน) =================
      const floor1Percent = Math.min((latest / floor1_maxKW) * 100, 100);
      if(floor1Bar){
        floor1Bar.style.width = `${floor1Percent}%`;
        floor1Bar.style.backgroundColor = floor1Percent <= 50 ? '#3a6b35' : '#b82500';
      }

      // ================= Total Bar (แนวตั้ง) =================
      const totalPercent = Math.min((latest / total_maxKW) * 100, 100);
      if(totalBar){
        totalBar.style.height = `${totalPercent / 100 * 182}px`;
        totalBar.style.backgroundColor = totalPercent <= 50 ? '#3a6b35' : '#b82500';
      }

      // ================= Glow =================
      if(glow){
        const intensity = totalPercent / 100;
        const glowAlpha = 0.3 + intensity * 0.7;
        const glowSize = 100 + intensity * 50;
        glow.style.transition = 'all 0.5s ease';
        glow.style.background = `radial-gradient(circle, rgba(255,200,50,${glowAlpha}) 0%, rgba(255,200,50,0) 70%)`;
        glow.style.width = `${glowSize}%`;
        glow.style.height = `${glowSize}%`;
      }

      // ================= Realtime kW =================
      if(realtimeKWEl){
        realtimeKWEl.textContent = latest.toFixed(2) + ' kW';
      }

    } catch (err) {
      console.error('Error fetching power data:', err);
    }
  }

  updateBarsAndKW();
  setInterval(updateBarsAndKW, 1000); // อัพเดตทุก 1 วินาที

  // ================= Chart.js =================
  const canvas = document.getElementById('EnergyChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const labels = Array.from({ length: 1440 }, (_, i) => {
    const hour = String(Math.floor(i / 60)).padStart(2,'0');
    const min = String(i % 60).padStart(2,'0');
    return `${hour}:${min}`;
  });

  const gradient = ctx.createLinearGradient(0, 0, 0, 400);
  gradient.addColorStop(0, 'rgba(139, 69, 19, 0.4)');
  gradient.addColorStop(0.5, 'rgba(210, 180, 140, 0.3)');
  gradient.addColorStop(1, 'rgba(245, 222, 179, 0.1)');

  const data = {
    labels,
    datasets: [{
      label: 'Power',
      data: new Array(1440).fill(null),
      borderColor: '#8B4513',
      backgroundColor: gradient,
      fill: true,
      borderWidth: 0.5,
      tension: 0.3,
      pointRadius: 0
    }]
  };

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
            title: function(tooltipItems) { return tooltipItems[0].label; },
            label: function(tooltipItem) {
              const datasetLabel = tooltipItem.dataset.label;
              const value = tooltipItem.raw;
              if (datasetLabel === 'Max') return `Max: ${value.toFixed(2)} kW`;
              else if (datasetLabel === 'Average') return `Average: ${value.toFixed(2)} kW`;
              else if (datasetLabel === 'Power') return value !== null ? `Power: ${value.toFixed(2)} kW` : '-';
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
            color: '#fff',
            maxRotation: 0,
            minRotation: 0,
            callback: function(value) {
              const label = this.getLabelForValue(value);
              if (!label) return '';
              const [hour, min] = label.split(':');
              return min==='00' && parseInt(hour)%3===0 ? label : '';
            }
          }
        },
        y: {
          grid: { display: false },
          beginAtZero: true,
          min: 0,
          ticks: { color: '#fff' },
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
    const d = String(date.getDate()).padStart(2,'0');
    const m = String(date.getMonth() + 1).padStart(2,'0');
    const y = date.getFullYear();
    return `${d} - ${m} - ${y}`;
  }

  currentDayEl.textContent = formatDate(currentDate);

  async function fetchDailyData(date){
    const dateStr = date.toISOString().split('T')[0];
    const url = `https://api-kx4r63rdjq-an.a.run.app/daily-energy/px_pm3250?date=${dateStr}`;
    try {
      const res = await fetch(url);
      const json = await res.json();
      return json.data;
    } catch(err){
      console.error(err);
      return [];
    }
  }

  async function updateChart(date){
    const values = await fetchDailyData(date);
    const chartData = new Array(1440).fill(null);

    values.forEach(item => {
      const t = new Date(item.timestamp);
      const hours = t.getUTCHours();
      const minutes = t.getUTCMinutes();
      const index = hours * 60 + minutes;
      chartData[index] = item.power; 
    });

    let maxValue = null, maxIndex = null, sum = 0, count = 0;
    chartData.forEach((val,i)=>{
      if(val !== null){
        if(maxValue===null || val>maxValue){ maxValue=val; maxIndex=i; }
        sum += val; count++;
      }
    });
    const avgValue = count>0 ? sum/count : null;

    chart.data.datasets = [
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
        data: new Array(1440).fill(null).map((_,i)=> i===maxIndex ? maxValue : null),
        borderColor: 'red',
        pointRadius: 5,
        pointBackgroundColor: 'red',
        fill: false,
        showLine: false
      },
      {
        label: 'Average',
        data: new Array(1440).fill(avgValue),
        borderColor: '#FFD700',
        borderDash: [5,5],
        fill: false,
        pointRadius: 0
      }
    ];

    chart.update();
  }

  updateChart(currentDate);

  function changeDay(delta){
    currentDate.setDate(currentDate.getDate() + delta);
    currentDayEl.textContent = formatDate(currentDate);
    updateChart(currentDate);
  }

  prevBtn.addEventListener('click', ()=>changeDay(-1));
  nextBtn.addEventListener('click', ()=>changeDay(1));
});
