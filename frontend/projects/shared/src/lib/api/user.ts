/** Staff role; mirrors the API's `Role` enum. */
export type Role = 'admin' | 'waitress' | 'kitchen';

/** `UserResource`: body of `GET /api/me` and `POST /api/login`. */
export interface User {
  id: number;
  name: string;
  role: Role;
}

/** Body of `POST /api/login`. The PIN is a string of exactly 4 digits. */
export interface LoginRequest {
  name: string;
  pin: string;
}
