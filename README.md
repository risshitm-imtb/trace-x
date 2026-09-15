```markdown
# Trace-X

## AI-Powered Bitcoin Transaction Traffic Monitoring & Investigation Platform

> **Detect. Correlate. Investigate.**

Trace-X is an offline cryptocurrency investigation platform designed to correlate **Bitcoin blockchain transaction activity** with **network-layer observations** such as IP addresses, ports, timestamps, countries, and Autonomous Systems (ASNs).

The platform combines structured data ingestion, entity correlation, behavioral feature engineering, machine-learning-based anomaly detection, graph analysis, risk scoring, and explainable investigative signals into a unified analyst-oriented interface.

---

## Overview

Traditional blockchain analysis primarily focuses on on-chain activity, while network monitoring provides a different perspective on transaction-related infrastructure.

**Trace-X connects these two perspectives.**

The system ingests structured Bitcoin transaction and network metadata, validates and normalizes the information, stores it in an investigation database, extracts wallet-level behavioral and network features, applies an unsupervised anomaly detection model, and presents ranked entities for further investigation.

### Core Pipeline

```text
┌──────────────────────────────┐
│      RAW DATA SOURCES        │
│  CSV / JSON / XML Metadata   │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│        DATA INGESTION        │
│ Validation + Normalization   │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│     INVESTIGATION DATABASE   │
│ Wallets / TXs / IPs / Events │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│     FEATURE ENGINEERING      │
│ Behavioral + Network Signals │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│     ML ANOMALY DETECTION     │
│       Isolation Forest       │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│        RISK SCORING          │
│      0 – 100 Priority        │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│ EXPLAINABLE INVESTIGATIVE    │
│          SIGNALS              │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│       TRACE-X DASHBOARD      │
│ Alerts / Wallets / Graphs    │
│ Transactions / Investigation │
└──────────────────────────────┘
```

---

# Problem Statement

Bitcoin provides transparent blockchain data, but blockchain-only analysis does not always provide sufficient context for understanding the infrastructure associated with observed transaction activity.

At the same time, network-level observations can contain valuable information such as:

- Source and destination IP addresses
- Ports
- Timing
- Geographic information
- Autonomous Systems
- Transaction identifiers

The challenge is to correlate these two layers and identify entities whose behavior deserves further investigation.

Trace-X addresses this by building an investigation-oriented pipeline that connects:

```text
Blockchain Layer
       +
Network Layer
       +
Behavioral Analysis
       +
Entity Relationships
       +
Machine Learning
       ↓
Prioritized Investigative Leads
```

---

# Key Capabilities

## 1. Multi-Source Data Ingestion

Trace-X is designed to ingest structured cryptocurrency transaction and network metadata from formats including:

- CSV
- JSON
- XML

The current prototype uses CSV-based synthetic Bitcoin traffic data.

Supported investigation fields include:

- Timestamp
- Source IP
- Destination IP
- Source port
- Destination port
- Transaction ID (TXID)
- Input addresses
- Output addresses
- Input amounts
- Output amounts
- Country
- ASN
- Transaction fee
- Script type

---

## 2. Blockchain Entity Modeling

Transaction information is normalized into investigation entities including:

- Wallets
- Transactions
- Transaction inputs
- Transaction outputs
- IP addresses
- Network observations

Conceptually:

```text
                 ┌──────────────┐
                 │   Wallet     │
                 └──────┬───────┘
                        │
              ┌─────────┴─────────┐
              │                   │
              ▼                   ▼
       Transaction Input   Transaction Output
              │                   │
              └─────────┬─────────┘
                        ▼
                 ┌──────────────┐
                 │ Transaction  │
                 └──────┬───────┘
                        │
                        ▼
                 Network Observation
                        │
                 ┌──────┴──────┐
                 ▼             ▼
              Source IP    Destination IP
