package com.planningpoker.estimation.domain.model;

import com.planningpoker.sharedkernel.domain.Guard;

import java.time.Instant;

/** Someone sitting at the table. An entity inside the {@link PokerSession} aggregate. */
public class Participant {

    private final ParticipantId id;
    private final AccessKey accessKey;
    private final Instant joinedAt;
    private DisplayName name;
    private Avatar avatar;
    private ParticipantRole role;

    Participant(ParticipantId id, AccessKey accessKey, DisplayName name, Avatar avatar, ParticipantRole role, Instant joinedAt) {
        this.id = Guard.notNull(id, "Participant id");
        this.accessKey = Guard.notNull(accessKey, "Access key");
        this.name = Guard.notNull(name, "Name");
        this.avatar = Guard.notNull(avatar, "Avatar");
        this.role = Guard.notNull(role, "Role");
        this.joinedAt = Guard.notNull(joinedAt, "Join time");
    }

    /** Reconstitutes a participant from storage. */
    public static Participant restore(ParticipantId id, AccessKey accessKey, DisplayName name, Avatar avatar,
                                      ParticipantRole role, Instant joinedAt) {
        return new Participant(id, accessKey, name, avatar, role, joinedAt);
    }

    void changeProfile(DisplayName newName, Avatar newAvatar, ParticipantRole newRole) {
        this.name = Guard.notNull(newName, "Name");
        this.avatar = Guard.notNull(newAvatar, "Avatar");
        this.role = Guard.notNull(newRole, "Role");
    }

    boolean holds(String key) {
        return accessKey.matches(key);
    }

    public boolean canVote() {
        return role == ParticipantRole.VOTER;
    }

    public ParticipantId id() {
        return id;
    }

    public AccessKey accessKey() {
        return accessKey;
    }

    public DisplayName name() {
        return name;
    }

    public Avatar avatar() {
        return avatar;
    }

    public ParticipantRole role() {
        return role;
    }

    public Instant joinedAt() {
        return joinedAt;
    }
}
