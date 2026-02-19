# 🏥 Disease Outbreak Prediction Dashboard

A powerful, full-stack predictive analytics platform designed to monitor, analyze, and forecast disease outbreaks using anonymized data.

![Dashboard Preview](https://via.placeholder.com/800x400?text=Disease+Outbreak+Dashboard+Preview)

## 🌟 Key Features

### 1. **Interactive Dashboard**
- **Real-Time Data**: Visualizes **10,000+** anonymized case records.
- **Geospatial Mapping**: Interactive Leaflet map showing outbreak clusters by zone (North, South, East, West, Central).
- **Analytics**: Dynamic charts for disease trends, severity distribution, and affected demographics.
- **Key Metrics**: Immediate view of Total Cases, Active Cases, Critical Alerts, and overall System Risk.

### 2. **AI-Driven Forecasting**
- **48-Hour Predictions**: Algorithms predict disease spread for the next 48 hours based on current trends.
- **Anomaly Detection**: Automatically flags unusual spikes in case reports or water quality issues.
- **Risk Assessment**: Calculates a dynamic risk score (Low, Medium, High, Critical) for each region.

### 3. **Hybrid Data Management**
- **Dual Mode**: Works out-of-the-box with generated fake data AND supports real persistent data via MongoDB.
- **Custom Data Entry**: Dedicated interface to report new **Disease Cases** and **Water Quality Reports**.
- **Data Export**: One-click export of all custom records to JSON format for external analysis.

### 4. **Business & Strategy**
- **Business Model Page**: Detailed breakdown of the project's value proposition, revenue streams, and roadmap.
- **Modern UI**: Dark-themed, glassmorphism design for a professional and accessible user experience.

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v14 or higher)
- [MongoDB](https://www.mongodb.com/try/download/community) (Optional: Required for saving custom data)

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd disease-dashboard
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the server:**
   ```bash
   npm start
   ```

4. **Access the application:**
   Open your browser and navigate to `http://localhost:3000`.

---

## 💾 Database Integration (MongoDB)

This project supports a **Hybrid Architecture**:
- **Without MongoDB**: The app runs perfectly using 10,000 records of high-fidelity mock data.
- **With MongoDB**: The app connects automatically to `mongodb://127.0.0.1:27017/disease-dashboard`.
    - You can add your own cases and water reports.
    - Custom data is merged with mock data in analytics.
    - Data persists even after restarting the server.

**To enable persistence:**
1. Install and run MongoDB locally.
2. The application will detect the connection and switch to "Live Database" mode.
3. Check status on the dashboard header or the "Add Data" page.

---

## 🛠 Project Structure

```
├── public/                 # Frontend assets
│   ├── index.html          # Main Dashboard
│   ├── business-model.html # Business Strategy Page
│   ├── add-data.html       # Data Entry & Management
│   ├── style.css           # Global Styles (Dark Theme)
│   ├── app.js              # Dashboard Logic & Charts
│   └── map.js              # Leaflet Map Logic
├── routes/
│   └── api.js              # Express API Routes
├── models/
│   └── schemas.js          # Mongoose Data Models
├── data/
│   └── generateFakeData.js # Mock Data Algorithms
├── mongo saved reports/    # Exported JSON Data
└── server.js               # Main Server Entry Point
```

---

## 📡 API Reference

| Method | Endpoint             | Description |
|:-------|:---------------------|:------------|
| `GET`  | `/api/cases`         | Retrieve all cases (Mock + DB) |
| `POST` | `/api/cases`         | Add a new custom case (DB only) |
| `GET`  | `/api/water-quality` | Retrieve water reports (Mock + DB) |
| `POST` | `/api/water-quality` | Add a new water report (DB only) |
| `GET`  | `/api/analytics`     | Get aggregated stats and trends |
| `POST` | `/api/export`        | Export all DB data to JSON files |

---

## 🔒 Privacy & Security
- **Anonymization**: All patient data is strictly anonymized. No PII (Personally Identifiable Information) is stored or processed.
- **Synthetic Data**: The 10,000 initial records are algorithmically generated for demonstration purposes.

---

## 📄 License
This project is open-source and available for educational and humanitarian purposes.