```

This normalized structure allows investigators to move from an individual wallet to its transactions, connected wallets, and observed network infrastructure.

---

# 3. Network-Layer Correlation

Trace-X associates transaction activity with observed network infrastructure.

The system tracks:

- Source IP addresses
- Destination IP addresses
- Source ports
- Destination ports
- Countries
- Autonomous Systems
- Observation timestamps
- Associated TXIDs

This adds a network-context layer around blockchain entities.

---

# 4. Machine Learning Anomaly Detection

Trace-X uses an **Isolation Forest** model for unsupervised wallet-level behavioral anomaly detection.

The current feature set includes:

| Feature | Description |
|---|---|
| Transaction Count | Number of transactions associated with the wallet |
| Total Received | Total observed incoming value |
| Total Sent | Total observed outgoing value |
| Input TX Count | Number of transactions where the wallet appears as an input |
| Output TX Count | Number of transactions where the wallet appears as an output |
| Source IP Count | Number of distinct observed source IPs |
| Destination IP Count | Number of distinct destination IPs |
| ASN Count | Number of distinct observed ASNs |
| Transactions per IP | Transaction activity relative to observed IP diversity |
| Flow Imbalance | Difference between incoming and outgoing behavior |
| Network Diversity | Combined network infrastructure diversity |

The synthetic dataset's scenario labels are **not used as ML input features**.

The anomaly detector instead learns behavioral outliers from the engineered wallet features.

### Model Configuration

```text
Algorithm:        Isolation Forest
Estimators:       300
Contamination:    0.08
Random State:     42
Parallelization:  Enabled
Scaling:          StandardScaler
```

---

# 5. Investigative Risk Scoring

ML anomaly output is combined with behavioral and network signals to generate a normalized **0–100 investigative risk score**.

Current scoring components:

```text
ML Anomaly Signal       50%
Transaction Velocity    20%
Network Diversity       15%
Flow Imbalance          15%
```

Conceptually:

```text
                 ┌─────────────────┐
                 │  ML Anomaly     │
                 │      50%        │
                 └────────┬────────┘
                          │
       ┌──────────────────┼──────────────────┐
       │                  │                  │
       ▼                  ▼                  ▼
   Velocity            Network             Flow
     20%                 15%                15%
       │                  │                  │
       └──────────────────┴──────────────────┘
                          │
                          ▼
                INVESTIGATIVE RISK
                     0 – 100
```

The risk score is intended to prioritize entities for analyst attention.

> **Important:** The Trace-X risk score is an investigative prioritization signal. It is not a probability of criminal activity and does not constitute proof of malicious or illicit behavior.

---

# 6. Explainable Investigative Signals

Trace-X does not rely solely on an unexplained ML score.

The platform generates supporting signals that explain why an entity was prioritized.

Examples include:

- Critical behavioral anomaly
- Elevated behavioral anomaly
- Distributed network activity
- ASN diversity
- Large transaction neighborhood
- Strong flow imbalance
- Address reuse
- High transaction velocity

Example:

```text
RISK SCORE
99.76 / 100

INVESTIGATIVE SIGNALS

• Critical behavioral anomaly
• Distributed network activity
• ASN diversity
• Large transaction neighborhood
• Strong flow imbalance
```

This approach helps an analyst understand **why** an entity surfaced instead of treating the ML model as a black box.

---

# 7. Wallet Investigation

Trace-X provides a dedicated investigation view for individual wallets.

A wallet investigation can include:

- Wallet address
- First observed timestamp
- Last observed timestamp
- Transaction count
- Total received value
- Total sent value
- Risk score
- Evidence confidence
- Anomaly score
- Source IPs
- Destination IPs
- Countries
- ASNs
- Network observations
- Recent transactions
- Connected wallets
- Investigative signals

Example investigation flow:

```text
Wallet
  │
  ├── Risk Profile
  │
  ├── Behavioral Signals
  │
  ├── Network Footprint
  │      ├── IPs
  │      ├── Countries
  │      └── ASNs
  │
  ├── Recent Transactions
  │
  ├── Connected Wallets
  │
  └── Investigative Signals
