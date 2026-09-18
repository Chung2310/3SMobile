# Password policy

New passwords (account creation, administrator reset, self-service change and fresh bootstrap account creation) accept letters, numbers, Unicode, symbols and spaces. They require at least eight Unicode code points, at most 72 UTF-8 bytes, and cannot consist entirely of whitespace. No mandatory uppercase/lowercase/digit/symbol composition rules apply. Passwords are never trimmed.

The byte limit matches the current bcrypt storage implementation. Existing password hashes are untouched. Login and current-password verification do not apply the new-password policy, so existing six-digit passwords still work. Empty/null password fields on optional edits leave the current password unchanged. Self-service change still verifies currentPassword.

Existing deployments may retain a six-digit SUPER_ADMIN_PASSWORD environment value when the configured account already exists. Creating a new bootstrap superadmin requires the new policy. No password reset or database migration is performed automatically.

Deploy updated backend and web/mobile clients together. Policy implementations: backend/services/passwordPolicy.ts, frontend/src/services/passwordValidation.ts and mobile src/services/passwordValidation.ts. Tests cover supported character types, Unicode byte limits, unchanged passwords, old login, and password changes.