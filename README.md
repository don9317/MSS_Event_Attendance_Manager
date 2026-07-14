# MSS Attendance Manager v1.3.4

Verified import initialization fix.

This release uses one JavaScript bundle (`js/app.js`) so initialization order is deterministic and older mixed module files cannot cause `Cannot access appSettings before initialization` errors.

Upload the complete contents to the repository while preserving the `css`, `js`, and `samples` folders.
