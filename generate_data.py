"""
Regenerates data.js from "Students Details.xlsx".

Run this again any time the roster changes:
    python generate_data.py

Expects columns (in order): SL No, PRN, Name, Program, Group
"""
import json
import re
import openpyxl

SOURCE_XLSX = "Students Details.xlsx"
OUTPUT_JS = "data.js"

INSTITUTION_NAME = "MIT Vishwaprayaag University Solapur"

# Group-wise session plan, transcribed from the orientation schedule image.
# Each entry: time slot, activity, and location (room / venue) if the
# schedule specifies one.
GROUP_SCHEDULE = {
    "G1": [
        {"time": "10:00 AM – 11:00 AM", "activity": "Registration", "location": "Room 202 (2nd Floor)"},
        {"time": "11:15 AM – 12:00 PM", "activity": "LinkedIn Workshop", "location": "Auditorium (6th Floor)"},
        {"time": "12:15 PM – 1:00 PM", "activity": "Citizenship & Responsibility", "location": ""},
        {"time": "1:00 PM – 2:00 PM", "activity": "Lunch Break + Registration", "location": ""},
        {"time": "2:00 PM – 2:45 PM", "activity": "Cyber Security", "location": "Auditorium (6th Floor)"},
        {"time": "3:00 PM – 3:45 PM", "activity": "Campus Tour", "location": ""},
    ],
    "G2": [
        {"time": "10:00 AM – 11:00 AM", "activity": "Registration", "location": "Room 204 (2nd Floor)"},
        {"time": "11:15 AM – 12:00 PM", "activity": "LinkedIn Workshop", "location": "Auditorium (6th Floor)"},
        {"time": "12:15 PM – 1:00 PM", "activity": "Citizenship & Responsibility", "location": ""},
        {"time": "1:00 PM – 2:00 PM", "activity": "Lunch Break + Registration", "location": ""},
        {"time": "2:00 PM – 2:45 PM", "activity": "Cyber Security", "location": "Auditorium (6th Floor)"},
        {"time": "3:00 PM – 3:45 PM", "activity": "Campus Tour", "location": ""},
    ],
    "G3": [
        {"time": "10:00 AM – 11:00 AM", "activity": "Registration", "location": "Room 219 (2nd Floor)"},
        {"time": "11:15 AM – 12:00 PM", "activity": "LinkedIn Workshop", "location": "Auditorium (6th Floor)"},
        {"time": "12:15 PM – 1:00 PM", "activity": "Citizenship & Responsibility", "location": ""},
        {"time": "1:00 PM – 2:00 PM", "activity": "Lunch Break + Registration", "location": ""},
        {"time": "2:00 PM – 2:45 PM", "activity": "Cyber Security", "location": "Auditorium (6th Floor)"},
        {"time": "3:00 PM – 3:45 PM", "activity": "Campus Tour", "location": ""},
    ],
    "G4": [
        {"time": "10:00 AM – 11:00 AM", "activity": "Registration", "location": "Room 213 (2nd Floor)"},
        {"time": "11:15 AM – 12:00 PM", "activity": "LinkedIn Workshop", "location": "Auditorium (6th Floor)"},
        {"time": "12:15 PM – 1:00 PM", "activity": "Citizenship & Responsibility", "location": ""},
        {"time": "1:00 PM – 2:00 PM", "activity": "Lunch Break + Registration", "location": ""},
        {"time": "2:00 PM – 2:45 PM", "activity": "Cyber Security", "location": "Computing Auditorium"},
        {"time": "3:00 PM – 3:45 PM", "activity": "Campus Tour", "location": ""},
    ],
    "G5": [
        {"time": "10:00 AM – 11:00 AM", "activity": "Registration", "location": "Room 317 (3rd Floor)"},
        {"time": "11:15 AM – 12:00 PM", "activity": "Citizenship & Responsibility", "location": ""},
        {"time": "12:15 PM – 1:00 PM", "activity": "LinkedIn Workshop", "location": "Auditorium (6th Floor)"},
        {"time": "1:00 PM – 2:00 PM", "activity": "Lunch Break + Registration", "location": ""},
        {"time": "2:00 PM – 2:45 PM", "activity": "Campus Tour", "location": ""},
        {"time": "3:00 PM – 3:45 PM", "activity": "Cyber Security", "location": "Auditorium (6th Floor)"},
    ],
    "G6": [
        {"time": "10:00 AM – 11:00 AM", "activity": "Registration", "location": "Room 304 (3rd Floor)"},
        {"time": "11:15 AM – 12:00 PM", "activity": "Citizenship & Responsibility", "location": ""},
        {"time": "12:15 PM – 1:00 PM", "activity": "LinkedIn Workshop", "location": "Auditorium (6th Floor)"},
        {"time": "1:00 PM – 2:00 PM", "activity": "Lunch Break + Registration", "location": ""},
        {"time": "2:00 PM – 2:45 PM", "activity": "Campus Tour", "location": ""},
        {"time": "3:00 PM – 3:45 PM", "activity": "Cyber Security", "location": "Computing Auditorium"},
    ],
    "G7": [
        {"time": "10:00 AM – 11:00 AM", "activity": "Registration", "location": "Room 402 (4th Floor)"},
        {"time": "11:15 AM – 12:00 PM", "activity": "Citizenship & Responsibility", "location": ""},
        {"time": "12:15 PM – 1:00 PM", "activity": "LinkedIn Workshop", "location": "Auditorium (6th Floor)"},
        {"time": "1:00 PM – 2:00 PM", "activity": "Lunch Break + Registration", "location": ""},
        {"time": "2:00 PM – 2:45 PM", "activity": "Campus Tour", "location": ""},
        {"time": "3:00 PM – 3:45 PM", "activity": "Cyber Security", "location": "Computing Auditorium"},
    ],
    "G8": [
        {"time": "10:00 AM – 11:00 AM", "activity": "Registration", "location": "Room 502 (5th Floor)"},
        {"time": "11:15 AM – 12:00 PM", "activity": "Citizenship & Responsibility", "location": ""},
        {"time": "12:15 PM – 1:00 PM", "activity": "LinkedIn Workshop", "location": "Auditorium (6th Floor)"},
        {"time": "1:00 PM – 2:00 PM", "activity": "Lunch Break + Registration", "location": ""},
        {"time": "2:00 PM – 2:45 PM", "activity": "Campus Tour", "location": ""},
        {"time": "3:00 PM – 3:45 PM", "activity": "Cyber Security", "location": "Auditorium (6th Floor)"},
    ],
}


