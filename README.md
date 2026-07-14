# MSS Attendance Manager v1.3.6

Verified import initialization fix.

This release uses one JavaScript bundle (`js/app.js`) so initialization order is deterministic and older mixed module files cannot cause `Cannot access appSettings before initialization` errors.

Upload the complete contents to the repository while preserving the `css`, `js`, and `samples` folders.


Fix: cross-source duplicate campers are consolidated using player name plus matching email or phone. MSS is retained as the primary source when the same camper appears in both files.


## v1.3.6
- Dashboard tallies now respond to the active source, session, status, and search filters.
- Example: All Sources 111, MSS 28, Other Source 83.
