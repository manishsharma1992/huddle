-- Tables now record the team that opened them, so the lobby can group live tables by team.
-- Nullable: tables opened before this change have no team.
alter table poker_session add column team varchar(120);
