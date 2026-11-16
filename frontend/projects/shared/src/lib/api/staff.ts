import type { Role } from './user';

/** `StaffResource`: a staff account as the admin screens see it. Never the PIN. */
export interface StaffUser {
  id: number;
  name: string;
  role: Role;
  active: boolean;
}

/** `StaffListResource`: body of `GET /api/users`, ordered by name. */
export interface StaffList {
  users: StaffUser[];
}

/** Body of `PUT /api/users/{id}`. The PIN changes only through `PUT /api/users/{id}/pin`. */
export interface StaffInput {
  name: string;
  role: Role;
  active: boolean;
}

/** Body of `POST /api/users`. `pin` is exactly 4 digits. */
export interface NewStaffInput extends StaffInput {
  pin: string;
}
