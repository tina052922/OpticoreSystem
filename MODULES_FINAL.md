# OptiCore — Final List of Modules (UI-matched)

This list is generated from the actual sidebar/navigation configuration (`web/lib/admin-nav.ts`) and the app routes under `web/app/`.

## Public / Shared

- **Login**: `/login`
- **Register (landing)**: `/register`
- **Register (auth)**: `/auth/register`
- **Register (instructor)**: `/register/instructor`
- **Auth callback**: `/auth/callback`
- **Change password (account)**: `/account/change-password`
- **Campus navigation**: `/campus-navigation`
- **Campus (public landing)**: `/campus`
- **Navigation helper**: `/navigation`

## Chairman Admin (Program Chairman)

- **Campus Intelligence (Dashboard)**: `/chairman/dashboard`
- **INS Form (Schedule View)**:
  - Faculty: `/chairman/ins/faculty`
  - Section: `/chairman/ins/section`
  - Room: `/chairman/ins/room`
- **Evaluator (Scheduling / Plotting)**: `/chairman/evaluator`
- **Faculty Profile**: `/chairman/faculty-profile`
- **Subject Codes**: `/chairman/subject-codes`
- **Profile**: `/chairman/profile`
- **Campus navigation**: `/campus-navigation`

## College Admin

- **Campus Intelligence (Dashboard)**: `/admin/college`
- **INS Form (Schedule View)**:
  - Landing: `/admin/college/ins`
  - Faculty: `/admin/college/ins/faculty`
  - Section: `/admin/college/ins/section`
  - Room: `/admin/college/ins/room`
- **Central Hub Evaluator**: `/admin/college/evaluator`
- **Schedule Change Requests (Approve/Reject)**: `/admin/college/schedule-change-requests`
- **Access Requests (Approve/Reject)**: `/admin/college/access-requests`
- **Audit Log**: `/admin/college/audit-log`
- **Schedule Review**: `/admin/college/schedule-review`
- **Faculty Profile**: `/admin/college/faculty-profile`
- **Subject Codes**: `/admin/college/subject-codes`
- **Profile**: `/admin/college/profile`
- **Campus navigation**: `/campus-navigation`

## CAS Admin

- **Campus Intelligence (Dashboard)**: `/admin/cas`
- **INS Form (Schedule View)**:
  - Landing: `/admin/cas/ins`
  - Faculty: `/admin/cas/ins/faculty`
  - Section: `/admin/cas/ins/section`
  - Room: `/admin/cas/ins/room`
- **Central Hub Evaluator**: `/admin/cas/evaluator`
- **GEC Distribution**: `/admin/cas/distribution`
- **Inbox**: `/admin/cas/inbox`
- **Audit Log**: `/admin/cas/audit-log`
- **Faculty Profile**: `/admin/cas/faculty-profile`
- **Subject Codes**: `/admin/cas/subject-codes`
- **Profile**: `/admin/cas/profile`
- **Campus navigation**: `/campus-navigation`

## GEC Chairman

- **Campus Intelligence (Dashboard)**: `/admin/gec`
- **INS Forms (Schedule View)**:
  - Landing: `/admin/gec/ins`
  - Faculty: `/admin/gec/ins/faculty`
  - Section: `/admin/gec/ins/section`
  - Room: `/admin/gec/ins/room`
- **Central Hub Evaluator (GEC)**: `/admin/gec/evaluator`
- **Request Access (vacant-slot scope)**: `/admin/gec/request-access`
- **Vacant Slots (workflow/status)**: `/admin/gec/vacant-slots`
- **Faculty Profile**: `/admin/gec/faculty-profile`
- **Subject Codes**: `/admin/gec/subject-codes`
- **Profile**: `/admin/gec/profile`
- **Campus navigation**: `/campus-navigation`

## DOI / VPAA Admin

- **Campus Intelligence (Dashboard)**: `/doi/dashboard`
- **INS Form (Schedule View)**:
  - Landing: `/doi/ins`
  - Faculty: `/doi/ins/faculty`
  - Section: `/doi/ins/section`
  - Room: `/doi/ins/room`
- **Central Hub Evaluator**: `/doi/evaluator`
- **Policy Reviews**: `/doi/reviews`
- **Schedule Hub**: `/doi/schedule-hub`
- **Inbox**: `/doi/inbox`
- **Audit Log**: `/doi/audit-log`
- **Faculty Profile**: `/doi/faculty-profile`
- **Subject Codes**: `/doi/subject-codes`
- **Profile**: `/doi/profile`
- **Campus navigation**: `/campus-navigation`

## Instructor (Faculty Portal)

- **Campus Intelligence (Home)**: `/faculty`
- **INS Forms (Schedule View)**:
  - Landing: `/faculty/ins`
  - Faculty: `/faculty/ins/faculty`
  - Section: `/faculty/ins/section`
  - Room: `/faculty/ins/room`
- **My Schedule (click to request change)**: `/faculty/schedule`
- **Announcements**: `/faculty/announcements`
- **Change password**: `/faculty/change-password`
- **Profile**: `/faculty/profile`
- **Campus navigation**: `/campus-navigation`

## Student (Portal)

- **Student portal home**: `/student`
- **Student schedule**: `/student/schedule`
- **Student announcements**: `/student/announcements`