```

---

# 8. Transaction Analysis

Trace-X also supports transaction-level investigation.

For an individual TXID, the platform can examine:

- Transaction ID
- Timestamp
- Transaction fee
- Script type
- Input count
- Output count
- Total input value
- Total output value
- Connected wallets
- Source IP activity
- Destination IP activity
- Countries
- ASNs
- Investigative evidence

Possible transaction-level signals include:

- Address reuse
- Source-IP activity
- Output fan-out
- Transaction value behavior
- Connected entity relationships

Transaction prioritization is presented as **Investigative Priority**, rather than claiming that the transaction itself is malicious.

---

# 9. Entity & Network Graph

Trace-X builds a relationship graph connecting blockchain and network entities.

Example:

```text
                   ┌─────────────┐
                   │   Source IP │
                   └──────┬──────┘
                          │
                          ▼
                 ┌────────────────┐
                 │ Network Event  │
                 └───────┬────────┘
                         │
                         ▼
                  ┌─────────────┐
                  │ Transaction │
                  └──────┬──────┘
                         │
                ┌────────┴────────┐
                ▼                 ▼
         ┌────────────┐    ┌────────────┐
         │Input Wallet│    │Output Wallet│
         └─────┬──────┘    └──────┬─────┘
               │                  │
               └────────┬─────────┘
                        ▼
                Connected Entities
```

Trace-X also supports focused graph analysis around selected wallets.

This allows an investigator to explore local neighborhoods without attempting to render the entire dataset at once.

---

# 10. GeoIP & ASN Enrichment

Trace-X supports offline IP enrichment using **DB-IP Lite** databases.

The enrichment layer provides:

- Country information
- Autonomous System information

This allows observed IP addresses to be enriched with geographic and network context without requiring a live external lookup during analysis.

### Attribution

IP geolocation data is provided using DB-IP Lite.

https://db-ip.com

---

# Dashboard

The Trace-X frontend is designed as an analyst-oriented cryptocurrency intelligence workstation.

## Overview

Provides a high-level view of:

- Wallets analyzed
- High-risk alerts
- ML anomalies
- Average risk
- Maximum observed risk
- Prioritized investigative leads

## Alerts

Provides ranked wallet entities requiring further investigation.

## Wallet Investigation

Provides detailed forensic-style analysis of an individual wallet.

## Transaction Analysis

Provides transaction-level flow, entity, and network analysis.

## Network Graph

Provides relationship visualization between wallets, transactions, IPs, and observations.

## Wallet Directory

Provides a searchable/indexed view of wallet entities.

## Dataset Import

Provides the interface for bringing structured investigation datasets into the analysis pipeline.

---

# System Architecture

```text
                         TRACE-X
                            │
          ┌─────────────────┴─────────────────┐
          │                                   │
      DATA LAYER                         PRESENTATION
          │                                   │
   ┌──────┴──────┐                     HTML / CSS / JS
   │             │                            │
CSV / JSON / XML │                            │
   │             │                            │
   ▼             ▼                            ▼
Ingestion     GeoIP / ASN                FastAPI API
   │             │                            │
   └──────┬──────┘                            │
          │                                   │
          ▼                                   │
    SQLite Database ◄─────────────────────────┘
          │
          ▼
  Feature Engineering
          │
          ▼
   Isolation Forest
          │
          ▼
    Risk Scoring
          │
      ┌───┴────┐
      ▼        ▼
   Alerts     Graph
      │        │
      └───┬────┘
          ▼
  Analyst Investigation
