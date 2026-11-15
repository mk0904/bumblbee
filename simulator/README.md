# Phase 1: local flight feasibility

Status: not verified. Webots was not found in standard application locations during repository setup.

1. Install Webots from https://github.com/cyberbotics/webots/releases and record exact release/platform.
2. Open the bundled DJI Mavic example if available in that release; inspect its controller and license before adapting it. Example availability/control capability must be verified locally.
3. Configure a compatible Python interpreter in Webots. System Python availability does not prove compatibility.
4. Run the original example before editing it. Record observed behaviour and any errors.
5. Copy/adapt only required credited world/model/controller assets into this directory, following their license terms. Do not copy the whole Webots install.
6. Verify takeoff, hover, target navigation, landing, coordinate mapping and controller timing. Do not teleport the drone as a replacement for control.
7. Repeat three short flights and fill in ../docs/evidence/phase-1.md.

Native Webots remains on the simulator computer. Network bridge and remote commands begin in Phase 2 after local navigation passes. No credentials or external network are needed for Phase 1.
