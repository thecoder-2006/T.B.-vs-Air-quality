// Mock TB data for specific locations with refined cases and deaths
const mockTBData = {
    "London": { cases: 1400, population: 9000000, deaths: 5 },
    "New York": { cases: 370, population: 8400000, deaths: 2 },
    "Mumbai": { cases: 50000, population: 21000000, deaths: 6300 }
};

// Global TB and PM2.5 data for past 5 years (updated with WHO Global Tuberculosis Report 2024)
const globalTBData = {
    2020: { incidence: 9.9, deaths: "1.5", pm25: 15.0 },
    2021: { incidence: 10.1, deaths: "1.6", pm25: 14.8 },
    2022: { incidence: 10.6, deaths: "1.3", pm25: 14.5 },
    2023: { incidence: 10.8, deaths: "1.25", pm25: 14.2 },
    2024: { incidence: 10.7, deaths: "1.2", pm25: 14.0 }
};

// Replace with your actual API keys
const OPENWEATHERMAP_API_KEY = '49f924494afdba3ed66907045bae1386';
const GEMINI_API_KEY = 'AIzaSyDsFojbwdTt2SxfgNXc1ct30qAf6tq0O_s';

// Retry function for API calls
async function fetchWithRetry(url, options = {}, retries = 3, delay = 1000) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url, options);
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }
            return await response.json();
        } catch (error) {
            if (i < retries - 1) {
                console.warn(`Retrying (${i + 1}/${retries}) after error: ${error.message}`);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }
            throw error;
        }
    }
}

async function fetchData() {
    const location = document.getElementById('locationInput').value.trim();
    if (!location) {
        alert('Please enter a location');
        return;
    }

    const resultsDiv = document.getElementById('results');
    const aboutDetails = document.getElementById('about-details');
    const graphSection = document.getElementById('graph-section');
    resultsDiv.innerHTML = '<p>Loading data...</p>';
    aboutDetails.style.display = 'none';
    graphSection.style.display = 'none'; // Hide global TB section

    try {
        const locationData = await fetchWithRetry(
            `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1`
        );
        if (!locationData.length) throw new Error('Location not found');
        const { lat, lon } = locationData[0];

        const weatherData1 = await fetchWithRetry(
            `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHERMAP_API_KEY}&units=metric`
        );
        const weatherData2 = await fetchWithRetry(
            `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHERMAP_API_KEY}&units=metric`
        );

        const tbInfo = mockTBData[location] || { cases: 200, population: 1000000, deaths: 20 };
        const tbRate = (tbInfo.cases / tbInfo.population * 100000).toFixed(2); // TB incidence rate per 100,000

        const airQualityData = await fetchWithRetry(
            `http://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${OPENWEATHERMAP_API_KEY}`
        );
        const pm25 = airQualityData.list[0].components.pm2_5;

        const geminiInitial = await fetchGeminiSummary(location, 0, 0, 0, 0, "Initializing data analysis...");
        const geminiSummary = await fetchGeminiSummary(location, tbRate, tbInfo.cases, tbInfo.deaths, weatherData1.main.temp, pm25);

        displayResults(location, tbRate, tbInfo.cases, tbInfo.deaths, weatherData1, pm25, geminiSummary);
    } catch (error) {
        console.error('Fetch error:', error);
        resultsDiv.innerHTML = `<p>Error: ${error.message}. Check console for details and ensure API keys are valid.</p>`;
        resultsDiv.innerHTML += `<button id="back-button" onclick="goBack()">Back</button>`;
    }
}

