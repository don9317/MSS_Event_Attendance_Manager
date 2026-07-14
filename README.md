# MSS Attendance Manager v1.3.5

Verified import initialization fix.

This release uses one JavaScript bundle (`js/app.js`) so initialization order is deterministic and older mixed module files cannot cause `Cannot access appSettings before initialization` errors.

Upload the complete contents to the repository while preserving the `css`, `js`, and `samples` folders.


Fix: cross-source duplicate campers are consolidated using player name plus matching email or phone. MSS is retained as the primary source when the same camper appears in both files.
