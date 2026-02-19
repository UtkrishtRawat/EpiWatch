// ============================================================
// FAKE DATA GENERATOR
// Generates ANONYMIZED disease outbreak data for 10000 cases
// NO personal identity is stored — only grouped counts
//
// DATASET FORMAT EXAMPLE:
// {
//   zone: "Zone A - Riverside",
//   disease: "Cholera",
//   diseaseType: "Waterborne",
//   caseCount: 3,
//   activeCases: 2,
//   date: "2026-02-15",
//   severityBreakdown: { Mild: 1, Moderate: 1, Severe: 1, Critical: 0 },
//   areaInfo: { latitude: 28.6139, longitude: 77.2090, population: 45000 }
// }
// ============================================================

// ----- Helper Functions -----

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomPick(array) {
    return array[Math.floor(Math.random() * array.length)];
}

function randomFloat(min, max, decimals = 2) {
    return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

// ----- Configuration Data -----

// 10 geographic zones with area information
const ZONES = [
    { name: "Zone A - Riverside", lat: 28.6139, lng: 77.2090, population: 45000, waterSource: "River Yamuna" },
    { name: "Zone B - Old Town", lat: 28.6200, lng: 77.2150, population: 62000, waterSource: "Municipal Pipeline" },
    { name: "Zone C - Market Area", lat: 28.6280, lng: 77.2200, population: 38000, waterSource: "Borewell" },
    { name: "Zone D - Industrial", lat: 28.6050, lng: 77.1950, population: 29000, waterSource: "Canal" },
    { name: "Zone E - Suburbs North", lat: 28.6400, lng: 77.2100, population: 55000, waterSource: "Municipal Pipeline" },
    { name: "Zone F - Suburbs South", lat: 28.5900, lng: 77.2000, population: 41000, waterSource: "Borewell" },
    { name: "Zone G - Lake District", lat: 28.6100, lng: 77.2300, population: 33000, waterSource: "Lake Reservoir" },
    { name: "Zone H - Highway Belt", lat: 28.6350, lng: 77.1900, population: 27000, waterSource: "Tanker Supply" },
    { name: "Zone I - University Area", lat: 28.6450, lng: 77.2250, population: 48000, waterSource: "Municipal Pipeline" },
    { name: "Zone J - Hospital Road", lat: 28.6000, lng: 77.2100, population: 36000, waterSource: "Borewell" },
];

// Diseases with their TYPE (waterborne, mosquito-borne, etc.)
const DISEASES = [
    { name: "Cholera", type: "Waterborne", spreadBy: "Contaminated water/food" },
    { name: "Typhoid", type: "Waterborne", spreadBy: "Contaminated water/food" },
    { name: "Hepatitis A", type: "Waterborne", spreadBy: "Contaminated water" },
    { name: "Dengue", type: "Mosquito-borne", spreadBy: "Aedes mosquito" },
    { name: "Malaria", type: "Mosquito-borne", spreadBy: "Anopheles mosquito" },
];

const SEVERITIES = ["Mild", "Moderate", "Severe", "Critical"];
const AGE_GROUPS = ["0-10", "11-20", "21-30", "31-40", "41-50", "51-60", "61-70", "71+"];


// ============================================================
// MAIN GENERATION FUNCTION
// ============================================================
function generateAllData() {
    console.log("🔄 Generating anonymized data for 10000 cases...");

    const TOTAL_CASES = 10000;

    // -------------------------------------------------------
    // STEP 1: Distribute 10000 cases randomly
    // -------------------------------------------------------
    // We'll first assign each case, then group them into
    // a clean dataset like: "3 people with Cholera in Zone A"
    // -------------------------------------------------------

    // Temporary counter: key = "date|zone|disease"
    const groupKey = {};

    for (let i = 0; i < TOTAL_CASES; i++) {
        const zone = randomPick(ZONES);
        const disease = randomPick(DISEASES);
        const severity = randomPick(SEVERITIES);
        const ageGroup = randomPick(AGE_GROUPS);
        const isActive = Math.random() > 0.3; // 70% active

        // Random date within last 90 days
        const daysAgo = randomInt(0, 89);
        const date = new Date();
        date.setDate(date.getDate() - daysAgo);
        const dateKey = date.toISOString().split("T")[0];

        const key = `${dateKey}|${zone.name}|${disease.name}`;

        if (!groupKey[key]) {
            groupKey[key] = {
                date: dateKey,
                zone: zone.name,
                disease: disease.name,
                diseaseType: disease.type,       // "waterborne" or "Mosquito-borne"
                spreadBy: disease.spreadBy,
                caseCount: 0,
                activeCases: 0,
                severityBreakdown: { Mild: 0, Moderate: 0, Severe: 0, Critical: 0 },
                ageGroupBreakdown: {},
                areaInfo: {
                    latitude: zone.lat,
                    longitude: zone.lng,
                    population: zone.population,
                    waterSource: zone.waterSource,
                },
            };
            // Initialize age group breakdown
            for (const ag of AGE_GROUPS) {
                groupKey[key].ageGroupBreakdown[ag] = 0;
            }
        }

        // Add this case to the group
        groupKey[key].caseCount++;
        if (isActive) groupKey[key].activeCases++;
        groupKey[key].severityBreakdown[severity]++;
        groupKey[key].ageGroupBreakdown[ageGroup]++;
    }

    // Convert to array and sort by date (newest first)
    const dataset = Object.values(groupKey).sort(
        (a, b) => b.date.localeCompare(a.date) || b.caseCount - a.caseCount
    );

    console.log(`✅ Generated ${TOTAL_CASES} cases grouped into ${dataset.length} dataset records`);
    console.log(`   Example: "${dataset[0].caseCount} people suffering from ${dataset[0].disease} (${dataset[0].diseaseType}) in ${dataset[0].zone}"`);


    // -------------------------------------------------------
    // STEP 2: Build daily counts (for trend charts)
    // -------------------------------------------------------
    const dailyCounts = {};
    const diseaseNames = DISEASES.map(d => d.name);

    for (const record of dataset) {
        if (!dailyCounts[record.date]) {
            dailyCounts[record.date] = {};
            for (const d of diseaseNames) dailyCounts[record.date][d] = 0;
        }
        dailyCounts[record.date][record.disease] += record.caseCount;
    }

    const dailyCountsArray = Object.entries(dailyCounts)
        .map(([date, counts]) => ({ date, ...counts }))
        .sort((a, b) => a.date.localeCompare(b.date));


    // -------------------------------------------------------
    // STEP 3: Build zone hotspots (for map)
    // -------------------------------------------------------
    const zoneSummary = {};
    let totalActive = 0;

    for (const zone of ZONES) {
        zoneSummary[zone.name] = {
            zone: zone.name,
            latitude: zone.lat,
            longitude: zone.lng,
            population: zone.population,
            waterSource: zone.waterSource,
            totalCases: 0,
            activeCases: 0,
            diseases: {},
            severities: { Mild: 0, Moderate: 0, Severe: 0, Critical: 0 },
        };
        for (const d of diseaseNames) {
            zoneSummary[zone.name].diseases[d] = 0;
        }
    }

    const overallSeverity = { Mild: 0, Moderate: 0, Severe: 0, Critical: 0 };
    const overallDisease = {};
    for (const d of diseaseNames) overallDisease[d] = 0;

    for (const record of dataset) {
        const zs = zoneSummary[record.zone];
        zs.totalCases += record.caseCount;
        zs.activeCases += record.activeCases;
        zs.diseases[record.disease] += record.caseCount;
        totalActive += record.activeCases;

        for (const sev of SEVERITIES) {
            zs.severities[sev] += record.severityBreakdown[sev];
            overallSeverity[sev] += record.severityBreakdown[sev];
        }
        overallDisease[record.disease] += record.caseCount;
    }

    const hotspots = Object.values(zoneSummary);


    // -------------------------------------------------------
    // STEP 4: Generate water quality reports
    // -------------------------------------------------------
    const waterReports = [];
    let waterId = 1;

    const WATER_SOURCES = [
        "River Intake Point A", "River Intake Point B",
        "Municipal Tank 1", "Municipal Tank 2", "Municipal Tank 3",
        "Borewell Zone A", "Borewell Zone B", "Borewell Zone C",
        "Lake Reservoir", "Rainwater Harvest Unit",
        "Pipeline Junction North", "Pipeline Junction South",
        "Treatment Plant Outlet 1", "Treatment Plant Outlet 2",
        "Community Well East", "Community Well West",
        "Storage Tank Industrial", "Overhead Tank Market",
        "Spring Source Hills", "Canal Water Point"
    ];

    for (const source of WATER_SOURCES) {
        const assignedZone = randomPick(ZONES);

        for (let day = 0; day < 30; day++) {
            const date = new Date();
            date.setDate(date.getDate() - day);

            const isContaminated = Math.random() > 0.7; // 30% bad

            waterReports.push({
                id: waterId++,
                source: source,
                zone: assignedZone.name,
                latitude: assignedZone.lat + randomFloat(-0.003, 0.003, 4),
                longitude: assignedZone.lng + randomFloat(-0.003, 0.003, 4),
                date: date.toISOString().split("T")[0],
                pH: isContaminated ? randomFloat(5.0, 6.0) : randomFloat(6.5, 8.5),
                turbidity: isContaminated ? randomFloat(8.0, 25.0) : randomFloat(0.5, 5.0),
                coliformCount: isContaminated ? randomInt(50, 500) : randomInt(0, 10),
                dissolvedOxygen: isContaminated ? randomFloat(2.0, 4.0) : randomFloat(5.0, 9.0),
                temperature: randomFloat(18.0, 32.0),
                isSafe: !isContaminated,
            });
        }
    }

    console.log(`✅ Generated ${waterReports.length} water quality reports`);
    console.log(`✅ Generated daily counts for ${dailyCountsArray.length} days`);


    // -------------------------------------------------------
    // Return everything
    // -------------------------------------------------------
    return {
        totalCases: TOTAL_CASES,
        totalActive: totalActive,
        dataset,            // MAIN DATASET: grouped records like "3 people with Cholera in Zone A"
        waterReports,
        dailyCounts: dailyCountsArray,
        hotspots,
        zones: ZONES,
        diseases: DISEASES,
        diseaseNames,
        overallSeverity,
        overallDisease,
    };
}

module.exports = { generateAllData };
