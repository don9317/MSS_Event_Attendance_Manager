# MSS Attendance Manager v2.0

Unified attendance-record architecture. Live check-in, tallies, tracker, reports, archives, and history exports use one record per participant/date/session.

# MSS Attendance Manager v1.4

Standalone GitHub Pages attendance and arrival manager.

## New in v1.4
- Imports grade, age, and date of birth when available.
- Optional requirement that each participant have a grade or age.
- Optional court/area assignment made by staff at check-in.
- Court/area assignment is stored separately by day and session.
- Live filtering and badges by court/area.
- Event archive stored in the current browser.
- Event JSON backup and restore for moving or safeguarding an event.
- Duplicate-event setup for starting a similar event.
- Clear Local Device Mode notice.
- Communication sender/reply-to fields.
- Post-event survey email template and survey-link setting.

## Important
Data is saved in browser local storage on the device and browser being used. Export an Event Backup at the end of each day or event.


## v2.0.1 Walk-Up Camper Entry
- Check-in staff can add an unregistered camper directly from Today Check-In.
- Captures camper, guardian, contact, grade/age, team, source, payment-handled note, and court/area when required.
- Adds the camper to the participant roster and creates the selected session's unified attendance record immediately.
- Detects likely duplicates and checks in the existing participant instead of creating a duplicate.
