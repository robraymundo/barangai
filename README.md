# BarangAI

## Team Information

**Team Name:**
CORTIS

**Project Name:**
BarangAI

---

## Project Brief

BarangAI is an AI-powered Digital Twin & Decision Intelligence Platform that lets local governments simulate the impact of projects and policies *before* spending a single peso.

* **The problem:** Local governments make hundreds of high-cost decisions each year — infrastructure, disaster preparedness, environmental planning, and budget allocation — largely from historical reports and intuition, with no way to preview outcomes or trade-offs before funds are committed.
* **Our solution:** BarangAI builds a *digital twin* of a barangay from geospatial, demographic, environmental, and infrastructure data. Officials ask plain-language questions ("What if we build an evacuation center here?") and receive predicted outcomes — flood reduction, cooling, carbon absorption, cost, and beneficiaries — with a clear explanation of the reasoning.
* **Intended users:** Barangay and city officials, planning offices, and disaster-risk teams, with residents as the ultimate beneficiaries. The MVP is demonstrated on **Barangay Alibagu, Ilagan City, Isabela**.
* **The impact:** Smarter, evidence-based spending that maximizes community, economic, and environmental benefit — prioritizing *who* is most vulnerable, not just *where* hazards occur, and strengthening overall community resilience.

---

## Team Members

| Name     | Role |
| -------- | ---- |
| Kristel Mae Tungcul | Project Lead |
| Arnel Lim Jr. | Project Designer |
| Robin Raymundo | Project Developer |
| Jason Bagunu | Project Member |

---

## Google Technologies Used

The following Google technologies are integrated into BarangAI:

* **Gemini API** — Parses each natural-language question into structured parameters and writes the plain-language explanation of the results. Every impact number comes from a deterministic scoring engine; Gemini narrates but never invents figures, and falls back to offline templates when no key is configured.
* **Google Maps Platform** — Powers the interactive community map that visualizes the digital twin, zones, and vulnerability overlays (with a keyless map fallback for zero-setup demos).
* **Cloud Firestore (Firebase)**  — Persistence for scenario history and the resilience-score timeline.

---

## SparkFest 2026

This project was developed as part of **SparkFest 2026**, the flagship hackathon organized by the **Google Developer Groups on Campus – Polytechnic University of the Philippines (GDG on Campus PUP)**.

---

## Repository Information

* **Live Demo:** https://barangai.vercel.app/
