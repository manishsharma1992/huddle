-- Estimation bounded context: one aggregate (poker_session) spread over four tables.
-- Only the aggregate root is referenced from outside; children cascade with it.

create table poker_session (
    id              uuid primary key,
    code            varchar(6)   not null unique,
    name            varchar(120) not null,
    deck_type       varchar(32)  not null,
    facilitator_id  uuid,
    timer_ends_at   timestamptz,
    created_at      timestamptz  not null,
    updated_at      timestamptz  not null,
    version         bigint       not null
);

create index poker_session_updated_at_idx on poker_session (updated_at desc);

create table participant (
    id          uuid primary key,
    session_id  uuid        not null references poker_session (id) on delete cascade,
    seat_order  int         not null,
    name        varchar(60) not null,
    avatar      varchar(32) not null,
    role        varchar(16) not null,
    access_key  varchar(64) not null,
    joined_at   timestamptz not null
);

create index participant_session_idx on participant (session_id);

create table story (
    id                  uuid primary key,
    session_id          uuid         not null references poker_session (id) on delete cascade,
    position            int          not null,
    title               varchar(400) not null,
    status              varchar(16)  not null,
    round               int          not null,
    round_started_at    timestamptz,
    final_estimate      varchar(8),
    agreed_unanimously  boolean      not null default false
);

create index story_session_idx on story (session_id);

create table vote (
    story_id        uuid        not null references story (id) on delete cascade,
    participant_id  uuid        not null,
    card            varchar(8)  not null,
    cast_at         timestamptz not null,
    vote_order      int         not null,
    primary key (story_id, participant_id)
);
