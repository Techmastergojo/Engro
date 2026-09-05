import openpyxl
import json
import os
import hashlib
from datetime import datetime

base_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.dirname(base_dir)
data_dir = os.path.join(base_dir, "data")
db_file = os.path.join(data_dir, "engro_portal_database.json")

os.makedirs(data_dir, exist_ok=True)

def safe_float(v, default=0.0):
    try:
        if v is None: return default
        return float(v)
    except:
        return default

print("--- Python Seeder for Engro Portal SQL Database ---")

db = {
    "version": 1,
    "sitesMaster": {},
    "narDaily": {},
    "narMbuSummary": {},
    "narOutageTickets": [],
    "fuelLogs": [],
    "apiKeys": {
        "default-mobile-key": {
            "id": "default-mobile-key",
            "keyPrefix": "engro_live_c4...",
            "hashedKey": hashlib.sha256("engro_live_c4_telecom_secret_2026".encode("utf-8")).hexdigest(),
            "name": "Engro Connect Android Mobile App (Default)",
            "createdAt": datetime.now().isoformat(),
            "isActive": True
        }
    },
    "auditLogs": []
}

# 1. Seed Site Master from CSV
csv_file = os.path.join(root_dir, "Engro Enfrashare.csv")
if os.path.exists(csv_file):
    print("Reading Site Master CSV...")
    import csv
    with open(csv_file, 'r', encoding='utf-8', errors='ignore') as f:
        reader = csv.reader(f)
        headers = next(reader, None)
        count = 0
        for row in reader:
            if not row or len(row) < 1: continue
            code = row[0].strip().upper()
            if code and code not in ('SITE ID', 'TOTAL'):
                db["sitesMaster"][code] = {
                    "code": code,
                    "name": row[1].strip() if len(row) > 1 else f"Site {code}",
                    "mbu": row[2].strip() if len(row) > 2 else "Cluster 4",
                    "tier": "PLATINUM" if (len(row) > 3 and "PLATINUM" in row[3].upper()) else "STANDARD",
                    "tenancy": row[4].strip() if len(row) > 4 else "Single",
                    "status": "ACTIVE",
                    "lastUpdated": datetime.now().isoformat()
                }
                count += 1
    print(f"Seeded {count} sites to sitesMaster.")

