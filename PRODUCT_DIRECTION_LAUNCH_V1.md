# Cockmanager: Launch V1 Direction

## Product Position

This product is not a generic community app.
It is a painkiller for badminton club operators, especially:

- the treasurer
- the club manager
- 2 to 3 operating staff who run attendance, payments, and member approvals

The product should replace repeated admin work currently done with:

- KakaoTalk group chats
- Excel sheets
- notes and manual attendance lists
- bank account history checks

## Core Launch Goal

Launch V1 should help a club run a normal weekly session with much less admin overhead.

The product must make these workflows easier:

1. Member applies directly
2. Operator approves the member
3. Operator creates a session
4. Members respond to the session themselves
5. Operator only checks exceptions and attendance
6. Operator tracks monthly fees and one-off fees

## Primary User

Primary user is not every club member.
Primary user is the operator.

This means product decisions should optimize for:

- speed of admin work
- low mistake rate
- clear status visibility
- low training cost

## Launch V1 Scope

### Included

- club signup and admin login
- member management
- member request approval
- configurable extra member info field
- session creation
- session registration and waitlist management
- attendance management
- monthly fee tracking
- one-off fee tracking

### Not Required For Launch

- advanced team balancing logic
- ranking or point systems
- full chat or social feed
- deep analytics
- complex billing plans
- automation-heavy member self-service beyond core participation flows

## Feedback Reflected

### 1. Flexible Member Extra Field

The old fixed "vehicle number" concept is too narrow.
Some clubs want:

- vehicle number
- affiliated club
- generation
- region

So V1 uses a flexible club-level label for one extra member field.

Principle:

- keep the structure simple
- allow each club to rename the field
- use the same label consistently in admin pages and member application pages

### 2. One-Off Fee Management

Monthly fees alone are not enough.
Clubs often collect irregular fees such as:

- tournament entry fee
- uniform fee
- extra shuttlecock fee
- event participation fee

So V1 includes a separate one-off fee feature with:

- fee item creation
- amount and due date
- member-level payment tracking

## Product UX Principle

The operator should not manually register every participation by default.

Correct default flow:

- operator creates a session
- members respond themselves
- system tracks registered, waitlisted, absent, present
- operator only adjusts exceptions

Manual registration remains useful only as a backup or correction tool.

## Why This Direction Makes Sense

This is a realistic paid SaaS direction because it directly reduces repeated operator work.

The product is commercially stronger when it becomes:

- an operations tool
- a session-running tool
- a payment visibility tool

and not just:

- a member list tool

## Success Criteria For Early Launch

Launch V1 is successful if a real badminton club can:

- approve members without Excel
- run a weekly session without manually rewriting attendee lists
- check monthly and one-off payments in one dashboard
- manage a flexible extra member field without custom development
