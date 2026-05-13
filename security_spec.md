# Firebase Security Specification

## Data Invariants
1. A user's profile can only be created with their own `uid`.
2. The `username` field is mandatory for users.
3. `useCount` in `popular_functions` must be a positive number.
4. Function equations must be strings.

## The "Dirty Dozen" Payloads (Examples)
1. Creating a user profile for a different `uid`. (DENY)
2. Reading another user's email. (DENY)
3. Deleting popular functions stats (only increments allowed). (DENY)
4. Updating `useCount` by a large arbitrary number (should ideally be increments, but Firestore rules are limited; we'll enforce type and presence). (DENY if not valid type)
5. Creating a user without an email. (DENY)

## Access Patterns
- **Users**:
  - `read`: `request.auth.uid == userId`
  - `write`: `request.auth.uid == userId` (and exists check on email)
- **Popular Functions**:
  - `list/get`: `request.auth != null` (Requested: only appears if registered)
  - `create/update`: `true` (Track usage for everyone, but display restricted)
