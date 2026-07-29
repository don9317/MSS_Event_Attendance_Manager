# MSS Attendance & Arrival Manager v5.0

This release consolidates the verified Attendance Manager feature line into one current version.

## Core architecture

- One unified attendance record per participant, event date, and session.
- Live check-in, arrival times, dashboard tallies, Attendance Tracker, reports, exports, event archives, and backups use the same records.
- Browser-data migration checks prior v2.0, possible v4.2, v1.3, and v1.2.4 storage keys.

## Check-in and arrival

- Search by participant, parent, phone, email, team, grade, ID, source, session, or assigned area.
- Day, session, source, area, and status filters.
- Optional QR/member ID scanning and camera scanning.
- Arrival time stored with the unified attendance record.
- Court/area assignment by date and session.

## Walk-up camper entry

- **+ Add Walk-Up Camper** is available directly on Today Check-In.
- Captures camper, parent/contact, grade/age, team/group, source, court/area, and desk-payment status.
- Adds the participant and immediately checks the camper into the selected date/session.
- Uses duplicate detection and the same unified attendance records as imported participants.

## Attendance Tracker

- Participant-level selected-session status, total sessions, last attended date, and recent attendance history.
- Team roster, selected-session attendance, attendance percentage, and cumulative attendance records.

## Important deployment note

Replace the prior GitHub Pages files with the contents of this folder. Confirm that `index.html`, `css/styles.css`, and `js/app.js` all come from v5.0 so the page title and displayed version do not remain on an older cached build.