```

---

# Technology Stack

| Layer | Technology |
|---|---|
| Programming Language | Python |
| Backend API | FastAPI |
| API Server | Uvicorn |
| Database | SQLite |
| Database Layer | SQLAlchemy |
| Data Processing | Pandas |
| Numerical Computing | NumPy |
| Machine Learning | Scikit-learn |
| Anomaly Detection | Isolation Forest |
| Feature Scaling | StandardScaler |
| Model Persistence | Joblib |
| Graph Analysis | NetworkX |
| IP Enrichment | GeoIP2 / DB-IP Lite |
| Frontend | HTML5 / CSS3 / JavaScript |

---

# Project Structure

```text
trace-x/
│
├── backend/
│   ├── __init__.py
│   ├── init_db.py
│   ├── ingest.py
│   ├── train_model.py
│   ├── generate_alerts.py
│   ├── update_geoip.py
│   │
│   └── app/
│       ├── __init__.py
│       ├── main.py
│       │
│       ├── api/
│       │   ├── __init__.py
│       │   └── routes.py
│       │
│       ├── core/
│       │   ├── __init__.py
│       │   └── database.py
│       │
│       ├── models/
│       │   ├── __init__.py
│       │   └── entities.py
│       │
│       ├── services/
│       │   └── geoip.py
│       │
│       ├── ml/
│       │   ├── __init__.py
│       │   ├── features.py
│       │   ├── detector.py
│       │   ├── risk.py
│       │   └── pipeline.py
│       │
│       ├── graph/
│       │   └── network.py
│       │
│       ├── ingestion/
│       │   └── loader.py
│       │
│       └── utils/
│
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── app.js
│
├── data/
│   ├── raw/
│   │   └── bitcoin_traffic.csv
│   │
│   ├── processed/
│   │
│   └── geoip/
│       ├── dbip-country-lite.mmdb
│       └── dbip-asn-lite.mmdb
│
├── models/
│   └── wallet_anomaly_model.joblib
│
├── scripts/
│   └── generate_dataset.py
│
├── docs/
│   └── data-architecture.md
│
├── tests/
│
├── README.md
├── requirements.txt
└── .gitignore
```

---

# Dataset

The current prototype operates on a **synthetic Bitcoin transaction traffic dataset** designed for development, testing, demonstration, and evaluation.

Current dataset:

```text
Records:              3,000
Unique Wallets:         480
Observed IPs:            170
```

## Synthetic Scenarios

| Scenario | Records |
|---|---:|
| Normal | 2,208 |
| High Velocity | 376 |
| Peeling-like | 252 |
| Mixing-like | 164 |
| **Total** | **3,000** |

The `scenario` field exists for development and evaluation of the synthetic dataset.

It is **not used as an input feature by the anomaly detection model**.

### Dataset Disclaimer

The included data does **not** represent:

- Real intercepted Bitcoin traffic
- Live network traffic
- Seized cryptocurrency data
- Real investigative intelligence
- Real-world attribution

It is synthetic data generated to reproduce investigation-oriented transaction and network patterns.

---

# Installation

## Requirements

Recommended environment:

- Python 3.12+
- Conda or Python virtual environment
- Git
- macOS or Linux

---

## 1. Clone the Repository

```bash
git clone https://github.com/risshitm-imtb/trace-x.git
cd trace-x
```

---

## 2. Create the Python Environment

Using Conda:

```bash
conda create -n tracex python=3.12
conda activate tracex
```

---

## 3. Install Dependencies

```bash
pip install -r requirements.txt
```

---

# Running Trace-X

## Step 1: Initialize the Database

```bash
python -m backend.init_db
```

This creates the SQLite investigation database and required entity tables.

---

## Step 2: Ingest the Dataset

```bash
python -m backend.ingest
```

The ingestion layer validates and normalizes the dataset before storing the entities and observations.

---

## Step 3: Train the ML Model

```bash
python -m backend.train_model
```

The trained anomaly detection model is persisted using Joblib.

---

## Step 4: Generate Investigative Alerts

```bash
python -m backend.generate_alerts
```

This runs the anomaly detection and risk-scoring pipeline and generates ranked investigative leads.

---

## Step 5: Start the API and Dashboard

```bash
uvicorn backend.app.main:app --reload
```

Then open:

```text
http://127.0.0.1:8000
```

---

# API

Trace-X exposes a REST API through FastAPI.

## Health Check

```http
GET /api/health
```

Returns the operational status of the platform.

---

## Overview

```http
GET /api/overview
```

Returns:

- Total wallets
- High-risk alerts
- Anomalies
- Average risk
- Maximum risk

---

## Alerts

```http
GET /api/alerts
```

Returns ranked high-risk wallet entities and supporting signals.

---

## Wallet Investigation

```http
GET /api/wallet/{wallet_address}
```

Returns wallet-level:

- Entity information
- Risk score
- Evidence confidence
- Anomaly score
- Behavioral metrics
- Network infrastructure
- Countries
- ASNs
- Recent transactions
- Connected wallets
- Investigative signals

---

## Network Graph

```http
GET /api/graph
```

Returns the investigation relationship graph.

---

## Focused Network Graph

```http
GET /api/graph/focused?wallet_address={wallet_address}
```

Returns a bounded graph neighborhood around a selected wallet.

---

## Transaction Analysis

```http
GET /api/transaction/{txid}
```

Returns transaction-level investigative analysis.

---

# Example Investigation Output

A sample high-risk wallet from the current synthetic dataset produced:

```text
Risk Score:             99.76 / 100
Evidence Confidence:    99.48
Anomaly Score:          0.1987