async function fetchGeminiSummary(location, tbRate, tbCases, tbDeaths, temperature, pm25, fallbackText = null) {
    if (fallbackText || !GEMINI_API_KEY || GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY') {
        return fallbackText || `In ${location}, TB incidence rate is ${tbRate} per 100,000, with ${tbCases} cases and ${tbDeaths} deaths. Temperature is ${temperature}°C, and PM2.5 is ${pm25} µg/m³. Air quality may influence TB prevalence.`;
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`;
    const options = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{
                parts: [{
                    text: `Generate a concise summary for ${location} with TB incidence rate ${tbRate} per 100,000, ${tbCases} TB cases, ${tbDeaths} TB deaths, temperature ${temperature}°C, and PM2.5 ${pm25} µg/m³.`
                }]
            }]
        })
    };

    try {
        const data = await fetchWithRetry(url, options);
        return data.candidates[0].content.parts[0].text;
    } catch (error) {
        console.error('Gemini API error:', error);
        return 'Unable to generate summary due to API error.';
    }
}

function displayResults(location, tbRate, tbCases, tbDeaths, weatherData, pm25, geminiSummary) {
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = `
        <button id="back-button" onclick="goBack()">Back</button>
        <div class="results-container">
            <div class="location-results">
                <div class="card">
                    <h3>${location}</h3>
                    <div class="data-section">
                        <div class="data-item">
                            <div class="data-label">TB Incidence Rate (per 100,000)</div>
                            <div class="data-value">${tbRate}</div>
                        </div>
                        <div class="data-item">
                            <div class="data-label">TB Cases</div>
                            <div class="data-value">${tbCases}</div>
                        </div>
                        <div class="data-item">
                            <div class="data-label">TB Deaths</div>
                            <div class="data-value">${tbDeaths}</div>
                        </div>
                        <div class="data-item">
                            <div class="data-label">Temperature</div>
                            <div class="data-value">${weatherData.main.temp}°C</div>
                        </div>
                        <div class="data-item">
                            <div class="data-label">Air Quality (PM2.5)</div>
                            <div class="data-value">${pm25} µg/m³</div>
                        </div>
                    </div>
                    <div class="insight-section">
                        <div class="insight-title">Gemini Insight:</div>
                        <div>${geminiSummary}</div>
                    </div>
                    <canvas id="chart-${location}"></canvas>
                </div>
            </div>
        </div>
    `;

    // Location-specific chart
    const ctxLocation = document.getElementById(`chart-${location}`).getContext('2d');
    new Chart(ctxLocation, {
        type: 'bar',
        data: {
            labels: ['TB Rate (per 100,000)', 'TB Deaths', 'Temp (°C)', 'PM2.5 (µg/m³)'],
            datasets: [{
                label: `${location} Data`,
                data: [tbRate, tbDeaths, weatherData.main.temp, pm25],
                backgroundColor: ['#FF6384', '#4B0082', '#FF9800', '#FFCE56'],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: { beginAtZero: true, title: { display: true, text: 'Value' } }
            },
            plugins: { legend: { display: false } }
        }
    });
}

function renderGlobalTBChartAndTable(chartId, tableId) {
    // Render table
    let tableHTML = `
        <table>
            <thead>
                <tr>
                    <th>Year</th>
                    <th>Incidence (Millions)</th>
                    <th>Deaths (Millions)</th>
                    <th>PM2.5 (µg/m³)</th>
                </tr>
            </thead>
            <tbody>
    `;
    for (const year in globalTBData) {
        tableHTML += `
            <tr>
                <td>${year}</td>
                <td>${globalTBData[year].incidence}</td>
                <td>${globalTBData[year].deaths}</td>
                <td>${globalTBData[year].pm25}</td>
            </tr>
        `;
    }
    tableHTML += `
            </tbody>
        </table>
        <p class="note">Note: TB incidence and deaths are from WHO Global Tuberculosis Report 2024. PM2.5 is mocked global average; 2024 data is projected as of April 2025.</p>
    `;
    document.getElementById(tableId).innerHTML = tableHTML;

    // Render chart
    const ctxGlobal = document.getElementById(chartId).getContext('2d');
    new Chart(ctxGlobal, {
        type: 'line',
        data: {
            labels: Object.keys(globalTBData),
            datasets: [
                {
                    label: 'TB Incidence (Millions)',
                    data: Object.values(globalTBData).map(d => d.incidence),
                    borderColor: '#FF6384',
                    yAxisID: 'y-tb',
                    fill: false,
                    tension: 0.1
                },
                {
                    label: 'PM2.5 (µg/m³)',
                    data: Object.values(globalTBData).map(d => d.pm25),
                    borderColor: '#FF9800',
                    yAxisID: 'y-pm25',
                    fill: false,
                    tension: 0.1
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                'y-tb': {
                    type: 'linear',
                    position: 'left',
                    title: { display: true, text: 'TB Incidence (Millions)' },
                    min: 9, max: 12
                },
                'y-pm25': {
                    type: 'linear',
                    position: 'right',
                    title: { display: true, text: 'PM2.5 (µg/m³)' },
                    min: 12, max: 16,
                    grid: { drawOnChartArea: false }
                }
            },
            plugins: {
                legend: { display: true },
                tooltip: { mode: 'index', intersect: false }
            }
        }
    });
}

function goBack() {
    const locationInput = document.getElementById('locationInput');
    const resultsDiv = document.getElementById('results');
    const aboutDetails = document.getElementById('about-details');
    const graphSection = document.getElementById('graph-section');
    
    locationInput.value = '';
    resultsDiv.innerHTML = '';
    aboutDetails.style.display = 'block';
    graphSection.style.display = 'block'; // Show global TB section
    
    const event = new Event('keyup');
    locationInput.dispatchEvent(event);
}

// Event listener for search bar
document.getElementById('locationInput').addEventListener('keyup', function() {
    const aboutDetails = document.getElementById('about-details');
    const inputValue = this.value.trim();
    aboutDetails.style.display = inputValue === '' ? 'block' : 'none';
});

// Render global TB chart and table on page load for cover page
document.addEventListener('DOMContentLoaded', () => {
    renderGlobalTBChartAndTable('cover-tb-air-quality-chart', 'cover-tb-table');
});
