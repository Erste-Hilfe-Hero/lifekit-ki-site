# Beta and real-device matrix

Minimum evidence before store submission:

- iOS: at least 3 physical devices across current/high-memory and older/lower-memory classes. Scenarios: Wi-Fi, cellular, Wi-Fi→cellular handoff, suspend/resume, cold relaunch.
- Android: at least 5 physical devices across at least 3 vendors and one low-memory device. Same scenarios plus low-memory process recreation.
- Each device run includes login, realm entry, combat, loot, inventory, trade, dungeon transition, reconnect, account deletion and a 30-minute session.
- Record OS version, model, build hash, network, result, crash/ANR, reconnect count and server correlation ID.

Only real device evidence belongs in `release/external-evidence.json`; simulator/emulator runs never satisfy these gates.