Transactions:           37
Source IPs:              15
Destination IPs:         35
Network Diversity:       87
Connected Wallets:       50
```

Associated investigative signals included:

```text
• Critical behavioral anomaly
• Distributed network activity
• ASN diversity
• Large transaction neighborhood
• Strong flow imbalance
```

These results demonstrate the platform's ability to combine multiple behavioral, network, and graph signals into a prioritized investigative lead.

---

# Machine Learning Pipeline

```text
                    Wallet Data
                         │
                         ▼
                Feature Engineering
                         │
                         ▼
                   StandardScaler
                         │
                         ▼
                  Isolation Forest
                         │
                         ▼
                    Anomaly Score
                         │
                         ▼
                    Risk Scoring
                         │
                         ▼
              Investigative Priority
                         │
                         ▼
               Explainable Signals
```

The current implementation uses unsupervised anomaly detection.

This means the model is designed to identify **behavioral outliers**, not directly determine whether a wallet is involved in criminal activity.

---

# Investigation Philosophy

Trace-X follows a simple principle:

> **A suspicious transaction is rarely suspicious because of one signal.**

Meaningful investigation can emerge from the intersection of:

```text
Blockchain Behavior
        +
Network Infrastructure
        +
Temporal Activity
        +
Entity Relationships
        +
Behavioral Anomalies
        ↓