# 2. Seed NAR Performance from Excel
perf_file = os.path.join(root_dir, "C4 Overall Performance Aug-2026 (3).xlsx")
if os.path.exists(perf_file):
    print("Loading Performance workbook via openpyxl...")
    wb = openpyxl.load_workbook(perf_file, read_only=True, data_only=True)

    # MBUWiseContribution
    if 'MBUWiseContribution' in wb.sheetnames:
        ws_mbu = wb['MBUWiseContribution']
        for i, r in enumerate(ws_mbu.iter_rows(values_only=True)):
            if 1 <= i <= 8 and r[0] and str(r[0]).startswith('C4-'):
                mbu_name = str(r[0]).strip()
                tdt = safe_float(r[1], 0.0)
                tnar = safe_float(r[2], 0.0)
                if tnar <= 1.0: tnar = round(tnar * 100, 2)
                db["narMbuSummary"][f"{mbu_name}_2026-08"] = {
                    "mbu": mbu_name,
                    "month": "2026-08",
                    "tdtHours": round(tdt / 60.0, 1),
                    "tnarPercentage": tnar,
                    "totalSites": 0
                }
        print("Seeded MBUWiseContribution.")

    # Site NAR-Day
    if 'Site NAR-Day' in wb.sheetnames:
        ws_day = wb['Site NAR-Day']
        header_row = None
        date_cols = []
        for i, r in enumerate(ws_day.iter_rows(values_only=True)):
            if i == 0:
                header_row = r
                for c in range(5, len(r)):
                    v = r[c]
                    if v:
                        d_str = v.strftime('%Y-%m-%d') if isinstance(v, datetime) else str(v).strip()
                        date_cols.append((c, d_str))
            else:
                if not r or not r[0]: continue
                code = str(r[0]).strip().upper()
                if not code or code in ('TOTAL', 'SITE ID'): continue
                mbu = str(r[2]).strip() if len(r) > 2 and r[2] else 'Cluster 4'

                for c_idx, d_str in date_cols:
                    if c_idx < len(r):
                        val = r[c_idx]
                        if val is not None:
                            try:
                                pct = float(val)
                                if pct <= 1.0: pct = round(pct * 100, 2)
                                db["narDaily"][f"{code}_{d_str}"] = {
                                    "siteCode": code,
                                    "date": d_str,
                                    "mbu": mbu,
                                    "downtimeMinutes": 0,
                                    "narPercentage": pct
                                }
                            except:
                                pass
        print(f"Seeded {len(db['narDaily'])} daily NAR records.")

    # Consolidated RSL (Outage Tickets)
    if 'Consolidated RSL Aug-26' in wb.sheetnames:
        ws_rsl = wb['Consolidated RSL Aug-26']
        for i, r in enumerate(ws_rsl.iter_rows(values_only=True)):
            if i > 0 and r and r[0]:
                code = str(r[0]).strip().upper()
                if not code or code == 'SITE ID': continue
                domain = str(r[10]).strip() if len(r) > 10 and r[10] else 'Operational'
                reason = str(r[11]).strip() if len(r) > 11 and r[11] else 'Outage'
                dur = safe_float(r[12] if len(r) > 12 else 0.0, 0.0)
                db["narOutageTickets"].append({
                    "siteCode": code,
                    "date": "2026-08-30",
                    "domain": domain,
                    "reason": reason,
                    "durationMinutes": dur
                })
        print(f"Seeded {len(db['narOutageTickets'])} outage tickets.")

# 3. Seed Fuel Logs
fuel_file = os.path.join(root_dir, "C-4 Daily Deodar Fuel Activity Report 30th August-2026.xlsx")
if os.path.exists(fuel_file):
    print("Loading Fuel workbook...")
    wb_f = openpyxl.load_workbook(fuel_file, read_only=True, data_only=True)
    ws_f = wb_f.active
    for i, r in enumerate(ws_f.iter_rows(values_only=True)):
        if i > 0 and r and r[0]:
            code = str(r[0]).strip().upper()
            if not code or code in ('TOTAL', 'SITE ID'): continue
            added = safe_float(r[5] if len(r) > 5 else 0.0, 0.0)
            runtime = safe_float(r[6] if len(r) > 6 else 0.0, 0.0)
            cons = safe_float(r[7] if len(r) > 7 else 0.0, 0.0)
            bal = safe_float(r[8] if len(r) > 8 else 0.0, 0.0)

            db["fuelLogs"].append({
                "siteCode": code,
                "date": "2026-08-30",
                "mbu": str(r[2]).strip() if len(r) > 2 and r[2] else 'Cluster 4',
                "fuelAddedLiters": added,
                "dgRuntimeHours": runtime,
                "fuelConsumptionLiters": cons,
                "currentBalanceLiters": bal
            })
    print(f"Seeded {len(db['fuelLogs'])} fuel logs.")

# Add baseline audit log
db["auditLogs"].append({
    "id": "audit_baseline_seed",
    "reportType": "NAR_PERFORMANCE",
    "fileName": "C4 Overall Performance Aug-2026 (3).xlsx",
    "fileSizeBytes": 22067399,
    "detectedDateRange": "2026-08-01 to 2026-08-31",
    "rowsProcessed": len(db["narDaily"]),
    "rowsAdded": len(db["narDaily"]),
    "rowsUpdated": 0,
    "status": "SUCCESS",
    "details": "Initial system baseline seeding from company operational workbooks.",
    "timestamp": datetime.now().isoformat()
})

with open(db_file, "w", encoding="utf-8") as f:
    json.dump(db, f, indent=2)

print("Database successfully generated at:", db_file)
