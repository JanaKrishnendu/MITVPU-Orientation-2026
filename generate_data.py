"""
Regenerates data.js from "Students Details.xlsx".

Run this again any time the roster changes:
    python generate_data.py

Expects columns (in order): SL No, PRN, Name, Program, Group
"""
import copy
import json
import re
import openpyxl

SOURCE_XLSX = "Students Details.xlsx"
OUTPUT_JS = "data.js"

INSTITUTION_NAME = "MIT Vishwaprayaag University Solapur"

# Registration room per program (School/Program → Student room, Parent room),
# transcribed from the "Room details" sheet. The first digit of the room
# number is its floor (per the accompanying room-location note); Auditorium
# is 6th floor.
_ORDINAL_SUFFIX = {"1": "st", "2": "nd", "3": "rd"}


def _room_label(room_no):
    floor_digit = room_no[0]
    suffix = _ORDINAL_SUFFIX.get(floor_digit, "th")
    return f"Room {room_no} ({floor_digit}{suffix} Floor)"


ROOM_BY_PROGRAM = {
    "MCA": {"student": _room_label("219"), "parent": _room_label("213")},
    "B.Tech. AIML": {"student": _room_label("317"), "parent": _room_label("303")},
    "B.Tech. ECE": {"student": _room_label("202"), "parent": _room_label("204")},
    "B.Tech. ECE-Lateral Entry": {"student": _room_label("202"), "parent": _room_label("204")},
    "B.Tech. IT-Lateral Entry": {"student": _room_label("202"), "parent": _room_label("204")},
    "B.Tech. CSE": {"student": _room_label("304"), "parent": _room_label("305")},
    "BCA": {"student": _room_label("306"), "parent": _room_label("307")},
    "B.Pharm": {"student": _room_label("517"), "parent": _room_label("518")},
    "B. Pharm. LE": {"student": _room_label("517"), "parent": _room_label("518")},
    "B.Des.": {"student": _room_label("410"), "parent": _room_label("410")},
    "B.Sc. Textile": {"student": _room_label("410"), "parent": _room_label("410")},
    "B.SC Animation & VFX": {"student": _room_label("410"), "parent": _room_label("410")},
    "MBA": {"student": _room_label("501"), "parent": _room_label("502")},
    "MBA Pharma": {"student": _room_label("501"), "parent": _room_label("502")},
    "BBA": {"student": _room_label("510"), "parent": _room_label("511")},
    "B.Com.": {"student": _room_label("515"), "parent": _room_label("515")},
}

AUDITORIUM = "Auditorium (6th Floor)"
SEMINAR_HALL = "Seminar Hall (1st Floor)"
CAMPUS_TOUR_VENUE = "University Main Building (Ground Floor)"
LAWN_VENUE = "In front of University Main Building"

# Parents-only sessions, run in parallel with the student track while
# students are elsewhere (Cyber Security/Campus Tour, Parenting Gen-Z has
# no student-side counterpart). Same for every program/group.
PARENT_SESSIONS = [
    {"time": "11:30 AM – 12:30 PM", "activity": "Cyber Security", "location": SEMINAR_HALL},
    {"time": "3:00 PM – 4:00 PM", "activity": "Parenting Gen-Z", "location": SEMINAR_HALL},
]

# Student Induction Program 2026-27 master schedule. Groups G1-G4 and G5-G8
# run the LinkedIn Workshop / Cyber Security / Citizenship & Responsibility /
# Campus Tour block in opposite order so both halves can share the
# Auditorium. Registration's location is filled in per-student from
# ROOM_BY_PROGRAM (app.js), since group and program don't line up 1:1.
_EARLY_TRACK = [
    {"time": "10:00 AM – 11:00 AM", "activity": "Registration Session - I", "location": "", "useProgramRoom": True},
    {"time": "11:15 AM – 12:00 PM", "activity": "LinkedIn Workshop", "location": AUDITORIUM},
    {"time": "12:15 PM – 1:00 PM", "activity": "Cyber Security", "location": AUDITORIUM},
    {"time": "1:00 PM – 2:00 PM", "activity": "Lunch / Registration Session - II", "location": ""},
    {"time": "2:00 PM – 2:45 PM", "activity": "Citizenship & Responsibility", "location": ""},
    {"time": "3:00 PM – 3:45 PM", "activity": "Campus Tour", "location": CAMPUS_TOUR_VENUE},
    {"time": "4:30 PM – 5:15 PM", "activity": "Formal Function", "location": LAWN_VENUE},
    {"time": "5:30 PM – 6:15 PM", "activity": "Cultural Program", "location": LAWN_VENUE},
]
_LATE_TRACK = [
    {"time": "10:00 AM – 11:00 AM", "activity": "Registration Session - I", "location": "", "useProgramRoom": True},
    {"time": "11:15 AM – 12:00 PM", "activity": "Citizenship & Responsibility", "location": ""},
    {"time": "12:15 PM – 1:00 PM", "activity": "Campus Tour", "location": CAMPUS_TOUR_VENUE},
    {"time": "1:00 PM – 2:00 PM", "activity": "Lunch / Registration Session - II", "location": ""},
    {"time": "2:00 PM – 2:45 PM", "activity": "LinkedIn Workshop", "location": AUDITORIUM},
    {"time": "3:00 PM – 3:45 PM", "activity": "Cyber Security", "location": AUDITORIUM},
    {"time": "4:30 PM – 5:15 PM", "activity": "Formal Function", "location": LAWN_VENUE},
    {"time": "5:30 PM – 6:15 PM", "activity": "Cultural Program", "location": LAWN_VENUE},
]
_TRACK_BY_GROUP = {
    "G1": _EARLY_TRACK,
    "G2": _EARLY_TRACK,
    "G3": _EARLY_TRACK,
    "G4": _EARLY_TRACK,
    "G5": _LATE_TRACK,
    "G6": _LATE_TRACK,
    "G7": _LATE_TRACK,
    "G8": _LATE_TRACK,
}

# Citizenship & Responsibility room, per group.
CITIZENSHIP_ROOM_BY_GROUP = {
    "G1": "508", "G2": "508", "G5": "508", "G6": "508",
    "G3": "509", "G4": "509", "G7": "509", "G8": "509",
}

GROUP_SCHEDULE = {}
for _group, _track in _TRACK_BY_GROUP.items():
    _schedule = copy.deepcopy(_track)
    for _item in _schedule:
        if _item["activity"] == "Citizenship & Responsibility":
            _item["location"] = _room_label(CITIZENSHIP_ROOM_BY_GROUP[_group])
    GROUP_SCHEDULE[_group] = _schedule


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

    missing_rooms = sorted({s["program"] for s in students} - set(ROOM_BY_PROGRAM))
    if missing_rooms:
        print(f"WARNING: no registration room defined for program(s): {missing_rooms}")

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
        f.write(";\n\n")
        f.write("const ROOM_BY_PROGRAM = ")
        f.write(json.dumps(ROOM_BY_PROGRAM, ensure_ascii=False, indent=2))
        f.write(";\n\n")
        f.write("const PARENT_SESSIONS = ")
        f.write(json.dumps(PARENT_SESSIONS, ensure_ascii=False, indent=2))
        f.write(";\n")

    print(f"Wrote {len(students)} students to {OUTPUT_JS}")


if __name__ == "__main__":
    main()