Prioritized Investigative Lead
```

The purpose of Trace-X is therefore not to automatically declare an entity malicious.

Its purpose is to help an analyst answer:

> **“Which entities deserve my attention first, and what evidence caused them to surface?”**

---

# Security & Privacy

Trace-X is designed around an offline investigation workflow.

The core analysis pipeline does not require a live blockchain connection.

This architecture can be useful in environments where investigation datasets must remain local.

However:

- Sensitive operational intelligence should not be placed in public repositories.
- Real investigative datasets should be stored using appropriate security controls.
- Real IP intelligence should not be exposed through an uncontrolled deployment.
- Model outputs should be reviewed by qualified analysts.
- Risk scores should support human investigation rather than replace it.
- Network observations should not automatically be interpreted as proof of individual identity or control.

---

# Limitations

Trace-X is currently a prototype/research implementation.

## Synthetic Data

The current dataset is synthetic and does not represent real-world Bitcoin network traffic.

## Heuristic Risk Scoring

The risk score combines ML output with engineered behavioral signals.

It is an investigative prioritization mechanism rather than a calibrated probability.

## Unsupervised Machine Learning

Isolation Forest identifies behavioral outliers but does not inherently determine whether an entity is malicious, criminal, or benign.

## Network Attribution

An observed IP address should not automatically be interpreted as proof that a specific person controlled a wallet.

IP addresses may represent shared infrastructure, proxies, VPNs, hosting providers, NAT environments, or other network configurations.

## Prototype Scale

The current SQLite architecture is suitable for prototype and investigation-scale workloads.

A production implementation would require additional engineering around:

- Large-scale ingestion
- Distributed processing
- Database scalability
- Access control
- Audit logging
- Evidence integrity
- Secure storage
- Model governance
- Performance optimization
- Multi-user operation

---

# Future Development

Potential future improvements include:

- [ ] Streaming transaction and network ingestion
- [ ] Full JSON ingestion
- [ ] Full XML ingestion
- [ ] Larger-scale graph processing
- [ ] Advanced wallet/entity clustering
- [ ] Temporal transaction graph analysis
- [ ] Peeling-chain detection
- [ ] Mixing-pattern detection
- [ ] Temporal anomaly detection
- [ ] Graph-based machine learning
- [ ] Model calibration
- [ ] Model evaluation metrics
- [ ] Analyst case management
- [ ] Investigation timeline reconstruction
- [ ] Evidence export
- [ ] Chain-of-custody support
- [ ] STIX-compatible intelligence export
- [ ] Role-based access control
- [ ] Immutable audit logging
- [ ] Production-scale database architecture
- [ ] Advanced analyst collaboration workflows

---

# Ethical & Authorized Use

Trace-X is intended for:

- Cybersecurity research
- Blockchain analytics
- Authorized investigations
- Academic experimentation
- Security operations
- Training and demonstration

The platform should only be used with data and systems for which the operator has appropriate authorization.

The developers do not endorse unauthorized surveillance, intrusion, deanonymization, or misuse of cryptocurrency or network data.

---

# Project Status

```text
TRACE-X PROTOTYPE
────────────────────────────────────────

Data Ingestion                  ✓
Data Validation                 ✓
Database Layer                  ✓
Entity Modeling                 ✓
Feature Engineering             ✓
ML Anomaly Detection            ✓
Risk Scoring                    ✓
Explainable Alerts              ✓
Wallet Investigation             ✓
Transaction Analysis             ✓
Network Graph                   ✓
Focused Graph Analysis          ✓
GeoIP / ASN Enrichment          ✓
Analyst Dashboard               ✓
Synthetic Dataset               ✓
REST API                        ✓
```

---

# Technology Summary

```text
                    TRACE-X
                       │
       ┌───────────────┼────────────────┐
       │               │                │
       ▼               ▼                ▼
   BLOCKCHAIN        NETWORK          MACHINE
    ANALYSIS        ANALYSIS         LEARNING
       │               │                │
       │               │                │
    Wallets          IPs          Isolation Forest
    TXIDs            Ports        Feature Engineering
    Inputs           ASNs         Anomaly Detection
    Outputs          GeoIP        Risk Scoring
       │               │                │
       └───────────────┼────────────────┘
                       ▼
                ENTITY CORRELATION
                       │
                       ▼
                GRAPH ANALYSIS
                       │
                       ▼
             INVESTIGATIVE LEADS
                       │
                       ▼
                 TRACE-X UI
```

---

# License

No open-source license has currently been assigned to this repository.

All rights remain with the repository owner unless otherwise specified.

---

# Author

**Risshit M**

Trace-X was developed as a prototype implementation for the problem statement:

**“AI-Powered Monitoring & Analysis of Bitcoin Transaction Traffic”**

---

# Repository

GitHub:

https://github.com/risshitm-imtb/trace-x

---

## Trace-X

### Detect. Correlate. Investigate.
```
