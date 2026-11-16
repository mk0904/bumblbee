# ADR-014: Permanent four-character installation code

Status: Accepted by explicit user direction; supersedes temporary code portions of ADR-003 and ADR-013.

The user requires the same four-character code on every visit for a Webots installation. shared/config/drone.json configures BMBL for this installation. Pairing request returns this stable code with null expiry; claim accepts it repeatedly, case-insensitively. Each successful claim still creates a separate long random HttpOnly session and CSRF token. Bridge authentication remains a separate host-side credential. API limits five claims per IP per minute; service limits five incorrect guesses per minute. Codes are short shared access credentials, not strong secrets. This tradeoff is accepted for the current local capstone setup. Do not describe the code as one-time, expiring or sufficient for secure public deployment.

Other installations configure a different code in their own deployment. One backend still supports one drone; this does not implement multi-drone routing. Browser sessions still expire after eight hours and are lost on backend restart; the same permanent code reconnects afterward. Rotation requires changing the configured code and restarting the service.