def clean(value):
    if value is None:
        return ""
    text = str(value).strip()
    text = re.sub(r"\s+", " ", text)
    return text


def main():
    wb = openpyxl.load_workbook(SOURCE_XLSX, data_only=True)
    ws = wb["Sheet1"]

    students = []
    seen_prns = {}
    for row in ws.iter_rows(min_row=2, values_only=True):
        if row[1] is None:
            continue
        prn = clean(row[1])
        name = clean(row[2])
        program = clean(row[3])
        group = clean(row[4])
        if not prn or not name:
            continue
        if prn in seen_prns:
            print(f"WARNING: duplicate PRN {prn} ({name!r} and {seen_prns[prn]!r})")
        seen_prns[prn] = name
        students.append({"prn": prn, "name": name, "program": program, "group": group})

    missing_schedule = sorted({s["group"] for s in students} - set(GROUP_SCHEDULE))
    if missing_schedule:
        print(f"WARNING: no schedule defined for group(s): {missing_schedule}")

    with open(OUTPUT_JS, "w", encoding="utf-8") as f:
        f.write("// Auto-generated by generate_data.py — do not edit by hand.\n")
        f.write("// To update, edit Students Details.xlsx and/or the GROUP_SCHEDULE\n")
        f.write("// in generate_data.py, then re-run: python generate_data.py\n\n")
        f.write(f"const INSTITUTION_NAME = {json.dumps(INSTITUTION_NAME, ensure_ascii=False)};\n\n")
        f.write("const STUDENTS = ")
        f.write(json.dumps(students, ensure_ascii=False, indent=2))
        f.write(";\n\n")
        f.write("const GROUP_SCHEDULE = ")
        f.write(json.dumps(GROUP_SCHEDULE, ensure_ascii=False, indent=2))
        f.write(";\n")

    print(f"Wrote {len(students)} students to {OUTPUT_JS}")


if __name__ == "__main__":
    main()
